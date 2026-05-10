// Pipeline 运行时
const expandStep = (pipelines, step, stack) => {
  if (typeof step === 'string') {
    return flattenPipeline(pipelines, step, stack)
  }
  if (typeof step === 'function' || Array.isArray(step)) {
    return [step]
  }
  throw new Error(`Pipeline 步骤须为 function、arrayscript 数组或子 pipeline 名字符串，得到 ${typeof step}. stack:${stack}`)
}

const flattenPipeline = (pipelines, name, stack = []) => {
  if (stack.includes(name)) {
    throw new Error(`Pipeline 循环引用: ${[...stack, name].join(' → ')}`)
  }
  const p = pipelines[name]
  if (!p) throw new Error(`Pipeline 未注册: 「${name}」`)
  const nextStack = [...stack, name]
  const out = []

  const prep = [...p.prepends].sort((a, b) => a.prio - b.prio).reverse()
  for (const { step } of prep) out.push(...expandStep(pipelines, step, nextStack))

  if (p.main != null) out.push(...expandStep(pipelines, p.main, nextStack))

  const app = [...p.appends].sort((a, b) => a.prio - b.prio)
  for (const { step } of app) out.push(...expandStep(pipelines, step, nextStack))

  return out
}

export const createPipelineRuntime = () => {
  const pipelines = {}

  const Pipeline = (name, main) => {
    if (main === undefined && typeof name === 'string') {
      return pipelines[name]
    }
    const p = {
      name,
      main,
      prepends: [],
      appends: [],
      prepend(prio, step) {
        this.prepends.push({ prio, step })
        return this
      },
      append(prio, step) {
        this.appends.push({ prio, step })
        return this
      },
      rearrange: () => flattenPipeline(pipelines, name),
    }
    pipelines[name] = p
    return p
  }

  const runPipeline = (pipeline, ctx) => {
    const steps =
      typeof pipeline === 'string'
        ? flattenPipeline(pipelines, pipeline)
        : pipeline

    for (const step of steps) {
      if (Array.isArray(step)) {
        step.forEach(item => typeof item === 'function' && item(ctx))
      } else if (typeof step === 'function') {
        step(ctx)
      } else {
        throw new Error(`runPipeline: 非法步骤类型 ${typeof step}`)
      }
    }

    return ctx
  }

  return { Pipeline, runPipeline, pipelines }
}
