import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'

// 全局错误处理器 - 捕获并日志记录运行时错误
window.addEventListener('error', (event) => {
  console.error('[全局错误]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  })
  
  // 如果是 themeColors 或 filter 相关错误，提供更多信息
  if (event.message.includes('themeColors') || event.message.includes('filter')) {
    console.warn('[提示] 检测到主题或数组处理错误，已添加防御性检查')
  }
})

// 全局 Promise 错误处理器
window.addEventListener('unhandledrejection', (event) => {
  console.error('[未处理的Promise错误]', event.reason)
})

// ─── KaTeX 全局渲染系统 ──────────────────────────────
import katex from 'katex'
import 'katex/dist/katex.min.css'

// 将 renderMathInElement 挂载到 window（供工具函数和指令使用）
window.renderMathInElement = (el, opts) => {
  if (!el) return
  try {
    // 使用 katex 自带的渲染方法
    const delimiters = (opts && opts.delimiters) || [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
    ]
    katex.renderMathInElement(el, {
      throwOnError: false,
      strict: false,
      errorColor: '#cc0000',
      ...opts,
      delimiters,
    })
  } catch (e) {
    console.warn('[KaTeX] renderMathInElement 失败:', e.message)
  }
}

// 注册 v-katex 全局指令
import katexDirective from './directives/katex.js'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 注册全局指令
app.directive('katex', katexDirective)

app.mount('#app')

// PWA: 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[PWA] SW registered:', reg.scope)
    }).catch((err) => {
      console.warn('[PWA] SW registration failed:', err)
    })
  })
}
