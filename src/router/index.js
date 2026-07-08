import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue'), meta: { noAuth: true } },
  { path: '/', component: () => import('../views/Home.vue') },
  { path: '/library', component: () => import('../views/LibraryCenter.vue') },
  { path: '/library/:type', component: () => import('../views/LibraryCenter.vue'), props: true },
  { path: '/resource', redirect: '/library' },
  { path: '/practice', component: () => import('../views/Practice.vue') },
  { path: '/exam', component: () => import('../views/Exam.vue') },
  { path: '/wrong', component: () => import('../views/Wrong.vue') },
  { path: '/ai-chat', component: () => import('../views/AiChat.vue') },
  { path: '/stats', component: () => import('../views/Stats.vue') },
  { path: '/study-guide', component: () => import('../views/StudyGuide.vue') },
  { path: '/import', component: () => import('../views/ImportQuestionBank.vue') },
  { path: '/admin', component: () => import('../views/Admin.vue') },
  { path: '/question/:id', component: () => import('../views/QuestionDetail.vue'), props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 认证检查：验证 token 存在且是合法 JWT 格式（三段式 base64url）
function isAuthenticated() {
  const token = localStorage.getItem('auth_token')
  if (!token) return false
  // 必须是 JWT 三段式格式（header.payload.signature），拒绝 mock_token 等非法格式
  const parts = token.split('.')
  return parts.length === 3 && parts.every(p => p.length > 0 && /^[A-Za-z0-9_-]+$/.test(p))
}

// 管理员判定：优先以 role 字段为准，兼容历史管理员账号 ksbg
function isAdminUser() {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return false
    const u = JSON.parse(raw)
    return u?.role === 'admin' || u?.username === 'ksbg'
  } catch {
    return false
  }
}

router.beforeEach((to, from, next) => {
  if (to.meta.noAuth) return next()
  if (!isAuthenticated()) return next('/login')
  // 管理面板仅对管理员开放
  if (to.path.startsWith('/admin') && !isAdminUser()) {
    ElMessage.error('无权限访问管理面板')
    return next('/')
  }
  next()
})

export default router
