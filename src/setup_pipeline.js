export const registerDefaultPipelines = (Pipeline) => {
  Pipeline("pre",ctx=>ctx)
  Pipeline('post',ctx=>ctx)
}
