import { reactive } from 'vue'
import { createPipelineRuntime } from './pipeline.js'
import { registerDefaultPipelines, createStepsRunner } from './setup_pipeline.js'
import { parsePackage } from './mdreader.js'

/**
 * 核心业务运行时工厂
 *
 * 职责：
 * - 管理 pack（变量存储、preset 解析结果）
 * - 整合 env、actors、schemas、messages、ops、pipelines、roles
 * - 解析 md preset 并合并到 pack
 * - 创建 pipeline 运行时
 * - 注册 pipeline（默认 + pack 配置）
 * - 提供 log / tlog / stat / delay 等运行时工具
 * - 每次 runPipeline 生成新的 temp 对象
 *
 * @param {import('vue').Ref} pack - Vue reactive pack 对象（来自 App.vue）
 * @returns {Object} runtime 实例
 */
export const createRuntime = (pack) => {
  // ============================================================
  // 状态（用 reactive 让 Vue 追踪变更）
  // ============================================================
  const logs = reactive([])
  const stats = reactive({})

  let isRunning = false
  let currentOp = ''
  let lastOp = ''

  // ============================================================
  // Pipeline 运行时初始化
  // ============================================================
  const { Pipeline, runPipeline } = createPipelineRuntime()

  // ============================================================
  // 工具函数
  // ============================================================
  const addLog = (msg, type = 'info') => {
    logs.push({ msg, type })
  }

  const addTLog = (msg, type = 'info') => {
    logs.push({ time: new Date().toLocaleTimeString(), msg, type })
  }

  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  const stat = (name, value) => {
    if (!stats[name]) {
      stats[name] = { count: 0, total: 0 }
    }
    stats[name].count++
    stats[name].total += Number(value) || 0
    addLog(`[STAT] ${name}: ${value}`, 'data')
  }

  // ============================================================
  // Preset 解析与合并
  // ============================================================

  /**
   * 解析 md preset 并合并到 pack
   * @param {string} markdown - preset 的 md 内容
   */
  const loadPreset = (markdown) => {
    const { blocks, ...frontmatter } = parsePackage(markdown)

    // 先合入 frontmatter（name, icon, description 等）
    Object.assign(pack.value, frontmatter)

    // 再按 is 路由合并 blocks
    for (const block of blocks) {
      if (!block) continue

      const is = block.is
      if (!is) continue

      const target = (() => {
        switch (is) {
          case 'schemas':   return pack.value.schemas
          case 'messages':  return pack.value.messages
          case 'ops':       return pack.value.ops
          case 'pipelines': return pack.value.pipelines
          case 'roles':     return pack.value.roles
          case 'env':       return pack.value.env
          case 'actors':    return pack.value.actors
          default:          return pack.value
        }
      })()

      if (target != null) {
        Object.assign(target, block)
      }
    }
  }

  // ============================================================
  // Pipeline 执行
  // ============================================================
  const run = async (pipelineName, extraCtx = {}) => {
    if (isRunning) return

    const p = Pipeline(pipelineName)
    if (!p) {
      addLog(`Pipeline "${pipelineName}" 未定义`, 'error')
      return
    }

    isRunning = true
    currentOp = pipelineName

    try {
      await runPipeline(pipelineName, {
        env: pack.value.env,
        actors: pack.value.actors,
        selectedActor: pack.value.actors?.[0] ?? null,
        log: addLog,
        tlog: addTLog,
        delay,
        stat,
        temp: {},
        ...extraCtx,
      })
      lastOp = pipelineName
    } catch (err) {
      addLog(`错误: ${err.message}`, 'error')
    }

    currentOp = ''
    isRunning = false
  }

  // ============================================================
  // Pipeline 注册
  // ============================================================
  const registerPipelines = () => {
    const pkg = pack.value

    if (pkg.pipelines) {
      for (const [name, config] of Object.entries(pkg.pipelines)) {
        Pipeline(name, [createStepsRunner(config.steps || [])]).append(
          65535,
          'summary',
        )
        if (!pkg.ops[name]) {
          pkg.ops[name] = {
            label: name,
            type: 'secondary',
            entry: name,
          }
        }

        const pos = (config.pos ?? '').split(' ')
        const target = Pipeline(pos[0])
        if (!target) continue
        const prio = Number(pos[2])

        if (pos[1] === 'append') {
          target.append(prio, createStepsRunner(config.do || []))
        } else if (pos[1] === 'prepend') {
          target.prepend(prio, createStepsRunner(config.do || []))
        }
      }
    }

    registerDefaultPipelines(Pipeline)
  }

  // ============================================================
  // 暴露给 pack
  // ============================================================
  pack.value.pipelineRuntime = { Pipeline, run }
  pack.value.stats = stats
  pack.value.logs = logs

  return {
    logs,
    stats,
    isRunning: () => isRunning,
    currentOp: () => currentOp,
    lastOp: () => lastOp,
    run,
    registerPipelines,
    loadPreset,
  }
}
