import { createPipelineRuntime } from './lib/pipeline.js'
import { createEmptyPackage } from './types.js'
import { deepMerge, typeMatch } from './lib/util.js'

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
  obj.log = obj.addLog
  obj.tlog = obj.addTLog
  obj.stat = (name, value) => {
    if (!domRefs.stats[name]) {
      domRefs.stats[name] = { count: 0, total: 0 }
    }
    domRefs.stats[name].count++
    domRefs.stats[name].total += Number(value) || 0
  }
  obj.do = (cmd,dir,value) => {
    if (obj.com && obj.com[cmd] && typeof obj.com[cmd] === 'string') {
      try {
        ExecString(obj.com[cmd], { ctx:obj._, dir, value,actor:obj.selectedActor  })
      } catch (e) {
        console.error(`Error executing com[${cmd}]:`, e)
      }
    }
  }
  obj.asArg=asArg
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

const registerPipelinesFromSetting = (Pipeline, pkg) => {
  if (!pkg?.pipelines) return
  for (const [name, config] of Object.entries(pkg.pipelines)) {
    Pipeline(name, config)
    typeMatch(config, {
      batch: (item) => {
        typeMatch(item, {
          object: (obj) => { if (obj.pos) applyPipelinePos(Pipeline, obj.pos, name) },
        })
      },
      string: (s) => {
        const regex = /^\/\/#pos\s*(.*)$/gm
        let match
        while ((match = regex.exec(s)) !== null) {
          applyPipelinePos(Pipeline, match[1], name)
        }
      },
    })
  }
}

