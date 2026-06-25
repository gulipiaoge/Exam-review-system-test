<template>
  <div class="import-page">
    <div class="page-header">
      <h2>📥 导入题库</h2>
      <p class="header-desc">上传 Excel (.xlsx/.xls)、CSV (.csv) 或 Word (.docx) 文件，自动解析并导入到您的云端题库</p>
    </div>

    <!-- 上传区域 -->
    <div class="upload-zone" :class="{ dragover: isDragover }"
         @dragover.prevent="isDragover = true" @dragleave="isDragover = false" @drop.prevent="handleDrop">
      <input type="file" ref="fileInput" accept=".xlsx,.xls,.csv,.docx,.doc,.txt" @change="handleFileSelect" style="display:none" />
      <div class="upload-icon">📄</div>
      <h3>{{ isDragover ? '松手以上传文件' : '拖拽或点击上传文件' }}</h3>
      <p>支持 .xlsx / .xls / .csv / .docx 格式，可同时选择多个文件</p>
      <div class="upload-btn-row">
        <button class="btn-upload" @click="$refs.fileInput.click()">选择文件</button>
      </div>
    </div>

    <!-- 解析进度 -->
    <div v-if="isParsing" class="parse-progress">
      <el-progress :percentage="parseProgress" :stroke-width="12" striped striped-flow />
      <p>{{ parseStatus }}</p>
    </div>

    <!-- 解析结果预览 -->
    <div v-if="parseResult && !isParsing" class="results-section">
      <div class="results-header">
        <h3>📊 解析结果预览</h3>
        <div class="results-actions">
          <el-button type="primary" size="small" @click="confirmImport" :loading="isUploading">
            ☁️ 确认导入 ({{ selectedCount }} 道题目)
          </el-button>
          <el-button size="small" @click="parseResult = null">取消</el-button>
        </div>
      </div>

      <!-- 文件信息 -->
      <div class="file-info">
        <el-tag type="info">文件名：{{ parseResult.fileName }}</el-tag>
        <el-tag type="success">识别题目：{{ parseResult.totalQuestions }} 道</el-tag>
        <el-tag type="warning" v-if="parseResult.sheetCount > 1">多Sheet：{{ parseResult.sheetCount }} 个</el-tag>
      </div>

      <!-- Sheet 选择（多Sheet文件） -->
      <div v-if="parseResult.sheetCount > 1" class="sheet-selector">
        <h4>选择要导入的Sheet：</h4>
        <el-checkbox-group v-model="selectedSheets">
          <el-checkbox v-for="(sheet, name) in parseResult.sheetResults" :key="name" :label="name">
            {{ name }} ({{ sheet.questionCount }} 题，类型：{{ sheet.type }})
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 题目预览 -->
      <div class="preview-section">
        <h4>题目预览（前10条）：</h4>
        <div class="question-preview-list">
          <div v-for="(q, idx) in parseResult.preview" :key="idx" class="preview-item" :class="{ 'is-selected': isQuestionSelected(q) }">
            <el-checkbox :model-value="isQuestionSelected(q)" @change="toggleQuestion(q, $event)" />
            <div class="preview-content">
              <el-tag size="small" :color="getTypeColor(q.type)" style="color:white">{{ q.type || '未识别' }}</el-tag>
              <span class="preview-text">{{ q.question?.substring(0, 100) }}{{ q.question?.length > 100 ? '...' : '' }}</span>
              <el-tag v-if="q.subject" size="small" type="info">{{ q.subject }}</el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- Sheet 详细结果 -->
      <div v-for="(sheet, name) in parseResult.sheetResults" :key="name" class="sheet-detail" v-if="selectedSheets.includes(name)">
        <el-collapse>
          <el-collapse-item :title="`${name} - ${sheet.questionCount} 道题目`">
            <div class="question-preview-list">
              <div v-for="(q, idx) in sheet.questions" :key="idx" class="preview-item">
                <el-checkbox :model-value="isQuestionSelected(q, name)" @change="toggleQuestion(q, $event, name)" />
                <div class="preview-content">
                  <el-tag size="small" :color="getTypeColor(sheet.type)" style="color:white">{{ sheet.type }}</el-tag>
                  <span class="preview-text">{{ q.question?.substring(0, 80) }}{{ q.question?.length > 80 ? '...' : '' }}</span>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <!-- 导入结果 -->
    <div v-if="importResult" class="import-result">
      <el-alert :type="importResult.success ? 'success' : 'error'" :title="importResult.message" show-icon :closable="false">
        <template v-if="importResult.success">
          <p>成功导入 {{ importResult.imported }} 道题目</p>
          <p v-if="importResult.errors && importResult.errors.length > 0">有 {{ importResult.errors.length }} 条数据导入失败</p>
        </template>
      </el-alert>
    </div>

    <!-- 使用说明 -->
    <div class="tips-section">
      <h3>💡 使用说明</h3>
      <ul>
        <li><strong>支持格式：</strong>.xlsx / .xls / .csv / .docx 文件</li>
        <li><strong>字段映射：</strong>系统自动识别列头（题干、选项A-D、正确答案、解析等）</li>
        <li><strong>多Sheet：</strong>支持多Sheet文件，每个Sheet可对应不同类型（题库/试卷/单词/闪卡）</li>
        <li><strong>预览确认：</strong>上传后先预览题目，确认无误后再导入</li>
        <li><strong>云端保存：</strong>导入后数据保存在云端服务器，每个用户有独立的题库</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'

