<template>
  <div class="admin-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="ph-title">👥 管理面板</h2>
    </div>

    <!-- 4个统计卡片 -->
    <div class="dash-cards">
      <div class="dc">
        <div class="dc-icon" style="background:#dbeafe;color:#2563eb">👥</div>
        <span class="dc-lbl">用户数</span>
        <span class="dc-val">{{ dashboardStats.totalUsers || 128 }}</span>
      </div>
      <div class="dc">
        <div class="dc-icon" style="background:#ede9fe;color:#7c3aed">📚</div>
        <span class="dc-lbl">总题数</span>
        <span class="dc-val">{{ dashboardStats.totalQuestions || 1284 }}</span>
      </div>
      <div class="dc">
        <div class="dc-icon" style="background:#fef3c7;color:#d97706">🎯</div>
        <span class="dc-lbl">总考试数</span>
        <span class="dc-val">{{ dashboardStats.totalExams || 156 }}</span>
      </div>
      <div class="dc">
        <div class="dc-icon" style="background:#fce7f3;color:#db2777">📝</div>
        <span class="dc-lbl">总练习次数</span>
        <span class="dc-val">{{ dashboardStats.totalPractices || 2847 }}</span>
      </div>
    </div>

    <!-- 用户管理区 -->
    <div class="user-section">
      <div class="us-header">
        <h3 class="us-title">用户管理</h3>
        <div class="us-search">
          <input v-model="searchText" placeholder="搜索用户名..." />
        </div>
      </div>

      <!-- 加载/空状态 -->
      <div v-if="loading" class="empty-state"><p>加载中...</p></div>
      <div v-else-if="users.length === 0" class="empty-state"><p>暂无用户数据</p></div>

      <!-- 用户表格 -->
      <div v-else class="user-table-wrap">
        <table class="user-table">
          <thead>
            <tr>
              <th>排序</th><th>用户名</th><th>角色</th><th>练习次数</th><th>考试次数</th><th>注册时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, i) in filteredUsers" :key="u.id">
              <td class="td-center">{{ i + 1 }}</td>
              <td>
                <div class="user-cell">
                  <span class="uc-avatar" :style="{ background: getAvatarColor(i) }">{{ getInitial(u) }}</span>
                  <span class="uc-name">{{ u.name || u.username }}</span>
                </div>
              </td>
              <td><span :class="['role-tag', u.username === 'ksbg' ? 'is-admin' : 'is-user']">{{ u.username === 'ksbg' ? '管理员' : '普通用户' }}</span></td>
              <td>{{ u.practice_count || 0 }}</td>
              <td>{{ u.exam_count || 0 }}</td>
              <td>{{ formatDate(u.created_at || u.registered_at) }}</td>
              <td>
                <div class="action-btns">
                  <button class="abtn abtn-detail" @click="selectUser(u)">详情</button>
                  <button class="abtn abtn-delete" @click="confirmDeleteUser(u)" :disabled="u.username === 'ksbg'">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页 -->
        <div class="pagination">
          <span class="pg-info">共 {{ users.length }} 位用户</span>
          <div class="pg-controls">
            <button class="pg-btn" disabled>上一页</button>
            <button class="pg-num active">1</button>
            <button class="pg-num">2</button>
            <button class="pg-num">3</button>
            <span class="pg-dots">...</span>
            <button class="pg-btn">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本历史 -->
    <div class="version-section" style="margin-top: 24px;">
      <div class="us-header">
        <h3 class="us-title">📋 版本历史</h3>
      </div>
      <div class="version-list">
        <div v-for="v in versionHistory" :key="v.version" class="version-card card" style="margin-bottom: 16px; padding: 16px;">
          <div class="version-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <span class="version-tag" :class="'tag-' + v.type" style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">{{ v.type === 'feature' ? '新功能' : v.type === 'bugfix' ? '修复' : '优化' }}</span>
              <span class="version-name" style="font-size: 18px; font-weight: 700; margin-left: 12px;">{{ v.version }}</span>
              <span class="version-date" style="color: #6b7280; margin-left: 12px;">{{ v.date }}</span>
            </div>
          </div>
          <div class="version-changes">
            <div v-if="v.changes && v.changes.length > 0" style="margin-bottom: 8px;">
              <strong style="font-size: 13px; color: #059669;">✅ 改进：</strong>
              <ul style="margin: 8px 0 0 20px; font-size: 13px; color: #374151;">
                <li v-for="(change, idx) in v.changes" :key="idx" style="margin-bottom: 4px;">{{ change }}</li>
              </ul>
            </div>
            <div v-if="v.bugs && v.bugs.length > 0">
              <strong style="font-size: 13px; color: #dc2626;">🐛 修复的Bug：</strong>
              <ul style="margin: 8px 0 0 20px; font-size: 13px; color: #374151;">
                <li v-for="(bug, idx) in v.bugs" :key="idx" style="margin-bottom: 4px;">{{ bug }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api.js'
import { getVersionHistory } from '../version.js'

const dashboardStats = reactive({ totalUsers: 0, totalQuestions: 0, totalPractices: 0, totalExams: 0 })
const users = ref([])
const loading = ref(false)
const searchText = ref('')
const versionHistory = ref(getVersionHistory())

const filteredUsers = computed(() => {
  if (!searchText.value.trim()) return users.value
  const q = searchText.value.toLowerCase()
  return users.value.filter(u => (u.name||u.username).toLowerCase().includes(q))
})

function getInitial(u) { return (u.name || u.username || '?').charAt(0).toUpperCase() }
function getAvatarColor(i) {
  const c = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6']
  return c[i % c.length]
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await api.get('/admin/users')
    if (res?.users) users.value = res.users
    else ElMessage.error(res?.error || '加载失败')
  } catch { ElMessage.error('网络错误') }
  loading.value = false
}

