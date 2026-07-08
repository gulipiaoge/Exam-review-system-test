// API 工具函数 - 支持错误处理和降级

// 自动检测 API 基础地址
function getBaseUrl() {
  if (window.location.hostname !== 'localhost') {
    return '/api'
  }
  return 'http://localhost:3000/api'
}

const BASE_URL = getBaseUrl()

// ── 401 全局防抖：多个并发请求同时收到 401 时，只执行一次登出跳转 ──
let _handling401 = false

async function request(url, options = {}) {
  let authToken = ''
  try {
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

    // ── 401 处理（带全局防抖，避免并发请求重复登出）──
    if (data.code === 401 || (data.error && data.error.includes('未登录'))) {
      const isLoginRequest = url.includes('/auth/login')
      if (!isLoginRequest && !_handling401) {
        _handling401 = true
        console.warn('[API] Token无效，清除登录状态（防抖已激活）')
        try {
          const { useAuthStore: _useAuth2 } = await import('../store/auth.js')
          _useAuth2().logout()
        } catch(e) {
          localStorage.removeItem('auth_user')
          localStorage.removeItem('auth_token')
        }
        // 使用 replace 而非 href，避免浏览器历史堆积
        window.location.replace('/login')
      }
      return data
    }

    return data
  } catch (error) {
    console.warn('[API] 请求失败:', url, error.message)
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

  // 登录成功后重置 401 防抖标志（供 auth.login 调用）
  reset401Guard() {
    _handling401 = false
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
