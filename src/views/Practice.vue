<template>
  <div class="practice-page">
    <!-- ==================== 视图1: 练习配置页 ==================== -->
    <div v-if="!practiceStarted" class="config-view">
      <div class="config-container">
        <div class="config-hero">
          <h1 class="config-title">📝 在线练习</h1>
          <p class="config-desc">选择科目和题型，开始针对性练习</p>
        </div>

        <!-- 恢复练习提示 -->
        <div v-if="resumeData" class="resume-banner">
          <div class="resume-icon">📂</div>
          <div class="resume-info">
            <p class="resume-title">发现未完成的练习</p>
            <p class="resume-detail">{{ resumeData.config.subject }}，已做 {{ resumeData.currentIndex + 1 }} / {{ resumeData.questions.length }} 题</p>
          </div>
          <div class="resume-actions">
            <button class="btn-resume" @click="doResume">恢复练习</button>
            <button class="btn-clear" @click="clearPracticeProgress">放弃</button>
          </div>
        </div>

        <!-- 配置卡片 -->
        <div class="config-card">
          <!-- 选择科目 -->
          <div class="form-group">
            <label class="form-label">选择科目</label>
            <select v-model="config.subject" class="form-select" @change="onSubjectChange">
              <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- 筛选题型 -->
          <div class="form-group">
            <label class="form-label">筛选题型</label>
            <div class="type-checkboxes">
              <label
                v-for="t in availableQuestionTypes"
                :key="t.name"
                class="type-checkbox"
                :class="{ active: config.types.includes(t.name) }"
              >
                <input type="checkbox" :value="t.name" v-model="config.types" />
                <span class="type-name">{{ t.name }}</span>
                <span class="type-count">({{ typeAvailability[t.name] || 0 }})</span>
              </label>
            </div>
          </div>

          <!-- 题目数量 -->
          <div class="form-group">
            <label class="form-label">题目数量</label>
            <div class="number-input-group">
              <button class="num-btn" @click="config.count = Math.max(1, config.count - 1)">−</button>
              <input type="number" v-model.number="config.count" class="num-input" min="1" max="500" />
              <button class="num-btn" @click="config.count = Math.min(500, config.count + 1)">＋</button>
            </div>
          </div>

          <!-- 难度选择 -->
          <div class="form-group">
            <label class="form-label">难度</label>
            <div class="difficulty-buttons">
              <button
                v-for="d in [0, 1, 2, 3, 4, 5]"
                :key="d"
                class="diff-btn"
                :class="{ active: config.difficulty === d }"
                @click="config.difficulty = d"
              >
                {{ d === 0 ? '全部' : '★'.repeat(d) + ' ' + (d <= 2 ? '简单' : d === 3 ? '中等' : '困难') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 开始练习按钮 -->
        <div class="start-section">
          <p class="available-count">可用题目：{{ filteredCount }} 题</p>
          <button class="btn-start" @click="startPractice" :disabled="filteredCount === 0">
            开始练习
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 视图2: 答题页 ==================== -->
    <div v-else-if="!practiceFinished" class="answering-view">
      <!-- 顶部导航栏 -->
      <div class="answer-header">
        <div class="header-left">
          <span class="breadcrumb">在线练习 / {{ config.subject }}</span>
          <span class="question-progress">第 {{ currentIndex + 1 }} 题 / 共 {{ questions.length }} 题</span>
        </div>
        <div class="header-right">
          <button class="btn-mark" :class="{ marked: markedSet.has(currentQuestion?.id) }" @click="toggleMark">
            {{ markedSet.has(currentQuestion?.id) ? '★ 已标记' : '☆ 标记' }}
          </button>
          <span class="timer">⏱ {{ formatTime(elapsedTime) }}</span>
          <button class="btn-submit" @click="confirmExit">交卷</button>
        </div>
      </div>

      <!-- 主内容 + 答题卡 -->
      <div class="answer-body">
        <!-- 题目内容区 -->
        <div class="question-panel">
          <!-- 题目类型标签 -->
          <div class="question-meta">
            <span class="type-badge" :style="{ background: getTypeColor(currentQuestion?.type) }">
              {{ currentQuestion?.type }}
            </span>
          </div>

          <!-- 题目文本 -->
          <div class="question-text">
            <h3 class="question-title">
              {{ currentIndex + 1 }}. {{ currentQuestion?.question }}
            </h3>
          </div>

          <!-- 选项列表 -->
          <div v-if="['单选', '多选'].includes(currentQuestion?.type)" class="options-list">
            <div
              v-for="(opt, idx) in currentQuestion?.options"
              :key="idx"
              class="option-item"
              :class="{ selected: isOptionSelected(opt.label) }"
              @click="selectOption(opt.label)"
            >
              <span class="option-circle"></span>
              <span class="option-label">{{ opt.label }}.</span>
              <span class="option-text">{{ opt.text }}</span>
            </div>
          </div>

          <!-- 判断题选项 -->
          <div v-if="currentQuestion?.type === '判断'" class="options-list">
            <div class="option-item" :class="{ selected: myAnswer === '对' }" @click="myAnswer = '对'">
              <span class="option-circle"></span>
              <span class="option-label">A.</span>
              <span class="option-text">对</span>
            </div>
            <div class="option-item" :class="{ selected: myAnswer === '错' }" @click="myAnswer = '错'">
              <span class="option-circle"></span>
              <span class="option-label">B.</span>
              <span class="option-text">错</span>
            </div>
          </div>

          <!-- 主观题输入框 -->
          <div v-if="!['单选', '多选', '判断'].includes(currentQuestion?.type)" class="subjective-input">
            <textarea
              v-model="myAnswer"
              class="answer-textarea"
              :rows="6"
              placeholder="请输入答案..."
            ></textarea>
          </div>

          <!-- 提交按钮 -->
          <div class="answer-actions">
            <button v-if="!showResult" class="btn-submit-answer" @click="checkAnswer">提交答案</button>
          </div>

          <!-- 结果区域 -->
          <div v-if="showResult" class="result-area">
            <div class="result-banner" :class="isCorrect ? 'correct' : 'wrong'">
              <span class="result-icon">{{ isCorrect ? '✅' : '❌' }}</span>
              <span class="result-text">{{ isCorrect ? '回答正确' : '回答错误' }}</span>
            </div>
            <div class="answer-reference">
              <p class="ref-title">参考答案：</p>
              <p class="ref-content">{{ currentQuestion?.answer }}</p>
            </div>
          </div>

          <!-- 底部导航 -->
          <div class="page-actions">
            <button
              class="btn-nav"
              :disabled="currentIndex === 0"
              @click="currentIndex = Math.max(0, currentIndex - 1)"
            >
              ← 上一题
            </button>
            <button
              v-if="currentIndex === questions.length - 1"
              class="btn-nav btn-finish"
              @click="finishPractice"
            >
              完成练习
            </button>
            <button
              v-else
              class="btn-nav"
              @click="currentIndex = Math.min(questions.length - 1, currentIndex + 1)"
            >
              下一题 →
            </button>
          </div>
        </div>

        <!-- 右侧答题卡面板 -->
        <div class="answer-card-panel">
          <div class="card-header">
            <h3 class="card-title">答题卡</h3>
            <span class="card-total">{{ questions.length }} 题</span>
          </div>
          <div class="card-grid">
            <div
              v-for="(q, idx) in questions"
              :key="q.id"
              class="card-cell"
              :class="getAnswerCardClass(idx)"
              @click="currentIndex = idx"
            >
              {{ idx + 1 }}
            </div>
          </div>
          <div class="card-legend">
            <span class="legend-item answered">■ 已答</span>
            <span class="legend-item current">● 当前</span>
            <span class="legend-item unanswered">○ 未答</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 视图3: 练习完成页 ==================== -->
    <div v-else class="finish-view">
      <div class="finish-card">
        <div class="finish-icon">🎉</div>
        <h2 class="finish-title">练习完成！</h2>
        <div class="finish-stats">
          <div class="stat-item">
            <span class="stat-label">总题数</span>
            <span class="stat-value">{{ questions.length }}</span>
          </div>
          <div class="stat-item correct">
            <span class="stat-label">正确</span>
            <span class="stat-value">{{ correctCount }}</span>
          </div>
          <div class="stat-item wrong">
            <span class="stat-label">错误</span>
            <span class="stat-value">{{ wrongCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">正确率</span>
            <span class="stat-value">{{ correctRate }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ formatTime(elapsedTime) }}</span>
          </div>
        </div>
        <div class="finish-actions">
          <button class="btn-restart" @click="restartPractice">再次练习</button>
          <button class="btn-back" @click="practiceStarted = false; practiceFinished = false">返回配置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useQuestionStore } from '../store/question'
import { useWrongStore } from '../store/wrong'
import { ElMessage } from 'element-plus'
import api from '../utils/api'

const qs = useQuestionStore()
const ws = useWrongStore()

const practiceStarted = ref(false)
const practiceFinished = ref(false)
const questions = ref([])
const currentIndex = ref(0)
const myAnswer = ref('')
const showResult = ref(false)
const isCorrect = ref(null)
const elapsedTime = ref(0)
let timer = null

const config = ref({
  subject: '',
  types: [],
  count: 10,
  difficulty: 0
})

const subjects = computed(() => qs.subjects)
const availableQuestionTypes = computed(() => qs.questionTypes)

const typeAvailability = computed(() => {
  const avail = {}
  const subjectQs = qs.allQuestions.filter(q => q.subject === config.value.subject)
  qs.questionTypes.forEach(t => {
    avail[t.name] = subjectQs.filter(q => q.type === t.name).length
  })
  return avail
})

const filteredCount = computed(() => {
  let list = qs.allQuestions.filter(q => q.subject === config.value.subject)
  if (config.value.types.length > 0) {
    list = list.filter(q => config.value.types.includes(q.type))
  }
  if (config.value.difficulty > 0) {
    list = list.filter(q => (q.difficulty || 3) === config.value.difficulty)
  }
  return list.length
})

const currentQuestion = computed(() => questions.value[currentIndex.value])

const correctCount = ref(0)
const wrongCount = ref(0)
const correctRate = computed(() => {
  if (questions.value.length === 0) return 0
  return Math.round((correctCount.value / questions.value.length) * 100)
})

const markedSet = ref(new Set())

// 监听科目变化，重新计算题型可用性
watch(() => config.value.subject, async (newSubject) => {
  config.value.types = []
  // 如果 allQuestions 为空，尝试从 API 重新加载
  if (qs.allQuestions.length === 0) {
    try {
      await qs.loadQuestions()
    } catch (e) {
      console.warn('加载题目失败:', e)
    }
  }
})

function onSubjectChange() {
  // 这个函数现在由 watcher 处理
}

function startPractice() {
  let list = qs.allQuestions.filter(q => q.subject === config.value.subject)
  if (config.value.types.length > 0) {
    list = list.filter(q => config.value.types.includes(q.type))
  }
  if (config.value.difficulty > 0) {
    list = list.filter(q => (q.difficulty || 3) === config.value.difficulty)
  }
  if (config.value.count > 0 && config.value.count < list.length) {
    list = list.slice(0, config.value.count)
  }

  questions.value = list
  userAnswers.value = new Array(list.length).fill('')
  currentIndex.value = 0
  myAnswer.value = ''
  showResult.value = false
  isCorrect.value = null
  practiceStarted.value = true
  elapsedTime.value = 0
  timer = setInterval(() => { elapsedTime.value++ }, 1000)
}

function isOptionSelected(label) {
  const ans = userAnswers.value[currentIndex.value] || ''
  if (currentQuestion.value?.type === '多选') {
    return ans.includes(label)
  }
  return ans === label
}

function selectOption(label) {
  if (currentQuestion.value?.type === '多选') {
    let arr = (myAnswer.value || '').split('').filter(l => l)
    if (arr.includes(label)) arr = arr.filter(l => l !== label)
    else arr.push(label)
    myAnswer.value = arr.sort().join('')
  } else {
    myAnswer.value = label
  }
  // 保存到用户答案数组
  userAnswers.value[currentIndex.value] = myAnswer.value
}

function checkAnswer() {
  if (!myAnswer.value) {
    ElMessage.warning('请先选择答案')
    return
  }

  showResult.value = true

  // 判题逻辑
  const correct = currentQuestion.value.answer
  if (currentQuestion.value.type === '多选') {
    const mySorted = (myAnswer.value || '').split('').filter(c => /[A-D]/i.test(c)).map(c => c.toUpperCase()).sort().join('')
    const correctSorted = (correct || '').split('').filter(c => /[A-D]/i.test(c)).map(c => c.toUpperCase()).sort().join('')
    isCorrect.value = mySorted === correctSorted
  } else {
    isCorrect.value = myAnswer.value === correct
  }

  // 保存到用户答案数组
  userAnswers.value[currentIndex.value] = myAnswer.value

  if (isCorrect.value) {
    correctCount.value++
  } else {
    wrongCount.value++
    ws.add(currentQuestion.value.id, myAnswer.value, currentQuestion.value)
  }
}

function finishPractice() {
  clearInterval(timer)
  practiceFinished.value = true
}

function restartPractice() {
  currentIndex.value = 0
  myAnswer.value = ''
  showResult.value = false
  isCorrect.value = null
  correctCount.value = 0
  wrongCount.value = 0
  practiceFinished.value = false
  userAnswers.value = []
  startPractice()
}

function confirmExit() {
  practiceStarted.value = false
  practiceFinished.value = false
  if (timer) clearInterval(timer)
}

function toggleMark() {
  const qId = currentQuestion.value?.id
  if (!qId) return
  if (markedSet.value.has(qId)) {
    markedSet.value.delete(qId)
  } else {
    markedSet.value.add(qId)
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getTypeColor(typeName) {
  const t = qs.questionTypes.find(t => t.name === typeName)
  return t?.color || '#10b981'
}

const userAnswers = ref([])

// 题目切换时加载答案
watch(currentIndex, (idx) => {
  myAnswer.value = userAnswers.value[idx] || ''
  showResult.value = false
  isCorrect.value = null
})

function getAnswerCardClass(idx) {
  if (idx === currentIndex.value) return 'current'
  if (userAnswers.value[idx]) return 'answered'
  return 'unanswered'
}

const resumeData = ref(null)

function clearPracticeProgress() {
  resumeData.value = null
}

function doResume() {
  ElMessage.info('恢复练习功能开发中')
}

onMounted(async () => {
  if (qs.allQuestions.length === 0) {
    await qs.fetchQuestions()
  }
  if (qs.subjects.length > 0) {
    config.value.subject = qs.subjects[0]
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.practice-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px;
  min-height: 100vh;
}

/* ==================== 视图1: 配置页 ==================== */
.config-view {
  animation: fadeIn 0.3s ease;
}

.config-container {
  max-width: 680px;
  margin: 0 auto;
}

.config-hero {
  text-align: center;
  margin-bottom: 32px;
}

.config-title {
  font-size: 32px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.config-desc {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

/* 恢复练习提示 */
.resume-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 1px solid #a7f3d0;
  border-radius: 12px;
  margin-bottom: 24px;
}

.resume-icon {
  font-size: 32px;
}

.resume-info {
  flex: 1;
}

.resume-title {
  font-weight: 700;
  color: #065f46;
  margin: 0 0 4px;
}

.resume-detail {
  color: #047857;
  margin: 0;
  font-size: 14px;
}

.resume-actions {
  display: flex;
  gap: 8px;
}

.btn-resume {
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-resume:hover {
  background: #059669;
}

.btn-clear {
  padding: 8px 16px;
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #f9fafb;
}

/* 配置卡片 */
.config-card {
  background: white;
  border-radius: 16px;
  padding: 28px 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 10px;
}

.form-select {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #1f2937;
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.type-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #4b5563;
}

.type-checkbox:hover {
  border-color: #10b981;
  background: #ecfdf5;
}

.type-checkbox.active {
  border-color: #10b981;
  background: #ecfdf5;
  color: #047857;
  font-weight: 600;
}

.type-checkbox input {
  display: none;
}

.type-count {
  color: #9ca3af;
  font-size: 12px;
}

.number-input-group {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
}

.num-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.num-btn:hover {
  background: #ecfdf5;
  color: #10b981;
}

.num-input {
  width: 60px;
  height: 40px;
  border: none;
  border-left: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  background: white;
  outline: none;
}

.difficulty-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.diff-btn {
  padding: 8px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  background: #fafafa;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.diff-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

.diff-btn.active {
  border-color: #10b981;
  background: #ecfdf5;
  color: #047857;
  font-weight: 700;
}

/* 开始练习 */
.start-section {
  text-align: center;
}

.available-count {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
}

.btn-start {
  display: inline-block;
  padding: 14px 48px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
}

.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== 视图2: 答题页 ==================== */
.answering-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
  animation: fadeIn 0.3s ease;
}

.answer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb {
  font-size: 14px;
  color: #6b7280;
}

.question-progress {
  font-size: 14px;
  color: #10b981;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-mark {
  padding: 6px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.btn-mark:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-mark.marked {
  border-color: #f59e0b;
  color: #f59e0b;
  background: #fffbeb;
}

.timer {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  padding: 6px 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.btn-submit {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover {
  background: #dc2626;
}

/* 答题主体 */
.answer-body {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.question-panel {
  flex: 1;
  overflow-y: auto;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.question-meta {
  margin-bottom: 16px;
}

.type-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: white;
  font-weight: 600;
}

.question-text {
  margin-bottom: 24px;
}

.question-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.6;
  margin: 0;
}

/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover {
  border-color: #10b981;
  background: #f0fdf4;
}

.option-item.selected {
  border-color: #10b981;
  background: #ecfdf5;
}

.option-circle {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.2s;
}

.option-item.selected .option-circle {
  border-color: #10b981;
  background: #10b981;
}

.option-label {
  font-weight: 600;
  color: #374151;
  min-width: 30px;
}

.option-text {
  color: #1f2937;
  line-height: 1.5;
}

/* 主观题输入 */
.subjective-input {
  margin-bottom: 24px;
}

.answer-textarea {
  width: 100%;
  padding: 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #1f2937;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
}

.answer-textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* 答题操作 */
.answer-actions {
  margin-bottom: 20px;
}

.btn-submit-answer {
  padding: 12px 32px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit-answer:hover {
  background: #059669;
  transform: translateY(-1px);
}

/* 结果区域 */
.result-area {
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 20px;
}

.result-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-weight: 600;
}

.result-banner.correct {
  background: #d1fae5;
  color: #065f46;
}

.result-banner.wrong {
  background: #fee2e2;
  color: #991b1b;
}

.result-icon {
  font-size: 18px;
}

.answer-reference {
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.ref-title {
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

.ref-content {
  color: #10b981;
  font-weight: 500;
  margin: 0;
}

/* 底部导航 */
.page-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}

.btn-nav {
  padding: 10px 20px;
  background: white;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-nav:hover:not(:disabled) {
  border-color: #10b981;
  color: #10b981;
}

.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-finish {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.btn-finish:hover {
  background: #059669;
}

/* 答题卡面板 */
.answer-card-panel {
  width: 240px;
  flex-shrink: 0;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.card-total {
  font-size: 13px;
  color: #6b7280;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.card-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f7fa;
  color: #6b7280;
}

.card-cell:hover {
  background: #e5e7eb;
}

.card-cell.current {
  background: #10b981;
  color: white;
}

.card-cell.answered {
  background: #d1fae5;
  color: #065f46;
}

.card-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ==================== 视图3: 完成页 ==================== */
.finish-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  animation: fadeIn 0.3s ease;
}

.finish-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  max-width: 500px;
  width: 100%;
}

.finish-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.finish-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 24px;
}

.finish-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
}

.stat-item.correct {
  background: #ecfdf5;
}

.stat-item.wrong {
  background: #fef2f2;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: #1a1a2e;
}

.stat-item.correct .stat-value {
  color: #10b981;
}

.stat-item.wrong .stat-value {
  color: #ef4444;
}

.finish-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-restart {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-restart:hover {
  background: #059669;
}

.btn-back {
  padding: 12px 24px;
  background: white;
  color: #6b7280;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f9fafb;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
