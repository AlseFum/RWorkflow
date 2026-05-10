// test.js
import { createPipelineRuntime } from './pipeline.js'

const { Pipeline, runPipeline } = createPipelineRuntime()

// 用于记录执行顺序
const log = []

// ===== 定义 pipeline =====
Pipeline('order', ctx => {
  ctx.orderId = 1
  log.push('order')
})
Pipeline('auth', ctx => {
  ctx.auth = true
  log.push('auth')
})
Pipeline('order')
  .prepend(100, ctx => {
    log.push('validate')
  })
  .prepend(80, 'auth') // 子 pipeline
  .append(10, ctx => {
    log.push('log')
  })



// ===== 执行测试 =====

const ctx = {}

runPipeline('order', ctx)

// ===== 断言 =====

const expected = [
  'validate', // prepend 高优先级
  'auth',     // 子 pipeline
  'order',    // main
  'log'       // append 低优先级
]

console.log('执行顺序:', log)
console.log('期望顺序:', expected)

const pass = JSON.stringify(log) === JSON.stringify(expected)

console.log(pass ? '✅ 测试通过' : '❌ 测试失败')