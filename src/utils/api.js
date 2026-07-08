// API 工具函数 - 支持错误处理和降级

// 自动检测 API 基础地址
function getBaseUrl() {
  if (window.location.hostname !== 'localhost') {
    return '/api'
  }
  return 'http://localhost:3000/api'
}

const BASE_URL = getBaseUrl()

// ── 401 全局防抖：多个并发请求同时收到"认证失败类"401 时，只执行一次登出跳转 ──
let _handling401 = false

// 判定某个 URL 的 401 是否属于"认证失效"（应触发登出）还是"数据接口异常"（仅返回错误）
function isAuthCriticalUrl(url) {
  // /auth/* 路径的 401 = token 确实无效 → 触发登出
  // 其他路径（/questions、/exam/*、/ai/* 等）的 401 = 该接口暂时不可用，不杀会话
  return url.startsWith('/auth/') || url === '/auth/me'
}

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

    // ── 401 处理（区分认证接口 vs 数据接口）──
    if (data.code === 401 || (data.error && data.error.includes('未登录'))) {
      // 登录接口本身的 401（密码错等）→ 绝不触发登出
      const isLoginRequest = url.includes('/auth/login')
      if (isLoginRequest) {
        return data
      }

      // 仅认证关键接口（/auth/*）的 401 才触发登出跳转
      // 数据接口（/exam/*、/ai/*、/questions 等）返回 401 时只打日志、不杀会话
      if (isAuthCriticalUrl(url) && !_handling401) {
        _handling401 = true
        console.warn('[API] 认证接口返回401，清除登录状态（防抖已激活）:', fullUrl)
        try {
          const { useAuthStore: _useAuth2 } = await import('../store/auth.js')
          _useAuth2().logout()
        } catch(e) {
          localStorage.removeItem('auth_user')
          localStorage.removeItem('auth_token')
        }
        window.location.replace('/login')
      } else if (!isAuthCriticalUrl(url)) {
        // 数据接口 401：仅警告，不破坏会话
        console.warn('[API] 数据接口返回401（不触发登出）:', fullUrl, data.error)
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
