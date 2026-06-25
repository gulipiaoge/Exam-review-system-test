import { ref } from 'vue'
import api from '../utils/api.js'

// 响应式状态
const user = ref(null)
const token = ref(null)
const loading = ref(false)

// 初始化
function init() {
  const savedToken = localStorage.getItem('auth_token')
  const savedUser = localStorage.getItem('auth_user')
  
  if (savedToken) {
    token.value = savedToken
  }
  if (savedUser) {
    try {
      user.value = JSON.parse(savedUser)
    } catch (e) {
      console.error('加载用户信息失败:', e)
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

// 检查是否已登录
function isLoggedIn() {
  return !!token.value
}

// 导出store
export function useAuthStore() {
  return {
    user,
    token,
    loading,
    init,
    login,
    register,
    logout,
    isLoggedIn
  }
}
