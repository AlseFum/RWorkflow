import fs from 'fs'
import path from 'path'
import { createInstance } from './runtime.js'
import { parsePackage } from './lib/mdreader.js'

const mdPath = path.join(import.meta.dirname, 'md', 'Example.md')
const raw = fs.readFileSync(mdPath, 'utf8')
const parsed = parsePackage(raw)

const inst = createInstance(parsed, { logs: [], stats: {} })

// ── tree printer ─────────────────────────────────────────────

const isLeafVal = (v) =>
  v === null || v === undefined ||
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)

const TREE_LABELED = new Set(['run', 'addLog', 'addTLog', 'log', 'tlog', 'stat', 'do', 'isRunning', 'currentOp', 'lastOp', 'asArg'])

const fmt = (v) => {
  if (typeof v === 'string') return `"${v.length > 60 ? v.slice(0, 57) + '...' : v}"`
  if (typeof v === 'function') return '[Function]'
  return String(v)
}

const tree = (obj, prefix = '') => {
  const isArr = Array.isArray(obj)
  const keys = isArr ? obj.map((_, i) => i) : (obj && typeof obj === 'object' ? Object.keys(obj) : null)
  if (!keys || keys.length === 0) return

  keys.forEach((k, i) => {
    const last = i === keys.length - 1
    const v = isArr ? obj[k] : obj[k]
    const connector = last ? '└── ' : '├── '
    const childPrefix = prefix + (last ? '    ' : '│   ')
    const label = isArr ? `[${k}]` : k

    if (typeof v === 'string' && v.includes('\n')) {
      const lines = v.trimEnd().split('\n')
      console.log(prefix + connector + label + ': |')
      const cont = childPrefix + '  '
      lines.forEach(line => console.log(cont + line))
    } else if (typeof v === 'function') {
      const arity = v.length
      const tag = TREE_LABELED.has(k) ? `[Function:${k}(${arity})]` : `[Function(${arity})]`
      console.log(prefix + connector + label + ': ' + tag)
    } else if (isLeafVal(v)) {
      const tag = (v && typeof v === 'object' && !Array.isArray(v)) ? '{}' : Array.isArray(v) ? `[${v.length}]` : fmt(v)
      console.log(prefix + connector + label + ': ' + tag)
    } else if (Array.isArray(v)) {
      console.log(prefix + connector + label + ` [${v.length}]`)
      tree(v, childPrefix)
    } else {
      console.log(prefix + connector + label)
      tree(v, childPrefix)
    }
  })
}

console.log('createInstance(' + path.basename(mdPath) + ')')
console.log('═'.repeat(60))
tree(inst)
