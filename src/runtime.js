import { createPipelineRuntime } from './pipeline.js'
import { registerDefaultPipelines } from './setup_pipeline.js'
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
export const createRuntime = ({ logs, stats, pack }) => {
  let isRunning = false
  let currentOp = ''
  let lastOp = ''

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

    const ctx = {
      env: pack.value.env,
      actors: pack.value.actors,
      selectedActor: pack.value.actors?.[0] ?? null,
      log: addLog,
      tlog: addTLog,
      delay,
      stat,
      temp: {},
      ...extraCtx,
    }

    try {
      await runPipeline(pipelineName, ctx, defaultRunner)
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
    registerPipelinesFromPreset(Pipeline, pack.value)
    registerDefaultPipelines(Pipeline)
  }

  // ============================================================
  // 暴露给 pack
  // ============================================================
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
// ============================================================
// DOM 函数挂载（从 domRefs 获取）
// ============================================================
export const mountDomFunction = (obj, domRefs = {}) => {
  obj.addLog = domRefs.addLog || ((msg, type) => console.log(`[${type}]`, msg))
  obj.addTLog = domRefs.addTLog || ((msg, type) => {
    console.log(`[${new Date().toLocaleTimeString()}][${type}]`, msg)
  })
  obj.delay = domRefs.delay || ((ms) => new Promise((r) => setTimeout(r, ms)))

  obj.stat = domRefs.stat || ((name, value) => {
    if (!obj.stats) obj.stats = {}
    if (!obj.stats[name]) obj.stats[name] = { count: 0, total: 0 }
    obj.stats[name].count++
    obj.stats[name].total += Number(value) || 0
  })

  obj.log = obj.addLog
  obj.tlog = obj.addTLog
}

// ============================================================
// Pipeline 注册（提取为独立函数）
// ============================================================
const registerPipelinesFromPreset = (Pipeline, pkg) => {
  if (!pkg?.pipelines) return

  for (const [name, config] of Object.entries(pkg.pipelines)) {
    Pipeline(name, config.steps || config)

    // 自动生成 ops 条目
    if (!pkg.ops?.[name]) {
      pkg.ops[name] = {
        label: name,
        type: 'secondary',
        entry: name,
      }
    }

    // 处理 pipeline 定位
    const pos = (config.pos ?? '').split(' ')
    const target = Pipeline(pos[0])
    if (!target) continue

    const prio = Number(pos[2]) || 0
    if (pos[1] === 'append') {
      target.append(prio, config.do || [])
    } else if (pos[1] === 'prepend') {
      target.prepend(prio, config.do || [])
    }
  }
}

// ============================================================
// 自定义 Runner
// ============================================================
const defaultRunner = (ctx, step) => {
  if (typeof step === 'function') {
    step(ctx)
  } else if (step && typeof step === 'object') {
    const { type, ...args } = step
    switch (type) {
      case 'log':
        ctx.log?.(String(args.message || ''), args.level || 'info')
        break
      case 'delay':
        return ctx.delay?.(args.ms || 0)
      case 'setEnv':
        ctx.env[args.key] = args.value
        break
      case 'each':
        if (Array.isArray(args.items)) {
          for (const item of args.items) {
            ctx.temp.item = item
            if (Array.isArray(args.body)) {
              for (const bodyStep of args.body) {
                defaultRunner(ctx, bodyStep)
              }
            }
          }
        }
        break
      default:
        ctx.log?.(`Unknown step type: ${type}`, 'warn')
    }
  }
  return ctx
}

// ============================================================
// 创建独立实例（非 Vue 环境）
// ============================================================
export const createInstance = (preset, domRefs = {}, obj = {}) => {
  const { blocks, ...frontmatter } = preset

  // 合并 frontmatter
  Object.assign(obj, frontmatter)

  // 解析 blocks 并合并到对应属性
  for (const block of blocks) {
    if (!block?.is) continue

    const isKey = block.is
    delete block.is

    if (!obj[isKey]) {
      obj[isKey] = {}
    }
    Object.assign(obj[isKey], block)
  }

  // 创建 Pipeline 运行时
  const { Pipeline, runPipeline } = createPipelineRuntime()
  obj.Pipeline = Pipeline

  // 挂载 domRefs 中的函数
  mountDomFunction(obj, domRefs)

  // 注册 pipelines
  registerPipelinesFromPreset(Pipeline, obj)
  registerDefaultPipelines(Pipeline)

  // 状态
  let isRunning = false
  let currentOp = null
  let lastOp = null

  obj.isRunning = () => isRunning
  obj.currentOp = () => currentOp
  obj.lastOp = () => lastOp

  obj.run = async (pipelineName, extraCtx = {}) => {
    if (isRunning) return

    const p = Pipeline(pipelineName)
    if (!p) {
      obj.addLog?.(`Pipeline "${pipelineName}" 未定义`, 'error')
      return
    }

    isRunning = true
    currentOp = pipelineName

    const ctx = Object.assign(Object.create(obj), {
      temp: {},
      ...extraCtx,
    })

    try {
      await runPipeline(pipelineName, ctx, defaultRunner)
      lastOp = pipelineName
    } catch (err) {
      obj.addLog?.(`错误: ${err.message}`, 'error')
    }

    currentOp = null
    isRunning = false
  }

  return obj
}