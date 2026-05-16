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
export const usePlugin = (lang, handler) => {
  plugins[lang.toLowerCase()] = handler
}

/**
 * 纯解析：提取 frontmatter + 代码块
 * @param {string} markdown
 * @returns {{ [key: string]: any, blocks: { lang: string, data: object, is: string|null }[] }}
 */
export function parsePackage(markdown) {
  // 1. 抽掉 frontmatter
  const fmMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  const body = fmMatch ? markdown.slice(fmMatch[0].length) : markdown

  // 2. frontmatter yaml 解析
  let frontmatter = {}
  if (fmMatch) {
    try {
      frontmatter = yaml.load(fmMatch[1]) || {}
    } catch (err) {
      console.warn('Frontmatter parse error:', err.message)
    }
  }

  // 3. 提取代码块
  const blocks = []
  const codeRe = /```[ \r\t]*(\w+)\s*\n([\s\S]*?)```/g
  let match

  while ((match = codeRe.exec(body)) !== null) {
    const lang = match[1].toLowerCase().trim()
    const content = match[2].trim()

    try {
      let data
      switch (lang) {
        case 'json':
        case 'json5':
          data = JSON5.parse(content)
          break
        case 'yaml':
        case 'yml':
          data = yaml.load(content)
          break
        case 'toml':
          data = toml.parse(content)
          break
        default:
          if (plugins[lang]) {
            data = plugins[lang](content, lang)
          }
          break
      }

      if (data !== undefined) {
        blocks.push({ lang, data, is: data?.is ?? null })
      }
    } catch (err) {
      console.warn(`Parse ${lang} error:`, err.message)
    }
  }

  return { ...frontmatter, blocks }
}
