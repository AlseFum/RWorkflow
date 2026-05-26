import { createPipelineRuntime } from './pipeline.js'
import { registerDefaultPipelines } from './setup_pipeline.js'
import { createEmptyPackage } from './types.js'
import { typeCase } from './util.js'

/**
 * 核心业务运行时工厂
 */

// ============================================================
// DOM 函数挂载（从 domRefs 获取）
// ============================================================
export const mountDomFunction = (obj, domRefs = {}) => {
  obj.addLog = (msg, type) => {
    domRefs.logs.push({ msg, type })
    domRefs.addLog?.(msg, type)
  }
  obj.addTLog = (msg, type) => {
    domRefs.logs.push({ time: new Date().toLocaleTimeString(), msg, type })
    domRefs.addTLog?.(msg, type)
  }
  obj.stat = (name, value) => {
    if (!domRefs.stats[name]) {
      domRefs.stats[name] = { count: 0, total: 0 }
    }
    domRefs.stats[name].count++
    domRefs.stats[name].total += Number(value) || 0
  }

  obj.log = obj.addLog
  obj.tlog = obj.addTLog
  obj.e = function (prop, value) {
    if (value != undefined) {
      obj.env[prop] = value
    } else {
      return obj.env[prop]
    }
  }
}

// ============================================================
// Pipeline 注册（提取为独立函数）
// ============================================================
const parsePosString = (posStr) => {
  let prio = 16, where = "after", mountPipe = "prepare";
  posStr.split(/[ \r\t]+/).forEach(i =>
    isFinite(Number(i)) ? prio = Number(i)
      : ["after", "append"].indexOf(i) != -1 ? (where = "after")
        : ["before", "prepend"].indexOf(i) != -1 ? (where = "before")
          : mountPipe = i
  )
  return { prio, where, mountPipe }
}

const applyPipelinePos = (Pipeline, posStr, name) => {
  const { prio, where, mountPipe } = parsePosString(posStr)
  const mountHandle = Pipeline(mountPipe)
  if (!mountHandle) return
  if (where == "before") {
    Pipeline(mountPipe).prepend(prio, name)
  } else if (where == "after") {
    Pipeline(mountPipe).append(prio, name)
  }
}

// 两种形式：pipelineName: 字符串纯js
//          pipelineName: 复杂数组
const registerPipelinesFromPreset = (Pipeline, pkg) => {
  if (!pkg?.pipelines) return
  for (const [name, config] of Object.entries(pkg.pipelines)) {
    typeCase(config)
      .string((s) => {
        const regex = /^\/\/#pos\s*(.*)$/gm
        let match
        while ((match = regex.exec(s)) !== null) {
          applyPipelinePos(Pipeline, match[1], name)
        }
      })
      .array((arr) => arr.forEach((item) => {
        if (item.pos) applyPipelinePos(Pipeline, item.pos, name)
      }))
      .object((obj) => {
        if (obj.pos) applyPipelinePos(Pipeline, obj.pos, name)
      })

    if (!pkg.ops?.[name]) {
      pkg.ops[name] = {
        label: name,
        type: 'info',
        entry: name,
      }
    }
  }
}

// ============================================================
// 自定义 Runner
// ============================================================
const ExecString = (code, ctx) => {
  const keys = Object.keys(ctx)
  const values = Object.values(ctx)
  {
    code=code.replace("$$SELECTED","(ctx._.selectedActor||{})")
    //$something.name -> ctx.something?[name]
  }
  return new Function('ctx', ...keys, code)(ctx, ...values)
}

