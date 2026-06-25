<template>
  <div class="question-detail-page" v-if="question">
    <div class="detail-header">
      <button class="btn-back" @click="$router.back()">← 返回</button>
      <div class="header-actions">
        <button class="btn-edit" @click="startEdit">✏️ 编辑</button>
        <button class="btn-delete" @click="handleDelete">🗑️ 删除</button>
      </div>
    </div>

    <div class="detail-card">
      <div class="question-meta">
        <span class="meta-tag subject">{{ question.subject }}</span>
        <span class="meta-tag chapter">{{ question.chapter }}</span>
        <span class="meta-tag type" :style="{ background: typeColor }">{{ question.type }}</span>
        <span class="meta-tag difficulty">{'★'.repeat(question.difficulty || 3)}</span>
      </div>

      <div class="question-content">
        <h2 class="question-title">题目</h2>
        <div class="question-text" v-html="question.question || '(题目内容为空)'"></div>
      </div>

      <div class="question-options" v-if="question.options && question.options.length > 0">
        <h2 class="options-title">选项</h2>
        <div class="option-list">
          <div 
            v-for="(opt, idx) in question.options" 
            :key="idx"
            class="option-item"
            :class="{ 'correct': isCorrectAnswer(idx) }"
          >
            <span class="option-label">{{ String.fromCharCode(65 + idx) }}.</span>
            <span class="option-text">{{ opt }}</span>
          </div>
        </div>
      </div>

      <div class="question-answer">
        <h2 class="answer-title">正确答案</h2>
        <div class="answer-text">{{ formatAnswer(question.answer) }}</div>
      </div>

      <div class="question-explanation" v-if="question.explanation">
        <h2 class="explanation-title">解析</h2>
        <div class="explanation-text" v-html="question.explanation"></div>
      </div>

      <div class="question-tags" v-if="question.tags && question.tags.length > 0">
        <h2 class="tags-title">标签</h2>
        <div class="tag-list">
          <span v-for="tag in question.tags" :key="tag" class="tag-item">{{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <div v-if="showEditDialog" class="edit-dialog-overlay" @click.self="showEditDialog = false">
      <div class="edit-dialog">
        <h3>编辑题目</h3>
        <div class="edit-form">
          <div class="form-group">
            <label>科目</label>
            <input v-model="editForm.subject" class="form-input" />
          </div>
          <div class="form-group">
            <label>章节</label>
            <input v-model="editForm.chapter" class="form-input" />
          </div>
          <div class="form-group">
            <label>题型</label>
            <input v-model="editForm.type" class="form-input" />
          </div>
          <div class="form-group">
            <label>难度</label>
            <select v-model="editForm.difficulty" class="form-input">
              <option :value="1">★ 简单</option>
              <option :value="2">★★ 较简单</option>
              <option :value="3">★★★ 中等</option>
              <option :value="4">★★★★ 较难</option>
              <option :value="5">★★★★★ 困难</option>
            </select>
          </div>
          <div class="form-group">
            <label>题目内容</label>
            <textarea v-model="editForm.question" class="form-textarea" rows="4"></textarea>
          </div>
          <div class="form-group">
            <label>解析</label>
            <textarea v-model="editForm.explanation" class="form-textarea" rows="3"></textarea>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showEditDialog = false">取消</button>
          <button class="btn-save" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="loading-state">
    <p>加载中...</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuestionStore } from '../store/question'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const qs = useQuestionStore()

const question = ref(null)
const showEditDialog = ref(false)
const editForm = ref({})

const typeColor = computed(() => {
  const typeMap = {
    '单选': '#6366f1',
    '多选': '#22c55e',
    '判断': '#f59e0b',
    '填空': '#ef4444',
    '简答': '#8b5cf6',
    '分析': '#06b6d4',
    '综合题': '#ec4899'
  }
  return typeMap[question.value?.type] || '#10b981'
})

onMounted(async () => {
  const id = route.params.id
  if (!id) {
    ElMessage.error('题目ID不存在')
    router.back()
    return
  }

  try {
    const res = await qs.fetchQuestion(id)
    if (res && res.question) {
      question.value = res.question
      // 确保字段正确映射
      if (!question.value.question && question.value.question_text) {
        question.value.question = question.value.question_text
      }
      if (!question.value.question && question.value.content) {
        question.value.question = question.value.content
      }
    } else if (res && res.data) {
      question.value = res.data
    } else {
      ElMessage.error('题目不存在')
      router.back()
    }
  } catch (error) {
    console.error('获取题目详情失败:', error)
    ElMessage.error('获取题目详情失败')
  }
})

function isCorrectAnswer(idx) {
  if (!question.value || !question.value.answer) return false
  const answer = question.value.answer
  if (Array.isArray(answer)) {
    return answer.includes(String.fromCharCode(65 + idx))
  }
  return answer === String.fromCharCode(65 + idx)
}

function formatAnswer(answer) {
  if (!answer) return '(未设置)'
  if (Array.isArray(answer)) return answer.join(', ')
  return answer
}

function startEdit() {
  editForm.value = { ...question.value }
  showEditDialog.value = true
}

async function saveEdit() {
  try {
    const res = await qs.updateQuestion(question.value.id, editForm.value)
    if (res && res.code === 200) {
      ElMessage.success('保存成功')
      showEditDialog.value = false
      // 重新加载
      const newData = await qs.fetchQuestion(question.value.id)
      if (newData && newData.question) {
        question.value = newData.question
      }
    } else {
      ElMessage.error(res?.error || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

async function handleDelete() {
  try {
    await ElMessageBox.confirm('确定要删除这道题吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await qs.deleteQuestion(question.value.id)
    if (res && res.code === 200) {
      ElMessage.success('删除成功')
      router.back()
    } else {
      ElMessage.error(res?.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}
</script>

<style scoped>
.question-detail-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.btn-back {
  background: none;
  border: 1px solid #d1d5db;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: #374151;
  font-size: 14px;
}

.btn-back:hover {
  background: #f9fafb;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-edit,
.btn-delete {
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  border: none;
}

.btn-edit {
  background: #eff6ff;
  color: #3b82f6;
}

.btn-delete {
  background: #fef2f2;
  color: #ef4444;
}

.detail-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.question-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.meta-tag {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.meta-tag.subject {
  background: #ecfdf5;
  color: #10b981;
}

.meta-tag.chapter {
  background: #eff6ff;
  color: #3b82f6;
}

.meta-tag.type {
  color: white;
}

.meta-tag.difficulty {
  background: #fff7ed;
  color: #f59e0b;
}

.question-content,
.question-options,
.question-answer,
.question-explanation,
.question-tags {
  margin-bottom: 24px;
}

.question-title,
.options-title,
.answer-title,
.explanation-title,
.tags-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.question-text {
  font-size: 16px;
  line-height: 1.8;
  color: #374151;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.option-item.correct {
  background: #ecfdf5;
  border-color: #10b981;
}

.option-label {
  font-weight: 600;
  color: #6b7280;
  min-width: 30px;
}

.answer-text {
  font-size: 16px;
  color: #10b981;
  font-weight: 600;
  padding: 12px 16px;
  background: #ecfdf5;
  border-radius: 8px;
}

.explanation-text {
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.tag-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-item {
  padding: 4px 12px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 16px;
  font-size: 13px;
}

/* 编辑对话框 */
.edit-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-dialog {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.edit-dialog h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel,
.btn-save {
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  border: none;
}

.btn-cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-save {
  background: #10b981;
  color: white;
}

.loading-state {
  text-align: center;
  padding: 48px;
  color: #6b7280;
  font-size: 16px;
}
</style>
