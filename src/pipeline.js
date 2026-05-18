const expandStep = (pipelines, step, stack = []) => {
  if (typeof step === 'function') return [step]
  if (typeof step === 'string' && pipelines[step]) {
    if (stack.includes(step)) throw new Error(`Pipeline 循环引用: ${[...stack, step].join(' → ')}`)
    const p = pipelines[step]
    const nextStack = [...stack, step]
    return [
      ...[...p.prepends].sort((a, b) => b.prio - a.prio).flatMap(s => expandStep(pipelines, s.step, nextStack)),
      ...(p.main != null ? expandStep(pipelines, p.main, nextStack) : []),
      ...[...p.appends].sort((a, b) => a.prio - b.prio).flatMap(s => expandStep(pipelines, s.step, nextStack)),
    ]
  }
  return [step]
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
      rearrange: () => expandStep(pipelines, name),
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
        ? expandStep(pipelines, pipeline)
        : pipeline

    return steps.reduce(runner, ctx)
  }

  return { Pipeline, runPipeline, pipelines }
}
