/**
 * 项目数据类型声明
 */

// Pipeline 步骤类型
export const STEP_TYPES = {
  LOG: 'log',
  DELAY: 'delay',
  SET_ENV: 'setEnv',
  EACH: 'each',
  ASSIGN: 'assign',
}

/**
 * @typedef {Object} PipelineStep
 * @property {string} type - 步骤类型: 'log' | 'delay' | 'setEnv' | 'each' | 'assign'
 * @property {string} [level] - 日志级别: 'step' | 'info' | 'data' | 'entity' | 'success' | 'warning' | 'error'
 * @property {string} [message] - 日志消息，支持 {expr} 插值
 * @property {number} [ms] - 延时毫秒数
 * @property {string} [key] - setEnv 的环境变量名
 * @property {string} [value] - setEnv 的值表达式，或 assign 的值
 * @property {string} [items] - each 遍历的数组名
 * @property {string} [target] - assign 的目标属性路径
 * @property {PipelineStep[]} [body] - each 循环体
 */

/**
 * @typedef {Object} Pipeline
 * @property {PipelineStep[]} steps - 步骤数组
 */

/**
 * @typedef {Object} Op
 * @property {string} label - 显示标签
 * @property {string} type - 按钮类型: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'danger'
 * @property {string} [entry] - 对应的 pipeline 名称
 */

/**
 * @typedef {Object} SchemaField
 * @property {string} type - 字段类型
 * @property {string} [label] - 显示标签
 * @property {*} [defaultValue] - 默认值
 * @property {string[]} [values] - enum 可选值
 * @property {Object} [depend] - 依赖条件
 * @property {boolean} [computed] - 是否计算字段
 * @property {*} [options] - 下拉选项
 */

/**
 * @typedef {Object} Package
 * @property {string} [name] - 包名称
 * @property {string} [icon] - 图标
 * @property {string} [description] - 描述
 * @property {Object} env - 环境变量
 * @property {Entity[]} actors - 实体列表
 * @property {Object.<string, Schema>} schemas - Schema 定义
 * @property {Object.<string, string>} messages - 国际化消息
 * @property {Object.<string, Op>} ops - 操作定义
 * @property {Object.<string, Pipeline>} pipelines - Pipeline 定义
 * @property {Object.<string, Entity>} [roles] - 实体模板
 */

/**
 * @typedef {Object} Entity
 * @property {string} id - 实体ID
 * @property {string} name - 实体名称
 * @property {boolean} active - 是否激活
 * @property {number} weight - 权重
 */

/**
 * @typedef {Object} Schema
 * @property {Object.<string, SchemaField>} env - 环境变量 schema
 * @property {Object.<string, SchemaField>} entity - 实体 schema
 */

// 默认 Schema
export const DEFAULT_SCHEMA = {
  env: {
    mode: { type: 'string', label: '模式' },
    debug: { type: 'boolean', label: '调试' },
    timeout: { type: 'int', label: '超时(ms)' },
  },
  entity: {
    id: { type: 'string', label: 'ID' },
    name: { type: 'string', label: '名称' },
    active: { type: 'boolean', label: '激活' },
    weight: { type: 'real', label: '权重' },
  },
}

// 默认环境变量
export const DEFAULT_ENV = {
  mode: 'dev',
  debug: true,
  timeout: 5000,
}

// 创建默认实体
export const createDefaultEntity = (index) => ({
  id: 'entity_' + index,
  name: 'Entity ' + index,
  active: true,
  weight: 1.0,
})

// 创建空 Package
export const createEmptyPackage = () => ({
  schemas: {},
  messages: {},
  ops: {},
  pipelines: {},
  preset: {},
})