const KeyValueRunner = (ctx, obj) => {
  for (const [key, value] of Object.entries(obj)) {
    // ENV 处理
    if (key.startsWith("ENV")) {
      const envKey = key.slice(4).trim()
      typeCase(value)
        .string((s) => {
          if (s.startsWith("++")) {
            ctx.env[envKey] = (ctx.env[envKey] || 0) + s.slice(1).trim()
          } else if (s.startsWith("--")) {
            ctx.env[envKey] = (ctx.env[envKey] || 0) - s.slice(1).trim()
          } else {
            ctx.env[envKey] = s
          }
        })
        .otherwise((v) => { ctx.env[envKey] = v })
      continue
    }

    // TRANSFER 处理
    if (key.startsWith("TRANSFER")) {
      const transferType = key.slice(8).trim()
      if (transferType == "ENV") {
        const [from, fromScale, to, toScale] = value.split(/[ \r\t]+/)
        const normal = Math.floor((ctx._.env[from] ?? 0) / fromScale)
        ctx._.env[from] = (ctx._.env[from] ?? 0) - normal * fromScale
        ctx._.env[to] = (ctx._.env[to] ?? 0) + normal * toScale
      } else if (transferType == "SELECTED") {
        const [from, fromScale, to, toScale] = value.split(/[ \r\t]+/)
        const normal = Math.floor((ctx._.selectedActor[from] ?? 0) / fromScale)
        ctx._.selectedActor[from] = (ctx._.selectedActor[from] ?? 0) - normal * fromScale
        ctx._.selectedActor[to] = (ctx._.selectedActor[to] ?? 0) + normal * toScale
      }
      continue
    }

    // 从 ctx._.com 中查找命令
    const parts = key.split(/\s+/)
    const cmd = parts[0]
    const dir = parts.slice(1).join(' ') || null
    const comCmd = ctx._.com?.[cmd]
    if (comCmd && typeof comCmd === 'string') {
      try {
        ExecString(comCmd, { ctx, dir, value })
      } catch (e) {
        console.error(`Error executing com[${cmd}]:`, e)
      }
    }
  }
}
const defaultRunner = (ctx, step) => {
  typeCase(step)
    .function((fn) => fn(ctx))
    .string((s) => ExecString(s, { ctx }))
    .array((arr) => arr.forEach((singleStep) => {
      typeCase(singleStep)
        .object((obj) => KeyValueRunner(ctx, obj))
        .string((s) => ExecString(s, { ctx }))
        .otherwise(() => console.log("whats this?", singleStep))
    }))
    .object((obj) => KeyValueRunner(ctx, obj))
  return ctx
}

export const createInstance = (preset, domRefs = {}, obj = {}) => {
  const basePackage = createEmptyPackage()
  let { blocks, ...frontmatter } = preset

  Object.assign(obj, basePackage, frontmatter)

  // 解析 blocks 并合并到对应属性
  for (const block of blocks ?? []) {
    if (!block?.is) continue

    const isKey = block.is
    delete block.is

    if (isKey === 'actors') {
      if (!obj.actors) obj.actors = []
      for (const i of (block.data || block.actors)) {
        obj.actors.push(i)
      }
    } else {
      Object.assign(obj[isKey] ??= {}, block)
    }
  }

  // 创建 Pipeline 运行时
  const { Pipeline, runPipeline, pipelines } = createPipelineRuntime()
  obj.Pipeline = Pipeline
  obj._pipelines = pipelines

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
  obj.selectedActor = null

  obj.run = async (pipelineName, extraCtx = {}) => {
    if (isRunning) return
    // obj.addLog?.(`开始执行 pipeline: ${pipelineName}`, 'info')
    const p = Pipeline(pipelineName)
    if (!p) {
      obj.addLog?.(`Pipeline "${pipelineName}" 未定义`, 'error')
      return
    }

    isRunning = true
    currentOp = pipelineName
    const ctx = Object.assign(Object.create(obj), {
      _: obj,/*don't set _ to any other property*/
      do(cmd,dir,value){
        if (ctx._.com && ctx._.com[cmd] && typeof ctx._.com[cmd] === 'string') {
          try {
            ExecString(ctx._.com[cmd], { ctx, dir, value })
          } catch (e) {
            console.error(`Error executing com[${cmd}]:`, e)
          }
        }
      },
      ...extraCtx,
    })

    try {
      let res=await runPipeline("pre", ctx, defaultRunner)
      res=await runPipeline(pipelineName, res, defaultRunner)
      /*res=*/await runPipeline("post", res, defaultRunner)
      lastOp = pipelineName
    } catch (err) {
      obj.addLog?.(`错误: ${err.message}`, 'error')
    }

    currentOp = null
    isRunning = false
  }

  return obj
}