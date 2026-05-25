import { createPipelineRuntime } from './pipeline.js'
import { registerDefaultPipelines } from './setup_pipeline.js'

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
// 两种形式：pipelineName: 字符串纯js
//          pipelineName: 复杂数组
const registerPipelinesFromPreset = (Pipeline, pkg) => {
  if (!pkg?.pipelines) return
  //基本是接pipeline的活
  for (const [name, config] of Object.entries(pkg.pipelines)) {
    if (typeof config == "string") {
      const regex = /^\/\/#pos\s*(.*)$/gm;
      let match;
      while ((match = regex.exec(config)) !== null) {
        let rest = match[1].split(/[ \r\t]+/);
        let prio = 16, where = "after", mountPipe = "prepare";
        rest.forEach(i =>
          isFinite(Number(i)) ? prio = Number(i)
            : ["after", "append"].indexOf(i) != -1 ? (where = "after")
              : ["before", "prepend"].indexOf(i) != -1 ? (where = "before")
                : mountPipe = i
        )

        let mountHandle = Pipeline(mountPipe);
        if (!mountHandle) {
          continue;
        }
        if (where == "before") {
          Pipeline(mountPipe).prepend(prio, name)
        } else if (where == "after") {
          Pipeline(mountPipe).append(prio, name)
        }
      }
    } else if (Array.isArray(config)) {
      for (const item of config) {
        if (item.pos) {
          let rest = item.pos.split(/[ \r\t]+/);
          let prio = 16, where = "after", mountPipe = "prepare";
          rest.forEach(i =>
            isFinite(Number(i)) ? prio = Number(i)
              : ["after", "append"].indexOf(i) != -1 ? (where = "after")
                : ["before", "prepend"].indexOf(i) != -1 ? (where = "before")
                  : mountPipe = i
          )

          let mountHandle = Pipeline(mountPipe);
          if (!mountHandle) {
            continue;
          }
          if (where == "before") {
            Pipeline(mountPipe).prepend(prio, name)
          } else if (where == "after") {
            Pipeline(mountPipe).append(prio, name)
          }
        }
      }
    } else {
      let item = config;
      if (item.pos) {
        let rest = item.pos.split(/[ \r\t]+/);
        let prio = 16, where = "after", mountPipe = "prepare";
        rest.forEach(i =>
          isFinite(Number(i)) ? prio = Number(i)
            : ["after", "append"].indexOf(i) != -1 ? (where = "after")
              : ["before", "prepend"].indexOf(i) != -1 ? (where = "before")
                : mountPipe = i
        )

        let mountHandle = Pipeline(mountPipe);
        if (!mountHandle) {
          continue;
        }
        if (where == "before") {
          Pipeline(mountPipe).prepend(prio, name)
        } else if (where == "after") {
          Pipeline(mountPipe).append(prio, name)
        }
      }
    }

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
const KeyValueRunner=(ctx,obj)=>{
  for (const [key, value] of Object.entries(obj)) {
    // Form - ENV 和 TRANSFER 硬编码优先
    if (key.startsWith("ENV")) {
      let envKey=key.slice(4).trim();
      if(typeof value == "string" && value.startsWith("++")){
        ctx.env[envKey]=(ctx.env[envKey]?ctx.env[envKey]:0)+value.slice(1).trim();
      } else if(typeof value == "string" && value.startsWith("--")){
        ctx.env[envKey]=(ctx.env[envKey]?ctx.env[envKey]:0)-value.slice(1).trim();
      } else {
        ctx.env[envKey]=value;
      }
      continue
    }
    if (key.startsWith("TRANSFER")){
      let transferType=key.slice(8).trim();
      if(transferType == "ENV"){
        let [from_,fromScale,to,toScale]=value.split(/[ \r\t]+/);
        let normal=Math.floor((ctx._.env[from_]??0) / fromScale);
        ctx._.env[from_]=((ctx._.env[from_]??0)-(normal*fromScale));
        ctx._.env[to]=(ctx._.env[to]??0)+normal*toScale;
      } else if (transferType == "SELECTED"){
        let [from_,fromScale,to,toScale]=value.split(/[ \r\t]+/);
        let normal=Math.floor((ctx._.selectedActor[from_]??0) / fromScale);
        ctx._.selectedActor[from_]=((ctx._.selectedActor[from_]??0)-(normal*fromScale));
        ctx._.selectedActor[to]=(ctx._.selectedActor[to]??0)+normal*toScale;
      }
      continue
    }

    // 从 ctx._.com 中查找命令
    const parts = key.split(/\s+/)
    const cmd = parts[0]
    const dir = parts.slice(1).join(' ') || null
    if (ctx._.com && ctx._.com[cmd] && typeof ctx._.com[cmd] === 'string') {
      try {
        const fn = new Function('ctx', 'dir', 'value', ctx._.com[cmd])
        fn(ctx, dir, value)
      } catch (e) {
        console.error(`Error executing com[${cmd}]:`, e)
      }
      continue
    }
  }
}
const defaultRunner = (ctx, step) => {
  if (typeof step === 'function') {
    step(ctx)
  } else if (typeof step === 'string') {
    return (new Function('ctx', step)(ctx)) ?? ctx
  } else if (Array.isArray(step)) {
    for (const singleStep of step) {
      if (typeof singleStep == "object") {
        KeyValueRunner(ctx,singleStep)
      }
      else if (typeof singleStep == "string") {
        // Form
        new Function("ctx", singleStep)(ctx);
      } else {
        console.log("whats this?", step)
      }
    }

  }
  else if (typeof step === 'object') {
    KeyValueRunner(ctx,step)
  }
  return ctx
}

export const createInstance = (preset, domRefs = {}, obj = {}) => {
  let { blocks, ...frontmatter } = preset
  // 合并 frontmatter
  Object.assign(obj, frontmatter)
  blocks = blocks ?? [];

  // 解析 blocks 并合并到对应属性
  for (const block of blocks) {
    if (!block?.is) continue

    const isKey = block.is
    delete block.is

    if (isKey === 'actors') {
      if (!obj.actors) obj.actors = []
      for (const i of (block.data || block.actors)) {
        obj.actors.push(i)
      }
    } else {
      if (!obj[isKey]) {
        obj[isKey] = {}
      }
      Object.assign(obj[isKey], block)
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
            const fn = new Function('ctx', 'dir', 'value', ctx._.com[cmd])
            fn(ctx, dir, value)
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