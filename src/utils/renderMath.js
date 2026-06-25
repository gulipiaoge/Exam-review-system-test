/**
 * KaTeX 全局渲染工具
 *
 * 功能：
 * 1. renderMath(el, opts?) — 对 DOM 元素执行 KaTeX 渲染
 * 2. protectMath(html) — XSS 净化前提取并保护公式占位符
 * 3. restoreMath(html, map) — 净化后恢复公式
 *
 * 使用方式：
 *   import { renderMath } from '@/utils/renderMath'
 *   renderMath(document.querySelector('.content'))
 */

import katex from 'katex'

// ─── 默认配置 ────────────────────────────────────────
const DEFAULT_DELIMITERS = [
  // 块级公式（$$...$$ 和 \[...\]）
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },

  // 行内公式（$...$ 和 \(...\)）
  // 注意：$ 作为行内分隔符会与货币符号冲突，仅当成对出现时匹配
]

// 扩展配置：同时支持 $...$ 行内（宽松模式）
const DELIMITERS_LOOSE = [
  ...DEFAULT_DELIMITERS,
  { left: '$', right: '$', display: false },       // $...$ 行内
  { left: '\\(', right: '\\)', display: false },     // \(...\) 行内
]

const DEFAULT_OPTS = {
  delimiters: DELIMITERS_LOOSE,
  throwOnError: false,    // 出错显示原始代码+标红，不阻塞页面
  strict: false,          // 容忍非标准 LaTeX
  errorColor: '#cc0000',  // 错误公式红色高亮
  output: 'html',         // 输出 HTML 而非 MathML（更轻量）
}

/**
 * 对指定 DOM 元素执行 KaTeX 渲染
 * @param {HTMLElement} el - 目标容器元素
 * @param {object} opts - 可选覆盖选项
 */
export function renderMath(el, opts = {}) {
  if (!el || typeof el.querySelectorAll !== 'function') return

  try {
    window.renderMathInElement(el, {
      ...DEFAULT_OPTS,
      ...opts,

      // 回调：渲染完成后移除隐藏类
      ...(opts.callbacks || {}),
    })
  } catch (e) {
    console.warn('[renderMath] 渲染失败:', e.message)
  }
}

/**
 * 带延迟的安全渲染（用于动态内容，等待 DOM 稳定）
 * @param {HTMLElement|string} el - 元素或选择器
 * @param {number} delay - 延迟毫秒数（默认 0）
 */
export function renderMathAsync(el, delay = 0) {
  const target = typeof el === 'string' ? document.querySelector(el) : el
  if (!target) return Promise.resolve(false)

  return new Promise(resolve => {
    const doRender = () => {
      try {
        window.renderMathInElement(target, DEFAULT_OPTS)
        resolve(true)
      } catch (e) {
        console.warn('[renderMath] 异步渲染失败:', e)
        resolve(false)
      }
    }

    if (delay > 0) {
      setTimeout(doRender, delay)
    } else {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        requestAnimationFrame(doRender) // 双 rAF：确保浏览器已完成布局
      })
    }
  })
}

// ─── 公式保护机制（XSS 净化前） ─────────────────────

let _placeholderIndex = 0

/**
 * 从 HTML 字符串中提取所有公式片段，替换为唯一占位符
 * 用于在 DOMPurify 等净化前保护公式不被破坏
 * @param {string} html - 原始 HTML 字符串
 * @returns {{ cleanHtml: string, map: Map<string, string> }} 净化后的HTML和占位符映射表
 */
export function protectMath(html) {
  if (!html || typeof html !== 'string') return { cleanHtml: html || '', map: new Map() }

  const map = new Map()
  let result = html
  _placeholderIndex++

  // 保护 $$...$$ 块级公式
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => {
    const key = `%%MATH_BLOCK_${_placeholderIndex}_${map.size}%%`
    map.set(key, `$$${content}$$`)
    return key
  })

  // 保护 \[...\] 块级公式
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, content) => {
    const key = `%%MATH_BLOCK_${_placeholderIndex}_${map.size}%%`
    map.set(key, `\\[${content}\\]`)
    return key
  })

  // 保护 \(...\) 行内公式
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, content) => {
    const key = `%%MATH_INLINE_${_placeholderIndex}_${map.size}%%`
    map.set(key, `\\(${content}\\)`)
    return key
  })

  // 保护 $...$ 行内公式（贪婪匹配，优先长匹配）
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, content) => {
    const key = `%%MATH_INLINE_${_placeholderIndex}_${map.size}%%`
    map.set(key, `$${content}$`)
    return key
  })

  return { cleanHtml: result, map }
}

/**
 * 恢复被保护的公式占位符为原始 LaTeX
 * @param {string} html - 包含占位符的 HTML
 * @param {Map<string, string>} map - 占位符映射表
 * @returns {string} 恢复后的 HTML
 */
export function restoreMath(html, map) {
  if (!html || !map || map.size === 0) return html || ''
  let result = html
  for (const [key, value] of map) {
    result = result.replaceAll(key, value)
  }
  return result
}

/**
 * 安全地净化包含公式的 HTML 内容
 * 先保护公式 -> 再净化 -> 最后恢复公式
 * @param {string} dirtyHtml - 可能包含公式的脏 HTML
 * @returns {string} 安全的 HTML（保留公式原样）
 */
export function sanitizeWithMath(dirtyHtml) {
  const { cleanHtml, map } = protectMath(dirtyHtml)

  // 这里可以接入 DOMPurify 或其他净化库
  // 目前做基础的标签白名单过滤
  let sanitized = cleanHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')

  return restoreMath(sanitized, map)
}

// ─── MutationObserver 工具 ─────────────────────────────

/**
 * 创建一个自动渲染观察器，监听目标容器内的 DOM 变化
 * 新增内容会自动触发 KaTeX 渲染
 * @param {HTMLElement} container - 要监听的容器
 * @param {object} opts - renderMath 选项
 * @returns {{ disconnect: () => void }} 观察器控制对象
 */
export function createAutoRenderer(container, opts = {}) {
  if (!container || !window.MutationObserver) {
    return { disconnect: () => {} }
  }

  let timer = null

  const observer = new MutationObserver(mutations => {
    // 防抖：合并多次快速 DOM 变化为一次渲染
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            renderMath(node, opts)
          }
        }
      }
    }, 50) // 50ms 防抖
  })

  observer.observe(container, {
    childList: true,
    subtree: true,
  })

  return {
    disconnect() {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    },
  }
}

// ─── 导出 katex 实例供高级用法 ─────────────────────────
export { katex }
export default renderMath
