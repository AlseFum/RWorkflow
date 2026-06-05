// Markdown 代码块解析器 - 支持 json5/yaml/toml 及自定义插件
import yaml from "js-yaml"
import toml from "toml"
import JSON5 from "json5"

// 插件注册表
const plugins = {}

/**
 * 注册自定义代码块处理器
 * @param {string} lang - 代码块语言名
 * @param {Function} handler - 处理函数，接收 (content, lang, params) 返回解析结果
 */
export const usePlugin = (lang, handler) => {
  plugins[lang.toLowerCase()] = handler
}

// 缓存存储（模块级，可被所有实例共享）
const cacheStore = new Map()

/**
 * 提取语言后的参数（简单按空白分割）
 * @param {string} paramStr - 如 " -a -b --verbose"
 * @returns {string[]} 参数数组
 */
function parseParams(paramStr) {
  if (!paramStr) return []
  // 按空白字符分割，过滤空字符串
  return paramStr.trim().split(/\s+/)
}

/**
 * 纯解析：提取 frontmatter + 代码块
 * @param {string} markdown
 * @param {Object} options
 * @param {boolean} [options.useCache=false] - 是否启用缓存
 * @param {Function} [options.onError] - 错误回调 (err, lang, content, params)
 * @returns {{ [key: string]: any, blocks: any[] }}
 */
export function parsePackage(markdown, options = {}) {
  const { useCache = false, onError } = options
  const defaultOnError = (err, lang, content, params) => {
    console.error(`Parse error in ${lang} block${params.length ? ` (params: ${params.join(' ')})` : ''}:`, err.message)
  }
  const errorHandler = onError || defaultOnError

  if (useCache && cacheStore.has(markdown)) {
    return cacheStore.get(markdown)
  }

  // 1. 抽掉 frontmatter
  const fmMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  const body = fmMatch ? markdown.slice(fmMatch[0].length) : markdown

  // 2. frontmatter yaml 解析
  let frontmatter = {}
  if (fmMatch) {
    try {
      frontmatter = yaml.load(fmMatch[1]) || {}
    } catch (err) {
      errorHandler(err, 'frontmatter', fmMatch[1], [])
    }
  }

  // 3. 提取代码块（支持语言后的参数）
  const blocks = []
  // 正则分组: 1: lang, 2: 可选参数字符串, 3: 内容
  const codeRe = /```[ \t]*(\w+)([ \t]+[^\n]*)?\s*\n([\s\S]*?)```/g
  let match

  while ((match = codeRe.exec(body)) !== null) {
    const lang = match[1].toLowerCase().trim()
    const paramStr = match[2] || ''
    const params = parseParams(paramStr)
    let content = match[3]  // 不 trim，保留代码块原样缩进供 yaml block scalar 使用

    try {
      let data
      // 根据语言选择解析器，同时传递 params（内置解析器忽略 params）
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
            // 插件处理器可接收三个参数：content, lang, params
            data = plugins[lang](content, lang, params)
          }
          break
      }

      if (data !== undefined) {
        // 可以将参数也存到每个 block 的元数据中（可选）
        blocks.push(data)
      }
    } catch (err) {
      errorHandler(err, lang, content, params)
    }
  }

  const result = { ...frontmatter, blocks }
  if (useCache) {
    cacheStore.set(markdown, result)
  }
  return result
}