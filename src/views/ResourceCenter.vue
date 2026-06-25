<template>
  <div class="resource-center">
    <h2>📚 资源中心</h2>
    <p class="subtitle">统一管理所有学习资料</p>

    <!-- 库类型切换 -->
    <div class="type-tabs">
      <button v-for="t in libTypes" :key="t.value" :class="['type-tab', { active: activeType === t.value }]" @click="activeType = t.value">
        <span class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
      <button class="type-tab create-btn" @click="showCreateDialog = true">＋ 新建库</button>
    </div>

    <!-- 资源库卡片网格 -->
    <div v-if="filteredLibraries.length === 0" class="empty-state">
      <p>暂无{{ activeTypeLabel }}，点击上方「新建库」开始创建</p>
    </div>
    <div v-else class="lib-grid">
      <div v-for="lib in filteredLibraries" :key="lib.id" class="lib-card" @click="openLibrary(lib)">
        <div class="lib-icon">{{ getLibIcon(lib.type) }}</div>
        <div class="lib-info">
          <h4>{{ lib.name }}</h4>
          <p class="lib-desc">{{ lib.description || '暂无描述' }}</p>
          <div class="lib-meta">
            <el-tag size="small" :type="lib.is_public ? 'success' : 'info'">{{ lib.is_public ? '公开' : '私有' }}</el-tag>
            <span class="lib-author">{{ lib.user_id === user.id ? '我' : '其他用户' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建库对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建资源库" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="newLib.name" placeholder="输入库名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="newLib.type" style="width:100%">
            <el-option v-for="t in libTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newLib.description" type="textarea" :rows="3" placeholder="简短的描述" />
        </el-form-item>
        <el-form-item label="公开">
          <el-switch v-model="newLib.is_public" active-text="允许其他用户查看" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createLibrary" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../store/auth'
import api from '../utils/api'

const router = useRouter()
const auth = useAuthStore()
const user = computed(() => auth.user)

const libTypes = [
  { value: 'all', label: '全部', icon: '📚' },
  { value: 'question_bank', label: '题库', icon: '📝' },
  { value: 'exam_paper', label: '试卷库', icon: '📄' },
  { value: 'study_guide', label: '复习指导', icon: '📖' },
  { value: 'material', label: '资料库', icon: '📁' }
]

const activeType = ref('all')
const libraries = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)
const newLib = ref({ name: '', type: 'exam_paper', description: '', is_public: false })

const activeTypeLabel = computed(() => libTypes.find(t => t.value === activeType.value)?.label || '资源')

const filteredLibraries = computed(() => {
  if (activeType.value === 'all') return libraries.value
  return libraries.value.filter(l => l.type === activeType.value)
})

function getLibIcon(type) {
  const icons = { question_bank: '📝', exam_paper: '📄', study_guide: '📖', material: '📁' }
  return icons[type] || '📦'
}

onMounted(() => { loadLibraries() })

async function loadLibraries() {
  try {
    const res = await api.get('/resource/libraries')
    if (res?.libraries) libraries.value = res.libraries
  } catch (e) { console.warn('加载库列表失败:', e) }
}

async function createLibrary() {
  if (!newLib.value.name) { ElMessage.warning('请输入库名称'); return }
  creating.value = true
  try {
    const res = await api.post('/resource/libraries', newLib.value)
    if (res?.library) {
      libraries.value.unshift(res.library)
      ElMessage.success('创建成功 ✅')
      showCreateDialog.value = false
      newLib.value = { name: '', type: 'exam_paper', description: '', is_public: false }
    }
  } catch (e) { ElMessage.error('创建失败') }
  finally { creating.value = false }
}

function openLibrary(lib) {
  router.push(`/library?type=${lib.type}`)
}
</script>

<style scoped>
.resource-center { max-width: 960px; margin: 0 auto; padding: 20px; }
.subtitle { color: #909399; margin-bottom: 20px; }

.type-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.type-tab {
  padding: 8px 16px; border: 1px solid #e4e7ed; border-radius: 20px;
  background: white; cursor: pointer; font-size: 14px; transition: all 0.2s;
  display: flex; align-items: center; gap: 4px;
}
.type-tab:hover { border-color: var(--primary-600); color: var(--primary-600); }
.type-tab.active { background: var(--primary-600); color: white; border-color: var(--primary-600); }
.create-btn { border-color: #67C23A; color: #67C23A; margin-left: auto; }
.create-btn:hover { background: #67C23A; color: white; }

.lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.lib-card {
  background: white; border-radius: 12px; padding: 18px; cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.25s; display: flex; gap: 14px;
}
.lib-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.lib-icon { font-size: 32px; flex-shrink: 0; }
.lib-info { flex: 1; min-width: 0; }
.lib-info h4 { margin: 0 0 4px; font-size: 15px; }
.lib-desc { color: #909399; font-size: 13px; margin: 0 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lib-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; }
.lib-author { color: #c0c4cc; }

.empty-state { text-align: center; padding: 60px 20px; color: #909399; }

.dark .lib-card { background: #1a1b26; }
.dark .type-tab { background: #1a1b26; border-color: #2d2e3a; color: #9ca3af; }
.dark .type-tab.active { background: var(--primary-600); color: white; }
</style>
