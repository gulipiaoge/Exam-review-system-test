import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

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

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.noAuth || auth.isLoggedIn) next()
  else next('/login')
})

export default router
