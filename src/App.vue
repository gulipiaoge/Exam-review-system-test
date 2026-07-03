<template>
  <div class="app-container">
    <!-- 未登录：只渲染登录页 -->
    <router-view v-if="!auth.isLoggedIn" />

    <!-- 已登录：侧边栏 + 顶栏布局 -->
    <template v-else>
      <div class="app-layout">
        <!-- ===== 侧边栏 ===== -->
        <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
          <div class="sidebar-logo">
            <div class="logo-icon">📚</div>
            <span class="logo-text">智能备考</span>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-section">主导航</div>
            <a v-for="item in mainNavItems" :key="item.path"
               :class="['nav-item', { active: isActive(item.path) }]"
               @click="navigate(item.path)">
              <span class="nav-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
              <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
            </a>
            <div class="nav-section">工具</div>
            <a v-for="item in toolNavItems" :key="item.path"
               :class="['nav-item', { active: isActive(item.path) }]"
               @click="navigate(item.path)">
              <span class="nav-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          </nav>
          <div class="sidebar-overlay" @click="sidebarOpen = false"></div>
        </aside>

        <!-- ===== 主内容区 ===== -->
        <div class="main-content">
          <!-- 顶栏 -->
          <header class="topbar">
            <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">☰</button>
            <div class="breadcrumb">
              页面 / <span class="current">{{ pageTitle }}</span>
            </div>
            <div class="search-bar">
              <span class="search-icon">🔍</span>
              <input v-model="searchText" placeholder="搜索题目、章节、资料..." @keyup.enter="doSearch">
            </div>
            <div class="topbar-actions">
              <button class="btn btn-ghost btn-icon" @click="toggleDark" :title="isDark ? '切换亮色' : '切换暗色'">
                {{ isDark ? '☀️' : '🌙' }}
              </button>
              <el-dropdown trigger="click" @command="handleUserCommand">
                <div class="user-avatar-small">{{ auth.user?.username?.charAt(0)?.toUpperCase() || '?' }}</div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="logout"><span style="color:#ef4444">退出登录</span></el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </header>

          <!-- 内容区域 -->
          <div class="content-area">
            <router-view />
          </div>
          
          <!-- 页脚 -->
          <AppFooter />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './store/auth'
import { useQuestionStore } from './store/question'
import { useWrongStore } from './store/wrong'
import { useExamStore } from './store/exam'
import { useAiStore } from './store/ai'
import AppFooter from './components/AppFooter.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const questionStore = useQuestionStore()
const wrongStore = useWrongStore()
const examStore = useExamStore()
const aiStore = useAiStore()

// ✅ 直接使用 auth.isLoggedIn（响应式 computed）
const isLoggedIn = computed(() => auth.isLoggedIn)

const isAdmin = computed(() => auth.user?.username === 'admin')
const currentPath = computed(() => route.path)
const sidebarOpen = ref(false)
const searchText = ref('')

const pageTitle = computed(() => {
  const map = {
    '/': '首页',
    '/library': '库中心',
    '/practice': '在线练习',
    '/exam': '模拟考试',
    '/wrong': '错题本',
    '/ai-chat': 'AI 助手',
    '/stats': '学习统计',
    '/study-guide': '复习指导',
    '/admin': '管理员面板'
  }
  return map[currentPath.value] || '智能备考'
})

function isActive(path) {
  if (path === '/') return currentPath.value === '/'
  return currentPath.value.startsWith(path)
}

function navigate(path) {
  router.push(path)
  sidebarOpen.value = false
}

function doSearch() {
  if (!searchText.value.trim()) return
  router.push(`/library?search=${encodeURIComponent(searchText.value)}`)
}

const mainNavItems = computed(() => {
  const items = [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/library', icon: '📖', label: '库中心' },
    { path: '/practice', icon: '✏️', label: '在线练习' },
    { path: '/exam', icon: '🎯', label: '模拟考试' },
    { path: '/wrong', icon: '❌', label: '错题本', badge: wrongStore.wrongQuestions.length || null },
  ]
  return items
})

