//runnable:any

// runner: runnable -> any

// unfold:(...)-> [runnable]
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
const NotInitialized=Symbol("Not initialized yet")
export const createPipelineRuntime = () => {
  const pipelines = {}

  const Pipeline = (name, main) => {
    if (main == undefined && typeof name === 'string') {
      let got=pipelines[name];
      return got ?got:Pipeline(name,NotInitialized)
    }
    let got=pipelines[name];
    if(got && got.main == NotInitialized){
      got.main=main;
      return got;
    }else if(got && got.main != NotInitialized){
      return got;
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
        ? unfold(pipelines, pipeline)
        : pipeline
        
    return steps.reduce(runner, ctx)
  }

  return { Pipeline, runPipeline, pipelines }
}
