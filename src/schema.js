/**
 * Schema 工具 — 对齐 Example.md 的 schemas / enums / data 格式
 *
 * schemas.actor.role:     { type: 'enum:herorole', label: '职业' }
 * schemas.actor.wep:      { type: 'objectref:weapon', label: '武器' }
 * enums.herorole:         { Solider: '战士', Mage: '法师' }
 * data.weapon:            { WiseWand: { DMG: 5 }, BravoSword: { ATK: 2 } }
 */

/** @typedef {{ key: string, label: string, type: string, schemaType: string, options?: {value:string,label:string}[], computed?: boolean, readOnly?: boolean }} FieldDef */

export const FIELD_TYPES = [
  { value: 'string',  label: '字符串', icon: '📝', defaultVal: '' },
  { value: 'int',     label: '整数',   icon: '🔢', defaultVal: 0 },
  { value: 'real',    label: '小数',   icon: '📊', defaultVal: 0.0 },
  { value: 'boolean', label: '布尔',   icon: '✓',  defaultVal: false },
  { value: 'enum',    label: '枚举',   icon: '☰',  defaultVal: '' },
  { value: 'objectref', label: '引用',  icon: '◈',  defaultVal: '' },
]

// ============================================================
// Type 解析
// ============================================================

/**
 * 解析 type 字符串
 * 'enum:herorole'      → { base:'enum',  ref:'herorole',  raw:'enum:herorole' }
 * 'objectref:weapon'   → { base:'objectref', ref:'weapon',  raw:'objectref:weapon' }
 * 'int'                → { base:'int',    ref:null,        raw:'int' }
 */
export const parseFieldType = (typeStr) => {
  if (typeof typeStr !== 'string') return { base: 'string', ref: null, raw: 'string' }
  const m = typeStr.match(/^(enum|objectref):(.+)$/)
  if (m) return { base: m[1], ref: m[2], raw: typeStr }
  return { base: typeStr, ref: null, raw: typeStr }
}

// ============================================================
// 枚举解析（Example.md enums 块）
// ============================================================

export const resolveEnumOptions = (enums, enumRef) => {
  if (!enums || !enumRef) return []
  const def = enums[enumRef]
  if (!def) return []
  if (Array.isArray(def)) {
    return def.map((o) =>
      typeof o === 'object'
        ? { value: o.value, label: o.label ?? o.value }
        : { value: o, label: o }
    )
  }
  return Object.entries(def).map(([value, label]) => ({
    value,
    label: typeof label === 'string' ? label : value,
  }))
}

// ============================================================
// objectref 解析（Example.md data 块）
// ============================================================

/**
 * 从 data 块生成 objectref 下拉选项
 * data.weapon = { WiseWand: { DMG: 5 }, BravoSword: { ATK: 2 } }
 * refKey = 'weapon'
 * 返回 [{ value:'weapon.WiseWand', label:'WiseWand（DMG:5, ATK:2）' }, ...]
 */
export const resolveObjectRefOptions = (dataBlocks, refKey) => {
  if (!dataBlocks || !refKey) return []
  const block = dataBlocks[refKey]
  if (!block || typeof block !== 'object' || Array.isArray(block)) return []
  return Object.entries(block).map(([key, fields]) => {
    const label = buildObjectLabel(key, fields)
    return { value: `${refKey}.${key}`, label }
  })
}

const META_KEYS = new Set(['title', 'desc', 'icon'])

/**
 * 格式化 objectref 显示名
 * value='WiseWand', fields={ title:'智慧之杖', DMG:5, ATK:2 }
 * → '智慧之杖（DMG:5, ATK:2）'
 */
export const buildObjectLabel = (value, fields) => {
  if (!fields || typeof fields !== 'object') return value
  const name = fields.title || value
  const parts = Object.entries(fields)
    .filter(([k]) => !META_KEYS.has(k))
    .slice(0, 4)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')
  return parts ? `${name}（${parts}）` : name
}

/**
 * 获取 objectref 的可读显示值
 * 存储值格式：'weapon.WiseWand'
 */
