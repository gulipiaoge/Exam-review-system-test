import { createRouter, createWebHistory } from 'vue-router'

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

// 简单的认证检查：直接读取 localStorage
function isAuthenticated() {
  const token = localStorage.getItem('auth_token')
  console.log('[Router] Checking auth:', !!token)
  return !!token
}

router.beforeEach((to, from, next) => {
  console.log('[Router] Navigating to:', to.path, '| Authenticated:', isAuthenticated())
  
  if (to.meta.noAuth || isAuthenticated()) {
    next()
  } else {
    console.log('[Router] Redirecting to /login')
    next('/login')
  }
})

export default router
