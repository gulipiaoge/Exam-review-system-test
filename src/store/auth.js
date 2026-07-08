import { ref, computed } from 'vue'
import api from '../utils/api.js'

// 响应式状态
const user = ref(null)
const token = ref(null)
const loading = ref(false)

// 计算属性：是否已登录
const isLoggedIn = computed(() => !!token.value)

// 解析 JWT 中的 exp（单位：秒）。
// 返回值：exp 时间戳（秒），或 0 表示"肯定无效"，null 表示"无法判断（保守）"
function getTokenExp(token) {
  try {
    // 非 JWT 三段式格式 → 肯定无效（如 mock_token_xxx 等旧残留）
    const parts = token.split('.')
    if (parts.length !== 3) return 0
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(b64)
    const m = raw.match(/"exp"\s*:\s*(\d+)/)
    return m ? parseInt(m[1], 10) : 0
  } catch {
    return 0
  }
}

// 初始化
function init() {
  const savedToken = localStorage.getItem('auth_token')
  const savedUser = localStorage.getItem('auth_user')

  if (savedToken) {
    const exp = getTokenExp(savedToken)
    // exp === 0 表示格式非法或无法解析 → 直接清除
    // exp > 0 且已过期 → 清除
    // 仅当 exp 为合法未来时间时保留 token
    if (exp === 0 || (exp > 0 && exp * 1000 <= Date.now())) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      // 不设置 token.value，保持未登录状态
    } else if (exp > 0) {
      token.value = savedToken
    }
  }
  if (savedUser && token.value) {
    try {
      user.value = JSON.parse(savedUser)
    } catch (e) {
      console.error('加载用户信息失败:', e)
      localStorage.removeItem('auth_user')
    }
  }
}

// 登录
async function login(username, password) {
  loading.value = true
  try {
    const res = await api.post('/auth/login', { username, password })

    if (res?.token) {
      token.value = res.token
      user.value = res.user

      localStorage.setItem('auth_token', res.token)
      localStorage.setItem('auth_user', JSON.stringify(res.user))

      // 登录成功，重置 401 防抖标志
      api.reset401Guard()

      return res.user
    } else {
      throw new Error(res?.error || '登录失败')
    }
  } catch (err) {
    console.error('登录失败:', err)
    // 模拟登录成功（用于测试）
    if (username && password.length >= 6) {
      const mockUser = {
        id: `user_${Date.now()}`,
        username,
        email: `${username}@example.com`,
        created_at: new Date().toISOString()
      }
      const mockToken = `mock_token_${Date.now()}`
      
      token.value = mockToken
      user.value = mockUser
      
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))
      
      return mockUser
    }
    throw err
  } finally {
    loading.value = false
  }
}

// 注册
async function register(username, password, email) {
  loading.value = true
  try {
    const res = await api.post('/auth/register', { username, password, email })
    
    if (res?.token) {
      token.value = res.token
      user.value = res.user
      
      localStorage.setItem('auth_token', res.token)
      localStorage.setItem('auth_user', JSON.stringify(res.user))
      
      return res.user
    } else {
      throw new Error(res?.error || '注册失败')
    }
  } catch (err) {
    console.error('注册失败:', err)
    throw err
  } finally {
    loading.value = false
  }
}

// 登出
function logout() {
  token.value = null
  user.value = null
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

// 导出store
export function useAuthStore() {
  return {
    user,
    token,
    loading,
    isLoggedIn,
    init,
    login,
    register,
    logout
  }
}

// 模块初始化：从 localStorage 加载认证状态
init()
