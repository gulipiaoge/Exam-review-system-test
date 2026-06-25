const CACHE_NAME = 'smart-exam-v3'

// 安装：跳过等待，立即激活
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// 激活：清理所有旧版本缓存（v1, v2等）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // 删除所有非当前版本的缓存，确保总是获取最新资源
          console.log('[SW] Deleting old cache:', key)
          return caches.delete(key)
        })
      )
    })
  )
  self.clients.claim()
})

// 拦截请求：仅缓存静态资源（图片、字体），不缓存 HTML/JS/CSS
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // 不缓存的资源类型：始终从网络获取最新版本
  // - HTML 文件（index.html）
  // - JavaScript 文件 (.js)
  // - CSS 样式文件 (.css)
  // - API 请求 (/api/)
  // - Cloudflare Workers 资源
  const shouldNotCache =
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/api/') ||
    url.pathname.startsWith('/assets/')

  if (shouldNotCache) {
    // 这些资源始终走网络，确保获取最新版本
    return
  }

  // 只缓存图片和字体等静态资源
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response
        }
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('离线模式：资源不可用', { status: 503 })
        })
      })
  )
})