const fileInput = ref(null)
const isDragover = ref(false)
const isParsing = ref(false)
const isUploading = ref(false)
const parseProgress = ref(0)
const parseStatus = ref('')
const parseResult = ref(null)
const importResult = ref(null)
const selectedSheets = ref([])

// 存储所有解析出的题目（按Sheet分组）
const allQuestions = ref({})

function handleDrop(e) {
  isDragover.value = false
  const files = Array.from(e.dataTransfer.files).filter(f => 
    f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || 
    f.name.endsWith('.csv') || f.name.endsWith('.docx') || f.name.endsWith('.doc')
  )
  if (files.length === 0) {
    ElMessage.warning('请上传 .xlsx / .xls / .csv / .docx 格式文件')
    return
  }
  processFiles(files)
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files).filter(f => 
    f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || 
    f.name.endsWith('.csv') || f.name.endsWith('.docx') || f.name.endsWith('.doc')
  )
  if (files.length === 0) {
    ElMessage.warning('请上传 .xlsx / .xls / .csv / .docx 格式文件')
    return
  }
  processFiles(files)
}

async function processFiles(files) {
  isParsing.value = true
  parseProgress.value = 0
  parseStatus.value = '正在上传文件到服务器...'
  parseResult.value = null
  importResult.value = null

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      parseStatus.value = `正在解析：${file.name} (${i + 1}/${files.length})`
      parseProgress.value = Math.round((i / files.length) * 100)

      // 创建 FormData 上传到后端
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/library/import', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        }
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '上传失败')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '解析失败')
      }

      // 保存解析结果
      parseResult.value = {
        ...result,
        fileName: file.name
      }

      // 默认选中所有Sheet
      selectedSheets.value = Object.keys(result.sheetResults || {})

      // 保存所有题目
      allQuestions.value = {}
      for (const [sheetName, sheetData] of Object.entries(result.sheetResults || {})) {
        allQuestions.value[sheetName] = sheetData.questions || []
      }

      parseProgress.value = Math.round(((i + 1) / files.length) * 100)
    }

    parseStatus.value = '解析完成！请预览并确认导入'
    ElMessage.success(`成功解析 ${parseResult.value.totalQuestions} 道题目`)

  } catch (err) {
    ElMessage.error('文件解析失败：' + err.message)
    parseResult.value = null
  }

  isParsing.value = false
}

// 切换题目选中状态
function toggleQuestion(q, checked, sheetName) {
  // 使用题目内容作为唯一标识（因为没有ID）
  const key = `${sheetName || 'preview'}_${q.question?.substring(0, 50)}`
  if (!allQuestions.value._selected) allQuestions.value._selected = new Set()
  
  if (checked) {
    allQuestions.value._selected.add(key)
  } else {
    allQuestions.value._selected.delete(key)
  }
}

// 判断题目是否选中
function isQuestionSelected(q, sheetName) {
  const key = `${sheetName || 'preview'}_${q.question?.substring(0, 50)}`
  return allQuestions.value._selected?.has(key) || false
}

// 获取选中题目数量
const selectedCount = computed(() => {
  if (!allQuestions.value._selected) return 0
  return allQuestions.value._selected.size
})