// ============================================================
// 自定义 Runner
// ============================================================
const ExecString = (code, ctx) => {
  const keys = Object.keys(ctx)
  const values = Object.values(ctx)
  // {
  // 这里进行一些宏替换
  //   code=code.replace("$$SELECTED","(ctx._.selectedActor||{})")
  //   //$something.name -> ctx.something?[name]
  // }
  try {
    return new Function('ctx', ...keys, code)(ctx, ...values)
  } catch (err) {
    console.error('[ExecString Error]', err.message, { code, ctx: Object.keys(ctx) })
    throw err
  }
}
export const asArg = (dir = "") => {
  const args = {}
  const rest = []

  const tokens = dir.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // -a
    if (/^-[a-zA-Z]$/.test(token)) {
      const key = token[1]
      args[key] = true

    // --prop
    } else if (/^--[a-zA-Z][\w-]*$/.test(token)) {
      const key = token.slice(2)
      const next = tokens[i + 1]

      if (
        next &&
        !next.startsWith("-") &&
        !next.endsWith(":")
      ) {
        args[key] = next
        i++
      } else {
        args[key] = true
      }

    // something:
    } else if (/:$/.test(token)) {
      rest.push(token)

    // normal word
    } else {
      rest.push(token)
    }
  }

  return {
    raw: dir,
    args,
    rest: rest.join(" ").trim()
  }
}
const ExecKeyValue = (ctx, obj) => {
  for (const [key, value] of Object.entries(obj)) {
    // ENV 处理
    if (key.startsWith("ENV")) {
      const envKey = key.slice(4).trim()
      typeMatch(value, {
        string: (s) => {
          if (s.startsWith("++")) {
            ctx.env[envKey] = (ctx.env[envKey] || 0) + s.slice(1).trim()
          } else if (s.startsWith("--")) {
            ctx.env[envKey] = (ctx.env[envKey] || 0) - s.slice(1).trim()
          } else {
            ctx.env[envKey] = s
          }
        },
        otherwise: (v) => { ctx.env[envKey] = v },
      })
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
    if(key == "EXIT"){
      return {EXIT:Number(value)}
    }

    // 从 ctx._.com 中查找命令
    const parts = key.split(/\s+/)
    const cmd = parts[0]
    const dir = parts.slice(1).join(' ') || null
    const comCmd = ctx._.com?.[cmd]
    if (comCmd && typeof comCmd === 'string') {
      try {
        ExecString(comCmd, { ctx, dir, value,actor:ctx._.selectedActor })
      } catch (e) {
        console.error(`Error executing com[${cmd}]:`, e)
      }
    }
  }
}
const defaultRunner = (ctx, step) => {
  // 统一判断是否为 EXIT 信号
  const checkExit = (result) => {
    if (
      result &&
      typeof result === 'object' &&
      Reflect.has(result, 'EXIT')
    ) {
      ctx.__EXIT__ = Number(result.EXIT)
      return true
    }
    return false
  }

  typeMatch(step, {
    function: (fn) => {
      const res = fn(ctx)
      if (checkExit(res)) return ctx
    },
    string: (s) => {
      const res = ExecString(s, { ctx, actor: ctx._.selectedActor })
      if (checkExit(res)) return ctx
    },
    batch: (item, exit) =>
      typeMatch(item, {
        function: (fn) => {
          const res = fn(ctx)
          if (checkExit(res)) { exit(); return ctx }
        },
        string: (s) => {
          const res = ExecString(s, { ctx, actor: ctx._.selectedActor })
          if (checkExit(res)) { exit(); return ctx }
        },
        object: (obj) => {
          const res = ExecKeyValue(ctx, obj)
          if (checkExit(res)) { exit(); return ctx }
        },
      }),
  })
  return ctx
}

// ============================================================
// createInstance 辅助函数
// ============================================================

const mergeBlocks = (obj, blocks) => {
  for (const raw of blocks ?? []) {
    if (!raw?.is) continue

    const { is: isKey, id, ...block } = raw

    if (isKey === 'preset' || isKey === 'presets') {
      if (id) {
        if (!obj.preset) obj.preset = {}
        obj.preset[id] = deepMerge(obj.preset[id] ??= {}, block)
      }
    } else {
      obj[isKey] = deepMerge(obj[isKey] ??= {}, block)
    }
  }
}

const setupPipelines = (obj, domRefs) => {
  const { Pipeline, runPipeline, pipelines, seal } = createPipelineRuntime()
  obj.Pipeline = Pipeline
  obj._pipelines = pipelines

  mountDomFunction(obj, domRefs)
  registerPipelinesFromSetting(Pipeline, obj)

  Pipeline("pre", ctx => ctx)
  Pipeline('post', ctx => ctx)

  return { Pipeline, runPipeline, seal }
}

const attachRuntime = (obj, Pipeline, runPipeline) => {
  let isRunning = false
  let currentOp = null
  let lastOp = null

  obj.isRunning = () => isRunning
  obj.currentOp = () => currentOp
  obj.lastOp = () => lastOp
  obj.selectedActor = null

  obj.run = async (pipelineName, extraCtx = {}) => {
    if (isRunning) return
    const p = obj._pipelines?.[pipelineName]
    if (!p) {
      console.log("Pipeline not found",pipelineName)
      obj.addLog?.(`Pipeline "${pipelineName}" 未定义`, 'error')
      return
    }
    isRunning = true
    currentOp = pipelineName
    const ctx = Object.assign(Object.create(obj), {
      _: obj,
      ...extraCtx,
    })
    obj._ = ctx
    try {
      let res = await runPipeline("pre", ctx, defaultRunner)
      res = await runPipeline(pipelineName, res, defaultRunner)
      res = await runPipeline("post", res, defaultRunner)
      lastOp = pipelineName
    } catch (err) {
      obj.addLog?.(`错误: ${err.message}`, 'error')
      console.error("[run error]", err)
    }

    currentOp = null
    isRunning = false
  }
}

export const getPresetsFromPackage = (parsed) => {
  const { blocks, ...frontmatter } = parsed
  const tmp = createEmptyPackage()
  Object.assign(tmp, frontmatter)
  mergeBlocks(tmp, blocks)
  return tmp.preset || {}
}

export const createInstance = (preset, domRefs = {}, obj = {}, presetName = null) => {
  const basePackage = createEmptyPackage()
  const { blocks, ...frontmatter } = preset

  Object.assign(obj, basePackage, frontmatter)

  mergeBlocks(obj, blocks)

  if (!obj.env) obj.env = {}
  if (!obj.actors) obj.actors = []

  if (presetName && obj.preset?.[presetName]) {
    const p = obj.preset[presetName]
    for (const [key, val] of Object.entries(p)) {
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null) {
        obj.env[key] = val
      }
    }
    if (Array.isArray(p.actors)) {
      obj.actors = p.actors.map(a => ({ ...a }))
    }
  }

  const { Pipeline, runPipeline, seal } = setupPipelines(obj, domRefs)
  attachRuntime(obj, Pipeline, runPipeline)
  seal()
  globalThis.curInst = obj
  return obj
}