<template>
  <div class="login-page">
    <!-- 居中悬浮卡片 -->
    <div class="login-card">
      <!-- 左侧品牌区 -->
      <div class="card-left">
        <div class="left-content">
          <!-- Logo 图标 -->
          <div class="logo-icon">
            <span class="logo-inner"></span>
          </div>
          <h1 class="brand-title">智能备考系统</h1>
          <p class="brand-subtitle">AI 驱动的智能学习平台</p>
          <p class="brand-subtitle">精准诊断薄弱环节，高效提升考试成绩</p>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="card-right">
        <div class="right-content">
          <!-- 头部 -->
          <div class="form-header">
            <h2 class="form-title">{{ activeTab === 'login' ? '欢迎回来' : '创建账号' }}</h2>
            <p class="form-desc">{{ activeTab === 'login' ? '登录你的账号开始学习之旅' : '注册新账号开始备考之旅' }}</p>
          </div>

          <!-- Tab 切换（下划线风格） -->
          <div class="tab-switch">
            <button
              :class="['tab-item', { active: activeTab === 'login' }]"
              @click="activeTab = 'login'"
            >登录</button>
            <button
              :class="['tab-item', { active: activeTab === 'register' }]"
              @click="activeTab = 'register'"
            >注册</button>
          </div>

          <!-- 登录表单 -->
          <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="login-form">
            <div class="form-field">
              <label class="field-label">用户名</label>
              <input
                v-model="loginForm.username"
                type="text"
                class="field-input"
                @keyup.enter="handleLogin"
              />
            </div>
            <div class="form-field">
              <label class="field-label">密码</label>
              <input
                v-model="loginForm.password"
                type="password"
                class="field-input"
                @keyup.enter="handleLogin"
              />
            </div>

            <!-- 记住登录 + 忘记密码 -->
            <div class="form-options">
              <label class="remember-me">
                <input type="checkbox" v-model="rememberMe" />
                <span>记住登录</span>
              </label>
              <a href="#" class="forgot-link" @click.prevent="ElMessage.info('请联系管理员重置密码')">忘记密码?</a>
            </div>

            <!-- 登录按钮 -->
            <button type="submit" class="btn-login" :disabled="loading">
              {{ loading ? '登录中...' : '登 录' }}
            </button>

            <!-- 注册引导 -->
            <p class="switch-text">
              还没有账号？
              <a href="#" @click.prevent="activeTab = 'register'">立即注册</a>
            </p>
          </form>

          <!-- 注册表单 -->
          <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="login-form">
            <div class="form-field">
              <label class="field-label">用户名</label>
              <input v-model="registerForm.username" type="text" class="field-input" />
            </div>
            <div class="form-field">
              <label class="field-label">姓名（可选）</label>
              <input v-model="registerForm.name" type="text" class="field-input" />
            </div>
            <div class="form-field">
              <label class="field-label">密码</label>
              <input v-model="registerForm.password" type="password" class="field-input" />
            </div>
            <div class="form-field">
              <label class="field-label">确认密码</label>
              <input v-model="registerForm.confirmPassword" type="password" class="field-input" />
            </div>

            <button type="submit" class="btn-login" :disabled="loading">
              {{ loading ? '注册中...' : '注 册' }}
            </button>

            <p class="switch-text">
              已有账号？
              <a href="#" @click.prevent="activeTab = 'login'">立即登录</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()
const activeTab = ref('login')
const loading = ref(false)
const rememberMe = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', name: '', password: '', confirmPassword: '' })

function handleLogin() {
  if (!loginForm.username.trim()) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (!loginForm.password) {
    ElMessage.warning('请输入密码')
    return
  }
  loading.value = true
  auth.login(loginForm.username, loginForm.password).then(res => {
    if (res.code === 200) {
      ElMessage.success('欢迎回来！')
      router.push('/')
    } else {
      ElMessage.error(res.message || res.error || '登录失败，请检查账号和密码')
    }
    loading.value = false
  }).catch((err) => {
    const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || '网络错误，请稍后重试'
    ElMessage.error(errorMsg)
    loading.value = false
  })
}