export const objectRefLabel = (dataBlocks, schemaType, storedValue) => {
  if (!storedValue) return storedValue
  const { ref } = parseFieldType(schemaType)
  const options = resolveObjectRefOptions(dataBlocks, ref)
  const opt = options.find((o) => o.value === storedValue)
  return opt ? opt.label : storedValue
}

// ============================================================
// 通用工具
// ============================================================

export const checkDepend = (fieldDef, getVal) => {
  if (!fieldDef?.depend) return true
  for (const [depKey, depValue] of Object.entries(fieldDef.depend)) {
    const current = getVal(depKey)
    if (typeof depValue === 'object' && depValue !== null) {
      if (current === depValue.int || current === depValue.real || current === depValue.string) return true
      return false
    }
    if (current !== depValue) return false
  }
  return true
}

export const inferTypeFromValue = (value) => {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'real'
  if (typeof value === 'boolean') return 'boolean'
  return 'string'
}

export const defaultValueForType = (typeStr) => {
  const { base } = parseFieldType(typeStr)
  const t = FIELD_TYPES.find((x) => x.value === base)
  return t?.defaultVal ?? ''
}

export const convertValue = (val, toType) => {
  const { base } = parseFieldType(toType)
  switch (base) {
    case 'string':  return val != null ? String(val) : ''
    case 'int':     return val != null ? (parseInt(val, 10) || 0) : 0
    case 'real':    return val != null ? (parseFloat(val) || 0) : 0
    case 'boolean': return Boolean(val)
    case 'enum':    return typeof val === 'string' ? val : ''
    case 'objectref': return typeof val === 'string' ? val : ''
    default:        return val
  }
}

export const enumLabelFor = (options, value) => {
  if (!options?.length) return value
  const opt = options.find((o) => o.value === value)
  return opt ? (opt.label || opt.value) : value
}

// ============================================================
// 字段规范化
// ============================================================

export const normalizeSchemaField = (key, def, enums = null, dataBlocks = null) => {
  const fieldDef = typeof def === 'string' ? { type: def } : { ...def }
  const parsed = parseFieldType(fieldDef.type || 'string')
  let options = fieldDef.options

  if (parsed.base === 'enum') {
    options = resolveEnumOptions(enums, parsed.ref)
    if (!options?.length && fieldDef.values) {
      options = fieldDef.values.map((v) =>
        typeof v === 'object' ? v : { value: v, label: v }
      )
    }
  } else if (parsed.base === 'objectref') {
    options = resolveObjectRefOptions(dataBlocks, parsed.ref)
  }

  return {
    key,
    label: fieldDef.label || key,
    type: parsed.base,
    schemaType: parsed.raw,
    options: options ?? [],
    computed: !!fieldDef.computed,
    readOnly: !!fieldDef.readOnly || !!fieldDef.computed,
  }
}

// ============================================================
// 可视字段构建
// ============================================================

/**
 * @param {object|null} schema - schemas.actor / schemas.env
 * @param {object} modelValue - 当前数据对象
 * @param {object|null} enums - runtime.enums
 * @param {object|null} dataBlocks - runtime.data（weapon/hometown 等 data 块）
 * @returns {FieldDef[]}
 */
export const buildVisibleFields = (
  schema,
  modelValue,
  enums = null,
  dataBlocks = null
) => {
  const fields = []
  const schemaKeys = schema ? Object.keys(schema) : []
  const data = modelValue || {}
  const getVal = (k) => data[k]

  // 1. schema 定义的字段
  if (schema) {
    for (const [key, def] of Object.entries(schema)) {
      const fieldDef = typeof def === 'string' ? { type: def } : def
      if (!checkDepend(fieldDef, getVal)) continue
      fields.push(normalizeSchemaField(key, def, enums, dataBlocks))
    }
  }

  // 2. modelValue 中 schema 外已存在的键
  for (const key of Object.keys(data)) {
    if (schemaKeys.includes(key)) continue
    fields.push({
      key,
      label: key,
      type: inferTypeFromValue(data[key]),
      schemaType: inferTypeFromValue(data[key]),
      options: [],
      computed: false,
      readOnly: false,
    })
  }

  return fields
}