// 确认导入
async function confirmImport() {
  if (!parseResult.value) return

  // 收集所有选中的题目
  const toImport = []
  for (const sheetName of selectedSheets.value) {
    const questions = allQuestions.value[sheetName] || []
    for (const q of questions) {
      const key = `${sheetName}_${q.question?.substring(0, 50)}`
      if (allQuestions.value._selected?.has(key)) {
        toImport.push(q)
      }
    }
  }

  if (toImport.length === 0) {
    ElMessage.warning('请至少选择一道题目')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要导入 ${toImport.length} 道题目吗？`, '确认导入', { type: 'warning' })
  } catch {
    return // 用户取消
  }

  isUploading.value = true

  try {
    const response = await api.post('/library/import/confirm', { questions: toImport })
    
    if (response.success) {
      importResult.value = {
        success: true,
        message: response.message || `成功导入 ${response.imported} 道题目`,
        imported: response.imported || 0,
        errors: response.errors || []
      }
      parseResult.value = null
      allQuestions.value = {}
      ElMessage.success(importResult.value.message)
    } else {
      throw new Error(response.error || '导入失败')
    }
  } catch (err) {
    ElMessage.error('导入失败：' + err.message)
    importResult.value = {
      success: false,
      message: err.message
    }
  }

  isUploading.value = false
}

// 题型颜色映射
function getTypeColor(typeName) {
  const colorMap = {
    '单选': '#409EFF', '多选': '#67C23A', '判断': '#E6A23C',
    '填空': '#F56C6C', '简答': '#9b59b6', '分析': '#06b6d4',
    '综合题': '#ec4899', '单词': '#10b981', '闪卡': '#f59e0b'
  }
  return colorMap[typeName] || '#409EFF'
}
</script>

<style scoped>
.import-page { max-width: 900px; margin: 0 auto; padding: 20px; }

.page-header { margin-bottom: 28px; }
.page-header h2 { font-size: 24px; font-weight: 800; color: var(--text-primary); }
.header-desc { font-size: 14px; color: var(--text-secondary); margin-top: 6px; }

/* 上传区域 */
.upload-zone {
  border: 2px dashed var(--primary-300); border-radius: var(--radius-lg);
  padding: 50px 30px; text-align: center;
  background: rgba(16,185,129,0.03);
  cursor: pointer; transition: all 0.25s; margin-bottom: 24px;
}
.upload-zone:hover, .upload-zone.dragover {
  border-color: var(--primary-500); background: rgba(16,185,129,0.06);
  transform: scale(1.005);
}
.upload-icon { font-size: 48px; margin-bottom: 16px; }
.upload-zone h3 { font-size: 17px; color: var(--text-primary); font-weight: 600; margin-bottom: 8px; }
.upload-zone p { font-size: 13px; color: var(--text-secondary); margin-bottom: 18px; }

.upload-btn-row {
  display: flex; justify-content: center; align-items: center;
  gap: 14px; margin-top: 18px;
}
.btn-upload {
  padding: 10px 28px; border-radius: 10px;
  background: var(--primary-600); color: white; border: none;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
}
.btn-upload:hover { background: var(--primary-700); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }

/* 进度 */
.parse-progress { padding: 24px; background: white; border-radius: var(--radius); box-shadow: var(--shadow-sm); margin-bottom: 24px; text-align: center; }
.parse-progress p { margin-top: 12px; font-size: 14px; color: var(--text-secondary); }

/* 解析结果 */
.results-section { margin-bottom: 24px; }
.results-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.results-header h3 { font-size: 17px; font-weight: 700; }

.file-info { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

/* Sheet 选择 */
.sheet-selector {
  background: #f8fafc; border-radius: 10px; padding: 16px;
  margin-bottom: 16px;
}
.sheet-selector h4 { font-size: 14px; font-weight: 600; margin-bottom: 10px; }

/* 题目预览 */
.preview-section { margin-bottom: 16px; }
.preview-section h4 { font-size: 14px; font-weight: 600; margin-bottom: 10px; }

.question-preview-list { display: flex; flex-direction: column; gap: 8px; }
.preview-item {
  display: flex; gap: 10px; padding: 10px 14px;
  border-radius: 8px; background: white;
  border: 1px solid #e4e7ed;
  transition: all 0.15s;
}
.preview-item:hover { background: #f5f7fa; }
.preview-item.is-selected { background: rgba(16,185,129,0.05); border-left: 3px solid #10b981; }

.preview-content { flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.preview-text { font-size: 13px; color: var(--text-primary); line-height: 1.5; flex: 1; }

/* 导入结果 */
.import-result { margin-bottom: 24px; }

/* 说明 */
.tips-section { margin-top: 36px; background: rgba(99,102,241,0.04); border-radius: var(--radius); padding: 22px; }
.tips-section h3 { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
.tips-section ul { list-style: none; padding: 0; }
.tips-section li { font-size: 13px; color: var(--text-secondary); padding: 5px 0; line-height: 1.7; }
.tips-section li strong { color: var(--text-primary); }
</style>