const toolNavItems = computed(() => {
  const items = [
    { path: '/ai-chat', icon: '🤖', label: 'AI 助手' },
    { path: '/stats', icon: '📊', label: '学习统计' },
    { path: '/study-guide', icon: '🗺️', label: '复习指导' },
  ]
  if (isAdmin.value) {
    items.push({ path: '/admin', icon: '⚙️', label: '管理员' })
  }
  return items
})

const isDark = ref(false)

onMounted(() => {
  // ✅ 初始化认证状态（从 localStorage 恢复 token）
  auth.init()
  
  const saved = localStorage.getItem('exam_dark_mode')
  if (saved === 'true') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('exam_dark_mode', isDark.value)
}

// ✅ 登录状态变化时，加载数据
watch(() => auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    questionStore.init()
    questionStore.fetchQuestions()
    wrongStore.init()
    examStore.loadRecords()
    aiStore.loadFromCloud()
  }
}, { immediate: true })

function handleUserCommand(cmd) {
  if (cmd === 'logout') logout()
}

function logout() {
  auth.logout()
  questionStore.questions = []
  router.push('/login')
}
</script>

<style>
/* ===== 1. 设计令牌 (Design Tokens) ===== */
:root {
  /* 主色 - 翡翠绿 (成长·学习) */
  --primary-50: #ecfdf5;
  --primary-100: #d1fae5;
  --primary-200: #a7f3d0;
  --primary-300: #6ee7b7;
  --primary-400: #34d399;
  --primary-500: #10b981;
  --primary-600: #059669;
  --primary-700: #047857;
  --primary-800: #065f46;
  --primary-900: #064e3b;
  /* 中性色 */
  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-300: #cbd5e1;
  --gray-400: #94a3b8;
  --gray-500: #64748b;
  --gray-600: #475569;
  --gray-700: #334155;
  --gray-800: #1e293b;
  --gray-900: #0f172a;
  /* 语义色 */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  /* 排版 */
  --font-sans: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  /* 间距 */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;
  /* 圆角 */
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-full: 9999px;
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);
  /* 布局 */
  --sidebar-width: 220px;
  --topbar-height: 56px;
  --content-max: 1400px;
  --transition: 0.2s ease;
  /* 背景色 */
  --bg-primary: var(--gray-50);
  --bg-card: #ffffff;
  --text-primary: var(--gray-800);
  --text-secondary: var(--gray-500);
}
/* ===== 2. 暗色模式 ===== */
.dark {
  --bg-primary: #0f172a;
  --bg-card: #1e293b;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --gray-50: #1e293b;
  --gray-100: #334155;
  --gray-200: #475569;
}
.dark body { background: #0f172a; }
.dark .card, .dark .sidebar, .dark .topbar { background: #1e293b; border-color: #334155; }
.dark .input, .dark .select { background: #0f172a; border-color: #334155; color: #e2e8f0; }
.dark .tag-gray { background: #334155; color: #94a3b8; }

/* ===== 3. 基础重置 ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
a { text-decoration: none; color: inherit; }

/* ===== 4. 整体布局 ===== */
.app-container { min-height: 100vh; }
.app-layout { display: flex; min-height: 100vh; }

/* ===== 5. 侧边栏 ===== */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-card);
  border-right: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  z-index: 100;
  flex-shrink: 0;
  transition: transform var(--transition);
}
.sidebar-logo {
  padding: var(--space-5) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid var(--gray-100);
}
.sidebar-logo .logo-icon {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 16px;
}
.sidebar-logo .logo-text { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.sidebar-nav { padding: var(--space-3) var(--space-2); flex: 1; overflow-y: auto; }
.nav-section {
  padding: var(--space-3) var(--space-3) var(--space-1);
  font-size: 11px; font-weight: 600; color: var(--gray-400);
  text-transform: uppercase; letter-spacing: 0.5px;
}
.nav-item {
  display: flex; align-items: center; gap: var(--space-3);
  padding: 9px var(--space-3); border-radius: var(--radius-md);
  color: var(--gray-600); font-size: 14px; cursor: pointer;
  transition: var(--transition); margin-bottom: 1px;
  text-decoration: none;
}
.nav-item:hover { background: var(--gray-50); color: var(--gray-800); }
.nav-item.active { background: var(--primary-50); color: var(--primary-700); font-weight: 600; }
.nav-item .nav-icon { width: 20px; text-align: center; font-size: 16px; flex-shrink: 0; }
.nav-item .nav-badge {
  margin-left: auto;
  background: var(--gray-100); padding: 1px 7px;
  border-radius: var(--radius-full); font-size: 11px; color: var(--gray-500);
}
.nav-item.active .nav-badge { background: var(--primary-100); color: var(--primary-700); }
.sidebar-overlay { display: none; }

/* ===== 6. 主内容区 ===== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: var(--sidebar-width);
}

/* ===== 7. 顶栏 ===== */
.topbar {
  height: var(--topbar-height);
  background: var(--bg-card);
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
  padding: 0 var(--space-5);
  gap: var(--space-3);
  position: sticky;
  top: 0;
  z-index: 50;
}
.topbar .breadcrumb {
  display: flex; align-items: center; gap: var(--space-2);
  font-size: 13px; color: var(--gray-400); white-space: nowrap;
}
.topbar .breadcrumb .current { color: var(--text-primary); font-weight: 500; }
.topbar .search-bar {
  flex: 1; max-width: 360px; position: relative;
}
.topbar .search-bar input {
  width: 100%;
  padding: 7px 12px 7px 34px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--gray-50);
  outline: none;
  transition: var(--transition);
  font-family: var(--font-sans);
  color: var(--text-primary);
}
.topbar .search-bar input:focus { border-color: var(--primary-400); background: var(--bg-card); box-shadow: 0 0 0 3px var(--primary-100); }
.topbar .search-bar .search-icon {
  position: absolute; left: 10px; top: 50%;
  transform: translateY(-50%); color: var(--gray-400); font-size: 14px;
}
.topbar .topbar-actions {
  margin-left: auto; display: flex; align-items: center; gap: var(--space-2);
}
.sidebar-toggle { display: none; background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px; color: var(--text-primary); }
.user-avatar-small {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; cursor: pointer;
}

/* ===== 8. 内容区域 ===== */
.content-area {
  padding: var(--space-6);
  max-width: var(--content-max);
  width: 100%;
  align-self: center;
  flex: 1;
}

/* ===== 9. 通用组件 ===== */
/* 按钮 */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); padding: 7px 16px; font-size: 13px; font-weight: 600;
  border-radius: var(--radius-md); border: 1px solid transparent;
  cursor: pointer; transition: var(--transition);
  font-family: var(--font-sans); line-height: 1.4; white-space: nowrap;
}
.btn-primary { background: var(--primary-600); color: #fff; }
.btn-primary:hover { background: var(--primary-700); }
.btn-secondary { background: var(--bg-card); border-color: var(--gray-200); color: var(--gray-700); }
.btn-secondary:hover { background: var(--gray-50); border-color: var(--gray-300); }
.btn-ghost { background: transparent; color: var(--gray-600); }
.btn-ghost:hover { background: var(--gray-100); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-lg { padding: 10px 22px; font-size: 14px; }
.btn-icon { width: 34px; height: 34px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
.btn-danger { background: var(--error); color: #fff; }
.btn-danger:hover { background: #dc2626; }

/* 卡片 */
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.card-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }

/* 统计卡片 */
.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.stat-card .stat-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 20px; }
.stat-card .stat-label { font-size: 13px; color: var(--gray-500); }
.stat-card .stat-value { font-size: 26px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.stat-card .stat-trend { font-size: 12px; display: flex; align-items: center; gap: 4px; }
.stat-card .stat-trend.up { color: var(--success); }
.stat-card .stat-trend.down { color: var(--error); }

/* 标签 */
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 10px; font-size: 12px; border-radius: var(--radius-full); font-weight: 500;
}
.tag-primary { background: var(--primary-100); color: var(--primary-700); }
.tag-info { background: #dbeafe; color: #1d4ed8; }
.tag-warning { background: #fef3c7; color: #b45309; }
.tag-error { background: #fce4ec; color: #c62828; }
.tag-gray { background: var(--gray-100); color: var(--gray-600); }

/* 输入框 */
.input { width: 100%; padding: 8px 12px; border: 1px solid var(--gray-200); border-radius: var(--radius-md); font-size: 13px; outline: none; transition: var(--transition); font-family: var(--font-sans); background: var(--bg-card); color: var(--text-primary); }
.input:focus { border-color: var(--primary-400); box-shadow: 0 0 0 3px var(--primary-100); }
.input-group { display: flex; flex-direction: column; gap: 6px; }
.input-group label { font-size: 13px; font-weight: 500; color: var(--gray-700); }

/* 选择器 */
.select { width: 100%; padding: 8px 12px; border: 1px solid var(--gray-200); border-radius: var(--radius-md); font-size: 13px; outline: none; background: var(--bg-card); cursor: pointer; font-family: var(--font-sans); color: var(--text-primary); appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 34px; }
.select:focus { border-color: var(--primary-400); box-shadow: 0 0 0 3px var(--primary-100); }

/* 进度条 */
.progress-bar { height: 6px; background: var(--gray-200); border-radius: var(--radius-full); overflow: hidden; }
.progress-bar .progress-fill { height: 100%; border-radius: var(--radius-full); background: var(--primary-500); transition: width 0.3s ease; }

/* 骨架屏 */
.skeleton { background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-50) 50%, var(--gray-100) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-md); }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-12); color: var(--gray-400); text-align: center; }
.empty-state .empty-icon { font-size: 48px; margin-bottom: var(--space-3); opacity: 0.4; }
.empty-state .empty-text { font-size: 14px; }

/* 网格 */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-5); }
.grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: var(--space-5); }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
.mt-2 { margin-top: var(--space-2); }
.mt-4 { margin-top: var(--space-4); }
.mt-6 { margin-top: var(--space-6); }
.mb-4 { margin-bottom: var(--space-4); }
.ml-auto { margin-left: auto; }

