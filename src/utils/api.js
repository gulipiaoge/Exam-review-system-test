// API 工具函数 - 支持错误处理和降级

// 自动检测 API 基础地址
function getBaseUrl() {
  // 如果是从 Cloudflare Pages 访问，使用同一个域名的 /api 路径
  // Pages Functions 会自动处理 /api/* 路由
  if (window.location.hostname !== 'localhost') {
    return '/api'
  }
  // 本地开发时使用 localhost:3000
  return 'http://localhost:3000/api'
}

const BASE_URL = getBaseUrl()

// 延迟导入避免循环依赖和初始化顺序问题
function getAuthStore() {
  try {
    const { useAuthStore } = require('../store/auth') || {}
    if (useAuthStore) return useAuthStore()
  } catch(e) { /* ignore */ }
  // fallback: 直接从localStorage读
  return { token: localStorage.getItem('auth_token') || '' }
}

async function request(url, options = {}) {
  let authToken = ''
  try {
    // 动态import避免循环依赖
    const { useAuthStore: _useAuth } = await import('../store/auth.js')
    const authStore = _useAuth()
    authToken = authStore.token || ''
  } catch(e) {
    authToken = localStorage.getItem('auth_token') || ''
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  // 添加 token 到请求头
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  try {
    const fullUrl = `${BASE_URL}${url}`
    console.log(`[API] ${options.method || 'GET'} ${fullUrl}`, authToken ? '[有token]' : '[无token]')

    const response = await fetch(fullUrl, {
      ...options,
      headers
    })

    const data = await response.json()
    console.log(`[API] 响应 ${fullUrl}:`, typeof data, Array.isArray(data.questions) ? `questions=${data.questions.length}` : data.error || data.code || JSON.stringify(data).slice(0,200))

    // 如果 token 过期或无效，自动登出
    if (data.code === 401 || (data.error && data.error.includes('未登录'))) {
      console.warn('[API] Token无效，清除登录状态')
      try {
        const { useAuthStore: _useAuth2 } = await import('../store/auth.js')
        _useAuth2().logout()
      } catch(e) {
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_token')
      }
      window.location.href = '/login'
      return data
    }

    return data
  } catch (error) {
    console.warn('[API] 请求失败:', url, error.message)
    // 返回空结果而不是抛出异常，让页面可以继续渲染
    return { code: 0, message: '网络连接失败', data: null }
  }
}

export default {
  get(url) {
    return request(url, { method: 'GET' })
  },
  post(url, body) {
    return request(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },
  put(url, body) {
    return request(url, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },
  delete(url) {
    return request(url, { method: 'DELETE' })
  },

  // 检查后端是否可用
  async checkHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`, { timeout: 3000 })
      return res.ok
    } catch {
      return false
    }
  },

  // 获取当前 API 地址
  get baseUrl() {
    return BASE_URL
  }
}
