/**
 * v-katex 自定义指令
 *
 * 用法：
 *   <div v-katex>公式 $x^2$ 内容</div>
 *   <div v-katex="{ displayMode: true, delay: 100 }">块级 $$...$$</div>
 *
 * 功能：
 * - 元素插入 DOM 后自动调用 renderMathInElement
 * - 支持选项覆盖（delimiters、displayMode 等）
 * - 支持 delay 延迟渲染（适用于动画/过渡后）
 * - 自动防闪现（初始 visibility:hidden -> 渲染后 visible）
 */
import { renderMath, renderMathAsync } from '@/utils/renderMath'

const KatexDirective = {
  mounted(el, binding) {
    const opts = binding.value || {}
    const delay = opts.delay || 0

    // 防闪现：初始隐藏
    if (opts.preventFlash !== false) {
      el.style.visibility = 'hidden'
    }

    // 渲染完成后显示
    const show = () => {
      if (opts.preventFlash !== false) {
        el.style.visibility = 'visible'
        el.classList.add('katex-rendered')
      }
    }

    if (delay > 0) {
      setTimeout(() => {
        renderMath(el, opts)
        show()
      }, delay)
    } else {
      // 双 rAF 确保 DOM 完全稳定
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          renderMath(el, opts)
          show()
        })
      })
    }

    // 保存清理函数
    el._katexCleanup = { show }
  },

  updated(el, binding) {
    // 内容更新时重新渲染（如 v-html 动态内容）
    const opts = binding.value || {}
    requestAnimationFrame(() => {
      renderMath(el, opts)
    })
  },

  unmounted(el) {
    // 清理引用
    if (el._katexCleanup) {
      delete el._katexCleanup
    }
  },
}

export default KatexDirective
