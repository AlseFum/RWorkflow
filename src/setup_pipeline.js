// ============================================================
// 辅助函数：字符串插值
// ============================================================
export const interpolate = (str, ctx) => {
  if (!str) return str
  return str.replace(/\{([^}]+)\}/g, (_, expr) => {
    try {
      return eval(expr)
    } catch {
      return expr
    }
  })
}

// ============================================================
// 从步骤配置生成 pipeline 函数
// ============================================================
export const createStepsRunner = (steps) => {
  return (ctx) => {
    globalThis.ctx = ctx
    for (const step of steps) {
      if (step == null) continue
      switch (step.type) {
        case 'log':
          ctx.log?.(interpolate(step.message, ctx), step.level || 'info')
          break
        case 'delay':
          ctx.delay?.(step.ms)
          break
        case 'setEnv':
          try {
            const expr = step.value
            ctx.env[step.key] = eval(expr)
          } catch {
            ctx.env[step.key] = step.value
          }
          break
        case 'each': {
          const items = ctx[step.items] || []
          for (const item of items) {
            const loopCtx = { ...ctx, item }
            for (const bodyStep of step.body || []) {
              if (bodyStep.type === 'log') {
                ctx.log?.(interpolate(bodyStep.message, loopCtx), bodyStep.level || 'info')
              } else if (bodyStep.type === 'delay') {
                ctx.delay?.(bodyStep.ms)
              }
            }
          }
          break
        }
        default: {
          const res = new Function('ctx', step.body ?? step).call(ctx, ctx)
          if (res != null && res !== undefined) {
            ctx.log(res)
          }
          break
        }
      }
    }
  }
}

// ============================================================
// 注册默认 pipelines
// ============================================================
export const registerDefaultPipelines = (Pipeline) => {
  Pipeline("prepare",[])
  Pipeline('validate', [
    (ctx) => {
      ctx.log?.('验证环境配置...', 'step')
      ctx.delay(300)
      ctx.log?.(`mode=${ctx.env.mode}, debug=${ctx.env.debug}`, 'data')
      ctx.delay(200)
      ctx.log?.(`验证实体数量: ${ctx.actors.length}`, 'data')
      ctx.delay(200)
      ctx.log?.('验证通过 ✓', 'success')
    }
  ])

  Pipeline('process', [
    (ctx) => {
      ctx.log?.('开始处理数据...', 'step')
      ctx.delay(300)
      for (let i = 0; i < ctx.actors.length; i++) {
        const e = ctx.actors[i]
        ctx.log?.(`处理实体 [${i + 1}]: ${e.name || e.id}`, 'entity')
        ctx.delay(200)
        ctx.log?.(`  weight=${e.weight}, active=${e.active}`, 'data')
        ctx.delay(150)
      }
      ctx.env.processed = (ctx.env.processed || 0) + ctx.actors.length
      ctx.log?.(`处理完成，已处理 ${ctx.env.processed} 条`, 'success')
    }
  ])

  Pipeline('export', [
    (ctx) => {
      ctx.log?.('导出结果...', 'step')
      ctx.delay(400)
      ctx.log?.('生成报告...', 'info')
      ctx.delay(300)
      ctx.env.lastExport = Date.now()
      ctx.log?.(`导出完成: ${ctx.actors.length} 条记录`, 'success')
    }
  ])

  Pipeline('clean', [
    (ctx) => {
      ctx.log?.('清理缓存...', 'step')
      ctx.delay(300)
      ctx.env.cached = null
      ctx.log?.('清理完成 ✓', 'success')
    }
  ])

  Pipeline('batch-update', [
    (ctx) => {
      ctx.actors.forEach((e) => {
        e.weight = Math.min((e.weight || 0) * 1.1, 1.0)
      })
      ctx.log?.(`批量更新 ${ctx.actors.length} 个实体`, 'data')
    },
    (ctx) => {
      ctx.env.lastUpdate = new Date().toISOString()
      ctx.log?.(`env.lastUpdate = ${ctx.env.lastUpdate}`, 'data')
    }
  ])

  Pipeline('summary', [
    (ctx) => {
      ctx.log("It's done")
    }
  ])
}