/* 步骤指示器 */
.step-indicator { display: flex; align-items: center; gap: 0; margin-bottom: var(--space-5); flex-wrap: wrap; }
.step-item { display: flex; align-items: center; gap: var(--space-2); font-size: 13px; color: var(--gray-400); }
.step-item .step-num { width: 26px; height: 26px; border-radius: 50%; background: var(--gray-200); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; flex-shrink: 0; }
.step-item.active .step-num { background: var(--primary-500); }
.step-item.active { color: var(--text-primary); font-weight: 500; }
.step-item.completed .step-num { background: var(--success); }
.step-line { width: 36px; height: 1px; background: var(--gray-200); margin: 0 var(--space-3); }

/* ===== Element Plus 覆盖 ===== */
.el-button--primary { --el-button-bg-color: #059669 !important; --el-button-border-color: #059669 !important; }
.el-button--primary:hover { --el-button-bg-color: #047857 !important; --el-button-border-color: #047857 !important; }
.el-tag { border-radius: 8px !important; font-weight: 500; }
.el-dialog__body { padding: 20px; }
.dark .el-dialog { --el-dialog-bg-color: #1e293b; }
.dark .el-select-dropdown__item { color: #e2e8f0; }
.dark .el-select-dropdown { background: #1e293b; border-color: #334155; }

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.sidebar-open { transform: translateX(0); }
  .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: -1; }
  .sidebar.sidebar-open .sidebar-overlay { z-index: -1; }
  .main-content { margin-left: 0; }
  .topbar { padding: 0 var(--space-3); gap: var(--space-2); }
  .topbar .search-bar { max-width: 180px; }
  .topbar .search-bar input { padding: 6px 10px 6px 30px; font-size: 12px; }
  .topbar .breadcrumb { font-size: 12px; }
  .sidebar-toggle { display: flex; align-items: center; justify-content: center; }
  .content-area { padding: var(--space-4); }
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .topbar .search-bar { max-width: 120px; }
  .topbar .search-bar input { font-size: 11px; }
  .content-area { padding: var(--space-3); }
}
</style>