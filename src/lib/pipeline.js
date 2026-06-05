const unfold = (pipelines, step, stack = []) => {
  if (typeof step === 'function') return [step]
  if (typeof step === 'string' && pipelines[step]) {
    if (stack.includes(step)) throw new Error(`Pipeline 循环引用: ${[...stack, step].join(' → ')}`)
    const p = pipelines[step]
    const nextStack = [...stack, step]
    return [
      ...[...p.prepends].sort((a, b) => b.prio - a.prio).flatMap(s => unfold(pipelines, s.step, nextStack)),
      ...(p.main != null ? unfold(pipelines, p.main, nextStack) : []),
      ...[...p.appends].sort((a, b) => a.prio - b.prio).flatMap(s => unfold(pipelines, s.step, nextStack)),
    ]
  }
  return [step]
}

const NotInitialized = Symbol("Not initialized yet")

export const createPipelineRuntime = () => {
  const pipelines = {}
  let sealed = false                     // [CACHE] 是否已锁定
  const stepCache = new Map()            // [CACHE] 存储管道名 -> 步骤数组

  // 内部展开函数，带缓存逻辑（仅当 sealed = true 时使用缓存）
  const getSteps = (pipelineName) => {
    if (sealed && stepCache.has(pipelineName)) {
      return stepCache.get(pipelineName)
    }
    const steps = unfold(pipelines, pipelineName)
    if (sealed) {
      stepCache.set(pipelineName, steps)
    }
    return steps
  }

  const Pipeline = (name, main) => {
    if (main == undefined && typeof name === 'string') {
      const got = pipelines[name]
      if (got) return got
      if (sealed) return undefined
      return Pipeline(name, NotInitialized)
    }
    if (sealed) {
      throw new Error('Pipeline runtime is sealed, cannot define or modify pipelines')
    }
    let got = pipelines[name]
    if (got && got.main == NotInitialized) {
      got.main = main
      return got
    } else if (got && got.main != NotInitialized) {
      return got
    }
    const p = {
      name,
      main,
      prepends: [],
      appends: [],
      prepend(prio, step) {
        if (sealed) throw new Error('Pipeline runtime is sealed, cannot modify pipelines')
        this.prepends.push({ prio, step })
        return this
      },
      append(prio, step) {
        if (sealed) throw new Error('Pipeline runtime is sealed, cannot modify pipelines')
        this.appends.push({ prio, step })
        return this
      },
      rearrange: () => unfold(pipelines, name),
    }
    pipelines[name] = p
    return p
  }

  const runPipeline = (pipeline, ctx, runner = (ctx, step) => {
    if (typeof step === 'function') step(ctx)
    return ctx
  }) => {
    const steps =
      typeof pipeline === 'string'
        ? getSteps(pipeline)      // [CACHE] 使用带缓存的展开
        : pipeline

    return steps.reduce(runner, ctx)
  }

  // [CACHE] 导出 seal 函数
  const seal = () => {
    if (sealed) return
    sealed = true
    // 预缓存所有已定义管道的步骤（可选，也可以惰性缓存，这里显式预计算）
    for (const name of Object.keys(pipelines)) {
      getSteps(name)
    }
    // 冻结 pipelines 对象，防止意外添加新管道（但不影响已有管道内部数组的修改，因为已有 prepend/append 方法已禁止）
    Object.freeze(pipelines)
    Object.values(pipelines).forEach(p => Object.freeze(p))
  }

  return { Pipeline, runPipeline, pipelines, seal }
}