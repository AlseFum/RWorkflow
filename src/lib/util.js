// ============================================================
// 核心工具函数库
// 为 objRunner 和 pipeline 提供指令支持
// ============================================================

/**
 * 获取值的实际类型（完善的类型判断）
 * 返回: 'string' | 'int' | 'real' | 'boolean' | 'array' | 'object' | 'null' | 'undefined' | 'function' | 'symbol' | 'bigint'
 */
export const type = (value) => {
  // 优先判断 null（typeof null === 'object'）
  if (value === null) return 'null'

  // 判断 undefined
  if (value === undefined) return 'undefined'

  // 获取原始类型
  const t = typeof value

  switch (t) {
    case 'string':
      return 'string'

    case 'number':
      // 细分整数和浮点数
      return Number.isFinite(value)
        ? (Number.isInteger(value) ? 'int' : 'real')
        : (Number.isNaN(value) ? 'nan' : (value > 0 ? 'infinity' : '-infinity'))

    case 'boolean':
      return 'boolean'

    case 'function':
      return 'function'

    case 'symbol':
      return 'symbol'

    case 'bigint':
      return 'bigint'

    case 'object':
      // 对象类型细分
      if (Array.isArray(value)) {
        // 空数组判断
        return 'array'
      }
      // Date 对象
      if (value instanceof Date) return 'date'
      // RegExp 对象
      if (value instanceof RegExp) return 'regexp'
      // Map 对象
      if (value instanceof Map) return 'map'
      // Set 对象
      if (value instanceof Set) return 'set'
      // Promise 对象
      if (value instanceof Promise) return 'promise'
      // 普通对象判断（空对象）
      return Object.keys(value).length === 0 ? 'emptyObject' : 'object'

    default:
      return 'unknown'
  }
}
/**
 * 类型守卫 - 判断是否为空（空字符串、空数组、空对象）
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}


/**
 * 类型守卫 - 判断是否可迭代
 */
export const isIterable = (value) => {
  return value !== null && value !== undefined && typeof value[Symbol.iterator] === 'function'
}

// ============================================================
// typeCase - 类型模式匹配
// ============================================================

/**
 * 类型模式匹配函数（curried 形式）
 * @param {object} cases - 类型处理器映射，如 { int: n => n*2, string: s => s.toUpperCase(), otherwise: v => v }
 * @returns {(value: any) => any} - 接受值并返回匹配处理结果
 *
 * @example
 * // curried 用法：handlers 先，value 后
 * typeCase({ int: n => n * 2 })(42)           // → 84
 * typeCase({ int: n => n * 2, otherwise: x => x })(42)
 *
 * // 快捷用法
 * typeMatch(42, { int: n => n * 2 })
 */
export const typeCase = (cases) => (value) => {
  const t = type(value)

  const typeHierarchy = {
    int: ['number'],
    real: ['number'],
    nan: ['number'],
    '+infinity': ['number'],
    '-infinity': ['number'],
    emptyArray: ['array'],
    emptyObject: ['object'],
  }

  // 特殊字面量匹配（优先于类型匹配）
  if (value === true   && cases.true       !== undefined) return cases.true(value)
  if (value === false  && cases.false      !== undefined) return cases.false(value)
  if (value === ''     && cases.emptyString !== undefined) return cases.emptyString(value)

  // numeric / iterable 快捷别名展开
  if (cases.numeric  !== undefined && ['int','real','nan','+infinity','-infinity'].includes(t)) {
    return cases.numeric(value)
  }
  if (cases.iterable !== undefined && ['array','map','set'].includes(t)) {
    return cases.iterable(value)
  }

  // batch 特殊处理：array 遍历 / object 包装，都带 exit 回调
  if (cases.batch !== undefined) {
    if (Array.isArray(value)) {
      let exit_ = false
      for (const item of value) {
        cases.batch(item, () => { exit_ = true })
        if (exit_) break
      }
      return undefined
    }
    if (t === 'object') {
      cases.batch(value, () => {})
      return undefined
    }
  }

  // 精确匹配（不含 alias key 本身）
  if (cases[t] !== undefined) {
    const h = cases[t]
    return typeof h === 'function' ? h(value) : h
  }

  // 父类型回退（子类 → 父类）
  for (const parent of (typeHierarchy[t] || [])) {
    if (cases[parent] !== undefined) {
      const h = cases[parent]
      return typeof h === 'function' ? h(value) : h
    }
  }

  // 默认处理器
  if (cases.otherwise !== undefined) {
    const h = cases.otherwise
    return typeof h === 'function' ? h(value) : h
  }

  return undefined
}

/**
 * typeMatch - typeCase 的同步简写版本（value 在前，handlers 在后）
 * @example
 * typeMatch(42, { int: n => n * 2, otherwise: () => 0 })  // → 84
 */
export const typeMatch = (value, cases) => typeCase(cases)(value)

// ============================================================
// 辅助工具
// ============================================================

/**
 * 深度合并对象（使用 typeMatch 实现类型分发）
 * @param {any} target - 目标对象
 * @param {any} source - 源数据
 * @returns {any} 合并后的结果
 */
export const deepMerge=(target, source) =>  typeMatch(source, {
    // null / undefined 直接返回源值
    null: (src) => src,
    undefined: (src) => src,

    // 数组：返回浅拷贝
    array: (src) => [...src],

    // 普通对象：递归合并
    object: (src) => {
      // target 如果不是普通对象，则视为空对象
      const targetIsObject = target && typeof target === 'object' && !Array.isArray(target)
      const output = targetIsObject ? { ...target } : {}

      for (const [key, value] of Object.entries(src)) {
        // 如果 value 是对象且非数组，递归合并；否则直接赋值
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          output[key] = deepMerge(output[key] ?? null, value)
        } else {
          output[key] = value
        }
      }
      return output
    },

    // 其他基本类型（string, number, boolean 等）直接返回源值
    otherwise: (src) => src,
  })

/**
 * 安全获取嵌套属性
 */
export const getNested = (obj, path, defaultVal = undefined) => {
  return path.split('.').reduce((curr, key) => curr?.[key], obj) ?? defaultVal
}

/**
 * 安全设置嵌套属性
 */
export const setNested = (obj, path, value) => {
  const keys = path.split('.')
  const last = keys.pop()
  keys.reduce((curr, key) => curr[key] ??= {}, obj)[last] = value
}

/**
 * 判断当前网页是竖屏布局还是宽屏布局
 * @returns {'portrait' | 'landscape'} - portrait：竖屏（高度 ≥ 宽度），landscape：宽屏（宽度 > 高度）
 */
export const getScreenOrientation=() =>{
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}