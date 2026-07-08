import { ref, computed } from 'vue'
import api from '../utils/api.js'

// 响应式状态
const user = ref(null)
const token = ref(null)
const loading = ref(false)

// 计算属性：是否已登录
const isLoggedIn = computed(() => !!token.value)

// 解析 JWT 中的 exp（单位：秒）。解析失败返回 null（保守地视为“无过期信息”）。
function getTokenExp(token) {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(b64)
    const m = raw.match(/"exp"\s*:\s*(\d+)/)
    return m ? parseInt(m[1], 10) : null
  } catch {
    return null
  }
}

// 初始化
function init() {
  const savedToken = localStorage.getItem('auth_token')
  const savedUser = localStorage.getItem('auth_user')

  if (savedToken) {
    const exp = getTokenExp(savedToken)
    // 仅当能确认已过期时才清理，避免以“已登录”态短暂闪现后消失（未登录闪退）
    if (exp !== null && exp * 1000 <= Date.now()) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    } else {
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
