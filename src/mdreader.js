// Markdown 代码块解析器 - 支持 json5/yaml/toml
import yaml from "js-yaml"
import toml from "toml"
import JSON5 from "json5"

// 插件注册表
const plugins = {}

/**
 * 注册自定义代码块处理器
 * @param {string} lang - 代码块语言名
 * @param {Function} handler - 处理函数，接收 (content, lang) 返回解析结果
 */
export const registerPlugin = (lang, handler) => {
  plugins[lang.toLowerCase()] = handler
}

// 提取 markdown frontmatter (YAML 头部)
export function extract_frontmatter(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!match) return {}

  try {
    return yaml.load(match[1]) || {}
  } catch (err) {
    console.warn('Frontmatter parse error:', err.message)
    return {}
  }
}

// 去掉 frontmatter 后的纯 markdown 内容
export function strip_frontmatter(markdown) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
}

export function extract_json(markdown) {
  const results = []

  const regex = /```[ \r\t]*(\w+)\s*\n([\s\S]*?)```/g
  let match

  while ((match = regex.exec(markdown)) !== null) {
    const lang = match[1].toLowerCase().trim()
    const content = match[2].trim()

    try {
      switch (lang) {
        case 'json':
        case 'json5':
          results.push({ lang, data: JSON5.parse(content) })
          break
        case 'yaml':
        case 'yml':
          results.push({ lang, data: yaml.load(content) })
          break
        case 'toml':
          results.push({ lang, data: toml.parse(content) })
          break
        default:
          // 检查插件
          if (plugins[lang]) {
            const result = plugins[lang](content, lang)
            if (result) results.push(result)
          }
          break
      }
    } catch (err) {
      console.warn(`Parse ${lang} error:`, err.message)
    }
  }

  return results
}

// 解析 package markdown，返回合并后的配置对象
export function parsePackage(markdown) {
  // 先提取 frontmatter
  // frontmatter有必要吗

  const frontmatter = extract_frontmatter(markdown)
  const cleanMarkdown = strip_frontmatter(markdown)
  const blocks = extract_json(cleanMarkdown)

  const pkg = {
    ...frontmatter, // 包含 name, icon, description 等
    env: {},
    actors: [],
    schemas: {},
    messages: {},
    ops: {},
    pipelines: {},
    roles: {},
  }

  for (const block of blocks) {
    if (!block) continue
    const { data } = block

    // 处理 is 标记
    const isSymbol=data.is
    delete data.is
    if (isSymbol === 'schemas') {
      Object.assign(pkg.schemas, data.data || data)
      delete pkg.is;
    } else if (isSymbol === 'messages') {
      Object.assign(pkg.messages, data.data || data)
    } else if (isSymbol === 'ops') {
      Object.assign(pkg.ops, data.data || data)
    } else if (isSymbol === 'pipelines') {
      Object.assign(pkg.pipelines, data.data || data)
    } else if (isSymbol === 'roles') {
      Object.assign(pkg.roles, data.data || data)
    } else if (isSymbol === 'env') {
      Object.assign(pkg.env, data.data || data)
    } else if (isSymbol === 'actors') {
      Object.assign(pkg.actors, data.data || data.actors)
    } else {
      Object.assign(pkg, data)
    }
  }

  return pkg
}
