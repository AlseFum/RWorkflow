#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const ROOT = path.dirname(new URL(import.meta.url).pathname)
const INDEX_JS = path.join(ROOT, 'compiled.js')

let line = 1
function write(str) {
  line += str.split('\n').length
  return str + '\n'
}

function parseFrontmatter(md) {
  const name = md.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  const icon = md.match(/^icon:\s*(.+)$/m)?.[1]?.trim()
  const description = md.match(/^description:\s*(.+)$/m)?.[1]?.trim()
  return { name, icon, description }
}

function inlineMarkdown(mdPath, visited = new Set()) {
  if (visited.has(mdPath)) return ''
  visited.add(mdPath)

  const dir = path.dirname(mdPath)
  const raw = fs.readFileSync(mdPath, 'utf8')

  return raw.replace(
    /\[#include\]\((\.\/[^)]+\.md)\)/g,
    (_, relPath) => {
      const target = path.resolve(dir, relPath)
      if (!fs.existsSync(target)) return `[MISSING: ${relPath}]`
      return inlineMarkdown(target, visited)
    }
  )
}

function escapeJsTemplate(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
}

// ================== 构建 ==================

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.md'))

const presets = []
let output = ''

// ---- 第一次扫描：只收集 TOC ----
for (const file of files) {
  const abs = path.join(ROOT, file)
  const md = fs.readFileSync(abs, 'utf8')
  const meta = parseFrontmatter(md)

  if (!meta.name) continue

  presets.push({
    key: path.basename(file, '.md'),
    name: meta.name,
    hasInline: /\[.*?\]\(\.\/[^)]+\.md\)/.test(md)
  })
}

// ---- 写 TOC（此时 line 从 1 开始） ----
output += write('/**')
output += write(' * 📚 Presets TOC')
output += write(' *')

for (const p of presets) {
  const flag = p.hasInline ? ' [+inline]' : ''
  output += write(` * - ${p.key.padEnd(18)}${flag} → ${p.name}`)
}

output += write(' */')
output += write('')

// ---- 真正生成 presets ----
output += write('export const presets = {}\n')

for (const file of files) {
  const abs = path.join(ROOT, file)
  const md = fs.readFileSync(abs, 'utf8')
  const meta = parseFrontmatter(md)

  if (!meta.name) continue

  const key = path.basename(file, '.md')

  output += write(`presets['${key}'] = {`)
  output += write(`  name: '${meta.name}',`)
  output += write(`  icon: '${meta.icon ?? ''}',`)
  output += write(`  description: '${meta.description ?? ''}',`)
  output += write(`}`)

  const content = inlineMarkdown(abs)
  output += write(`presets['${key}'].md = \``)
  output += write(escapeJsTemplate(content))
  output += write('`\n')
}

fs.writeFileSync(INDEX_JS, output)
console.log(`✅ index.js generated`)