function handleRegister() {
  if (!registerForm.username.trim()) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (registerForm.username.length < 3 || registerForm.username.length > 20) {
    ElMessage.warning('账号长度应为3-20位')
    return
  }
  if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
    ElMessage.warning('账号只能包含字母、数字和下划线')
    return
  }
  if (!registerForm.password) {
    ElMessage.warning('请输入密码')
    return
  }
  if (registerForm.password.length < 6) {
    ElMessage.warning('密码至少6位')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.error('两次密码不一致')
    return
  }
  loading.value = true
  auth.register(registerForm.username, registerForm.password, registerForm.name).then(res => {
    if (res.code === 200) {
      ElMessage.success('注册成功！即将进入')
      router.push('/')
    } else {
      if (res.message && (res.message.includes('已存在') || res.message.includes('已被注册') || res.message.includes('已注册'))) {
        ElMessage.error('该账号ID已被注册，请换一个试试')
      } else {
        ElMessage.error(res.message || '注册失败')
      }
    }
    loading.value = false
  }).catch(() => {
    ElMessage.error('网络错误，请稍后重试')
    loading.value = false
  })
}
</script>

<style scoped>
/* ===== 页面外层：浅蓝渐变背景 ===== */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 30%, #eff6ff 60%, #f0fdf4 100%);
  padding: 24px;
}

/* ===== 居中悬浮圆角卡片 ===== */
.login-card {
  display: flex;
  width: 900px;
  max-width: 95vw;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.12), 0 10px 30px rgba(0, 0, 0, 0.08);
  background: #fff;
}

/* ===== 左侧深绿色区块 ===== */
.card-left {
  width: 380px;
  flex-shrink: 0;
  background: linear-gradient(160deg, #059669 0%, #047857 50%, #065f46 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  position: relative;
  overflow: hidden;
}
.card-left::before {
  content: '';
  position: absolute;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  top: -80px; right: -80px;
}
.card-left::after {
  content: '';
  position: absolute;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  bottom: -40px; left: -40px;
}

.left-content {
  position: relative;
  z-index: 1;
  color: #fff;
  text-align: center;
}

/* Logo 彩色图标 */
.logo-icon {
  width: 64px; height: 64px;
  margin: 0 auto 24px;
  border-radius: 14px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
}
.logo-inner {
  width: 54px; height: 54px;
  border-radius: 11px;
  background: linear-gradient(135deg, #34d399 0%, #10b981 35%, #3b82f6 65%, #8b5cf6 100%);
  display: block;
}

.brand-title {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 12px;
  letter-spacing: 1px;
  line-height: 1.3;
}
.brand-subtitle {
  font-size: 13.5px;
  opacity: 0.85;
  margin: 0 0 6px;
  line-height: 1.7;
}

/* ===== 右侧白色表单区 ===== */
.card-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 48px 44px;
}
.right-content {
  width: 100%;
  max-width: 360px;
}

.form-header {
  margin-bottom: 28px;
}
.form-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 6px;
}
.form-desc {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

/* ===== Tab 下划线风格切换 ===== */
.tab-switch {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 28px;
}
.tab-item {
  position: relative;
  padding: 0 0 12px;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.25s;
}
.tab-item:hover {
  color: #374151;
}
.tab-item.active {
  color: #10b981;
  font-weight: 600;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2.5px;
  background: #10b981;
  border-radius: 2px;
}

/* ===== 表单字段 ===== */
.login-form {
  display: flex;
  flex-direction: column;
}
.form-field {
  margin-bottom: 18px;
}
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}
.field-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #fafafa;
  transition: all 0.25s;
  outline: none;
  box-sizing: border-box;
}
.field-input::placeholder {
  color: #c4c9cf;
}
.field-input:focus {
  border-color: #10b981;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
}

/* ===== 记住登录 + 忘记密码 同行 ===== */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.remember-me {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
}
.remember-me input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: #10b981;
  cursor: pointer;
}
.forgot-link {
  font-size: 13px;
  color: #10b981;
  text-decoration: none;
  font-weight: 500;
}
.forgot-link:hover {
  text-decoration: underline;
}

/* ===== 绿色登录按钮 ===== */
.btn-login {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: #10b981;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  letter-spacing: 2px;
}
.btn-login:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(16,185,129,0.3);
}
.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 底部注册引导 ===== */
.switch-text {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  margin-top: 18px;
}
.switch-text a {
  color: #10b981;
  font-weight: 500;
  text-decoration: none;
}
.switch-text a:hover {
  text-decoration: underline;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .login-card {
    flex-direction: column;
    width: 420px;
  }
  .card-left {
    width: auto;
    padding: 36px 28px 28px;
  }
  .brand-title {
    font-size: 24px;
  }
  .brand-subtitle {
    font-size: 13px;
  }
  .card-right {
    padding: 32px 28px 36px;
  }
}
@media (max-width: 480px) {
  .login-page { padding: 16px; }
  .login-card { width: 100%; border-radius: 12px; }
  .card-left { padding: 28px 20px 22px; }
  .card-right { padding: 24px 20px 28px; }
  .form-title { font-size: 20px; }
}
</style>