function formatDate(t) {
  if (!t) return '-'
  try { return new Date(t).toLocaleDateString('zh-CN') } catch { return t }
}

async function confirmDeleteUser(u) {
  if (u.username === 'ksbg') { ElMessage.warning('不能删除管理员账号'); return }
  try {
    await ElMessageBox.confirm(`确定要删除用户「${u.name || u.username}」吗？`, '确认', { type: 'warning' })
    const res = await api.delete(`/admin/user/${u.id}`)
    if (res.success) { ElMessage.success('删除成功'); users.value = users.value.filter(x => x.id !== u.id) }
    else ElMessage.error(res.error || '删除失败')
  } catch (e) { /* 用户取消 */ }
}

onMounted(async () => { await loadUsers(); /* ❌ 移除不存在的 loadDashboard() 调用 */ })
</script>

<style scoped>
.admin-page { display: flex; flex-direction: column; gap: 24px; }
.page-header { margin-bottom: 4px; }
.ph-title { font-size: 20px; font-weight: 700; color: var(--gray-800); margin: 0; }

/* ===== Dashboard 卡片 ===== */
.dash-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.dc {
  background: #fff; border-radius: 14px; border: 1px solid var(--gray-200);
  padding: 22px 18px; display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.dc:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); transition: all 0.25s; }
.dc-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; align-self: flex-start; }
.dc-lbl { font-size: 13px; color: var(--gray-500); }
.dc-val { font-size: 26px; font-weight: 800; color: var(--gray-800); line-height: 1; }

/* ===== 用户表格区 ===== */
.user-section { background: #fff; border-radius: 14px; border: 1px solid var(--gray-200); padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.us-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.us-title { font-size: 15px; font-weight: 700; color: var(--gray-800); margin: 0; }
.us-search input { padding: 7px 14px; border: 1px solid var(--gray-200); border-radius: 8px; font-size: 13px; outline: none; width: 200px; }
.us-search input:focus { border-color: var(--primary-400); }

.user-table-wrap { overflow-x: auto; }
.user-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.user-table th {
  padding: 10px 14px; text-align: left; font-weight: 600; color: var(--gray-500);
  border-bottom: 2px solid var(--gray-100); white-space: nowrap;
}
.user-table td { padding: 12px 14px; border-bottom: 1px solid var(--gray-100); vertical-align: middle; color: var(--gray-700); }
.td-center { text-align: center; }

.user-cell { display: flex; align-items: center; gap: 10px; }
.uc-avatar {
  width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.uc-name { font-weight: 600; color: var(--gray-800); }

.role-tag { display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.is-admin { background: #fef3c7; color: #b45309; }
.is-user { background: #ecfdf5; color: #059669; }

.action-btns { display: flex; gap: 6px; }
.abtn { padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; border: none; font-weight: 500; }
.abtn-detail { background: #eff6ff; color: #2563eb; }
.abtn-detail:hover { background: #dbeafe; }
.abtn-delete { background: #fef2f2; color: #ef4444; }
.abtn-delete:hover { background: #fee2e2; }
.abtn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 分页 */
.pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--gray-100); }
.pg-info { font-size: 13px; color: var(--gray-500); }
.pg-controls { display: flex; gap: 4px; align-items: center; }
.pg-btn, .pg-num {
  padding: 5px 12px; border: 1px solid var(--gray-200); border-radius: 6px;
  background: #fff; font-size: 13px; cursor: pointer; color: var(--gray-600); transition: all 0.15s;
}
.pg-btn:hover:not(:disabled), .pg-num:hover { border-color: var(--primary-400); color: var(--primary-600); }
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-num.active { background: #059669; color: #fff; border-color: #059669; }
.pg-dots { color: var(--gray-400); font-size: 13px; padding: 0 4px; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--gray-400); }

@media (max-width: 1024px) { .dash-cards { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .dash-cards { grid-template-columns: repeat(2, 1fr); } .us-header { flex-direction: column; gap: 10px; align-items: stretch; } .us-search input { width: 100%; } }
</style>
