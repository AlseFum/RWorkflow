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
 * 类型模式匹配函数
 * @param {any} value - 要检查的值
 * @returns {object} - 返回可链式调用的匹配器
 *
 * @example
 * typeCase(value)
 *   .number((n) => console.log('number:', n))
 *   .string((s) => console.log('string:', s))
 *   .array((arr) => console.log('array:', arr))
 *   .object((obj) => console.log('object:', obj))
 *   .null(() => console.log('null'))
 *   .undefined(() => console.log('undefined'))
 *   .otherwise((v) => console.log('other:', v))
 */
export const typeCase = (value) => {
  const matched = { type: type(value), value }

  const handlers = {}
  let defaultHandler = null

  const matcher = {
    // 数值类型
    number: (handler) => {
      handlers.number = handler
      return matcher
    },
    int: (handler) => {
      handlers.int = handler
      return matcher
    },
    real: (handler) => {
      handlers.real = handler
      return matcher
    },
    nan: (handler) => {
      handlers.nan = handler
      return matcher
    },
    infinity: (handler) => {
      handlers.infinity = handler
      handlers['+infinity'] = handler
      handlers['-infinity'] = handler
      return matcher
    },
    '+infinity': (handler) => {
      handlers['+infinity'] = handler
      return matcher
    },
    '-infinity': (handler) => {
      handlers['-infinity'] = handler
      return matcher
    },

    // 字符串
    string: (handler) => {
      handlers.string = handler
      return matcher
    },
    emptyString: (handler) => {
      handlers.emptyString = handler
      return matcher
    },

    // 布尔值
    boolean: (handler) => {
      handlers.boolean = handler
      return matcher
    },
    true: (handler) => {
      handlers.true = handler
      return matcher
    },
    false: (handler) => {
      handlers.false = handler
      return matcher
    },

    // 复合类型
    array: (handler) => {
      handlers.array = handler
      return matcher
    },
    emptyArray: (handler) => {
      handlers.emptyArray = handler
      return matcher
    },
    object: (handler) => {
      handlers.object = handler
      return matcher
    },
    emptyObject: (handler) => {
      handlers.emptyObject = handler
      return matcher
    },

    // 特殊类型
    null: (handler) => {
      handlers.null = handler
      return matcher
    },
    undefined: (handler) => {
      handlers.undefined = handler
      return matcher
    },
    function: (handler) => {
      handlers.function = handler
      return matcher
    },
    date: (handler) => {
      handlers.date = handler
      return matcher
    },
    regexp: (handler) => {
      handlers.regexp = handler
      return matcher
    },
    map: (handler) => {
      handlers.map = handler
      return matcher
    },
    set: (handler) => {
      handlers.set = handler
      return matcher
    },
    promise: (handler) => {
      handlers.promise = handler
      return matcher
    },
    symbol: (handler) => {
      handlers.symbol = handler
      return matcher
    },
    bigint: (handler) => {
      handlers.bigint = handler
      return matcher
    },

    // 快捷方式：所有数字类型（int, real, infinity, nan）
    numeric: (handler) => {
      handlers.int = handler
      handlers.real = handler
      handlers.nan = handler
      handlers['+infinity'] = handler
      handlers['-infinity'] = handler
      return matcher
    },

    // 快捷方式：所有容器类型（array, object, map, set）
    iterable: (handler) => {
      handlers.array = handler
      handlers.map = handler
      handlers.set = handler
      return matcher
    },

    // 默认处理器
    otherwise: (handler) => {
      defaultHandler = handler
      return matcher
    },

    // 执行匹配
    exec: () => {
      // 1. 精确匹配类型
      if (handlers[matched.type]) {
        return handlers[matched.type](matched.value)
      }

      // 2. 特殊值匹配
      if (matched.value === true && handlers.true) {
        return handlers.true(matched.value)
      }
      if (matched.value === false && handlers.false) {
        return handlers.false(matched.value)
      }
      if (matched.value === '' && handlers.emptyString) {
        return handlers.emptyString(matched.value)
      }

      // 3. 尝试父类型匹配（子类 -> 父类）
      const typeHierarchy = {
        int: ['number'],
        real: ['number'],
        nan: ['number'],
        '+infinity': ['number'],
        '-infinity': ['number'],
        emptyArray: ['array'],
        emptyObject: ['object'],
      }

      const parents = typeHierarchy[matched.type] || []
      for (const parent of parents) {
        if (handlers[parent]) {
          return handlers[parent](matched.value)
        }
      }

      // 4. 使用默认处理器
      if (defaultHandler) {
        return defaultHandler(matched.value)
      }

      // 5. 无匹配时返回 undefined
      return undefined
    },
  }

  return matcher
}

/**
 * typeCase 的同步简写版本
 * @example
 * typeMatch(value, {
 *   int: (n) => n * 2,
 *   string: (s) => s.toUpperCase(),
 *   otherwise: () => 'default'
 * })
 */
export const typeMatch = (value, cases) => {
  const matcher = typeCase(value)

  for (const [t, handler] of Object.entries(cases)) {
    if (t === 'otherwise') {
      matcher.otherwise(handler)
    } else if (t === 'numeric') {
      matcher.numeric(handler)
    } else if (t === 'iterable') {
      matcher.iterable(handler)
    } else {
      matcher[t]?.(handler)
    }
  }

  return matcher.exec()
}

// ============================================================
// 字符串插值
// ============================================================

/**
 * 字符串插值，支持 {expr} 语法
 */
export const interpolate = (str, ctx) => {
  if (!str || typeof str !== 'string') return str
  return str.replace(/\{([^}]+)\}/g, (_, expr) => {
    try {
      return eval(expr)
    } catch {
      return expr
    }
  })
}

// ============================================================
// 辅助工具
// ============================================================

/**
 * 深拷贝对象
 */
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

/**
 * 合并对象（浅）
 */
export const merge = (target, ...sources) => Object.assign(target, ...sources)

/**
 * 从对象提取指定前缀的键
 */
export const extractPrefix = (obj, prefix) => {
  const result = {}
  const rest = {}
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = val
    } else {
      rest[key] = val
    }
  }
  return { extracted: result, rest }
}

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
