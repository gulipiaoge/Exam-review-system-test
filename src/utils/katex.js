/**
 * KaTeX 公式渲染工具
 * 统一管理全系统的 LaTeX 公式渲染
 */
import katex from 'katex'
import 'katex/dist/katex.min.css'

// 渲染行内公式（$...$ 或 \(...\)）
export function renderInline(latex) {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: 'html'
    })
  } catch (e) {
    console.warn('[KaTeX] 行内公式渲染失败:', latex, e.message)
    return latex
  }
}

// 渲染块级公式（$$...$$ 或 \[...\]）
export function renderBlock(latex) {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: 'html'
    })
  } catch (e) {
    console.warn('[KaTeX] 块级公式渲染失败:', latex, e.message)
    return latex
  }
}

/**
 * 渲染文本中的全部公式
 * 支持分隔符：$...$（行内）、$$...$$（块级）、\(...\)（行内）、\[...\]（块级）
 * @param {string} text - 包含 LaTeX 公式的文本
 * @returns {string} 渲染后的 HTML
 */
export function renderMath(text) {
  if (!text) return text || ''

  let result = text

  // 先处理块级公式 $$...$$ 和 \[...\]
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    return renderBlock(latex.trim())
  })
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => {
    return renderBlock(latex.trim())
  })

  // 再处理行内公式 $...$ 和 \(...\)
  // 注意：避免匹配已经被渲染的块级公式
  result = result.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, latex) => {
    return renderInline(latex.trim())
  })
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => {
    return renderInline(latex.trim())
  })

  return result
}

/**
 * Vue 自定义指令：v-katex
 * 用于在模板中直接渲染公式
 * 用法：<div v-katex="'E=mc^2'"></div>
 * 或：<div v-katex="rawText"></div>
 */
export const vKatex = {
  mounted(el, binding) {
    el.innerHTML = renderMath(binding.value)
  },
  updated(el, binding) {
    el.innerHTML = renderMath(binding.value)
  }
}

/**
 * 防乱码处理：确保封闭的公式分隔符不缺失
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeLatex(text) {
  if (!text) return text
  // 补全未闭合的 $...$ 或 $$...$$
  let result = text
  // 检查 $$ 是否成对
  const doubleDollar = result.match(/\$\$/g)
  if (doubleDollar && doubleDollar.length % 2 !== 0) {
    result += '$$'
  }
  // 检查 $ 是否成对（排除 $$ 的匹配）
  const singleDollar = result.match(/(?<!\$)\$(?!\$)/g)
  if (singleDollar && singleDollar.length % 2 !== 0) {
    result += '$'
  }
  return result
}
