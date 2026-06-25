<template>
  <div class="exam-page">
    <!-- ==================== 视图1: 组卷配置页 ==================== -->
    <div v-if="!examStarted" class="config-view">
      <div class="config-container">
        <div class="config-hero">
          <h1 class="config-title">🎯 模拟考试</h1>
          <p class="config-desc">选择组卷方式，一键生成个性化试卷</p>
        </div>

        <!-- Tab 切换 -->
        <div class="config-tabs">
          <button
            :class="['tab-btn', { active: examMode === 'manual' }]"
            @click="examMode = 'manual'"
          >
            <span class="tab-icon">📋</span> 手动组卷
          </button>
          <button
            :class="['tab-btn', { active: examMode === 'ai' }]"
            @click="examMode = 'ai'"
          >
            <span class="tab-icon">🤖</span> AI智能组卷
          </button>
        </div>

        <!-- 手动组卷 -->
        <div v-if="examMode === 'manual'" class="manual-section">
          <div class="config-card">
            <!-- 选择科目 -->
            <div class="form-group">
              <label class="form-label">选择科目</label>
              <select v-model="examConfig.subject" class="form-select" @change="onSubjectChange">
                <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <!-- 题型分配 -->
            <div class="form-group">
              <label class="form-label">题型分配</label>
              <div class="type-table">
                <div class="tt-header">
                  <span class="tt-col">题型</span>
                  <span class="tt-col">题数</span>
                  <span class="tt-col">每题分值</span>
                  <span class="tt-col">小计</span>
                </div>
                <div v-for="t in questionTypes" :key="t.name" class="tt-row">
                  <span class="tt-type" :style="{ color: t.color }">{{ t.name }}</span>
                  <span class="tt-count">
                    <input
                      type="number"
                      v-model.number="typeCounts[t.name]"
                      class="tt-input"
                      min="0"
                      :max="typeAvailability[t.name] || 0"
                    />
                  </span>
                  <span class="tt-score">
                    <input
                      type="number"
                      v-model.number="typeScores[t.name]"
                      class="tt-input"
                      min="0"
                      max="100"
                    />
                  </span>
                  <span class="tt-total">{{ (typeCounts[t.name] || 0) * (typeScores[t.name] || 0) }}分</span>
                </div>
                <div class="tt-footer">
                  <span>总计: <strong>{{ totalCount }}</strong> 题</span>
                  <span>总分: <strong>{{ totalScore }}</strong> 分</span>
                </div>
              </div>
            </div>

            <!-- 难度 -->
            <div class="form-group">
              <label class="form-label">难度</label>
              <select v-model="examConfig.difficulty" class="form-select">
                <option value="default">先易后难</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
          </div>

          <!-- 生成试卷按钮 -->
          <button class="btn-generate" @click="startExam" :disabled="totalCount === 0">
            生成试卷 ({{ totalCount }} 题)
          </button>
        </div>

        <!-- AI智能组卷 -->
        <div v-if="examMode === 'ai'" class="ai-section">
          <div class="ai-card">
            <div class="ai-header">
              <div class="ai-avatar">🤖</div>
              <h3 class="ai-title">AI智能组卷</h3>
              <p class="ai-desc">描述考试需求，AI自动解析并生成试卷</p>
            </div>
            <div class="ai-input-area">
              <textarea
                v-model="aiExamPrompt"
                class="ai-textarea"
                rows="4"
                placeholder="例如：出一份软件测试期末考试卷，单选20道、多选10道，难度中等"
              ></textarea>
              <button class="btn-ai-parse" @click="parseAiExamRequest" :disabled="!aiExamPrompt.trim()">
                🤖 AI解析需求
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 视图2: 答题页 ==================== -->
    <div v-else-if="!examFinished" class="answering-view">
      <!-- 顶部栏 -->
      <div class="answer-header">
        <div class="header-left">
          <span class="exam-name">{{ examConfig.subject }} 模拟考试</span>
          <span class="question-progress">第 {{ currentIndex + 1 }} 题 / 共 {{ questions.length }} 题</span>
        </div>
        <div class="header-right">
          <span class="timer" :class="{ danger: elapsedTime > 3600 }">
            ⏱ {{ formatTime(elapsedTime) }}
          </span>
          <button class="btn-submit-exam" @click="finishExam">交卷</button>
        </div>
      </div>

      <!-- 主体内容 -->
      <div class="answer-body">
        <!-- 题目区域 -->
        <div class="question-area">
          <div class="question-card">
            <div class="question-type-badge">
              <span class="badge" :style="{ background: getTypeColor(currentQuestion?.type) }">
                {{ currentQuestion?.type }}
              </span>
              <span class="score">{{ typeScores[currentQuestion?.type] || 2 }}分</span>
            </div>

            <div class="question-content">
              <h3 class="question-text">{{ currentQuestion?.question }}</h3>

              <!-- 选项 -->
              <div v-if="['单选', '多选'].includes(currentQuestion?.type)" class="options-list">
                <div
                  v-for="(opt, idx) in currentQuestion?.options"
                  :key="idx"
                  class="option-item"
                  :class="{ selected: isOptionSelected(opt.label) }"
                  @click="selectOption(opt.label)"
                >
                  <span class="option-letter">{{ opt.label }}</span>
                  <span class="option-text">{{ opt.text }}</span>
                </div>
              </div>

              <!-- 判断题 -->
              <div v-if="currentQuestion?.type === '判断'" class="options-list">
                <div class="option-item" :class="{ selected: answers[currentIndex]?.answer === '对' }" @click="setAnswer('对')">
                  <span class="option-letter">A</span>
                  <span class="option-text">对</span>
                </div>
                <div class="option-item" :class="{ selected: answers[currentIndex]?.answer === '错' }" @click="setAnswer('错')">
                  <span class="option-letter">B</span>
                  <span class="option-text">错</span>
                </div>
              </div>

              <!-- 主观题 -->
              <div v-if="!['单选', '多选', '判断'].includes(currentQuestion?.type)" class="subjective-input">
                <textarea
                  v-model="answers[currentIndex].answer"
                  class="answer-textarea"
                  :rows="6"
                  placeholder="请输入答案..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 底部导航 -->
          <div class="question-nav">
            <button
              class="nav-btn"
              :disabled="currentIndex === 0"
              @click="currentIndex = Math.max(0, currentIndex - 1)"
            >
              ← 上一题
            </button>
            <span class="nav-info">{{ currentIndex + 1 }} / {{ questions.length }}</span>
            <button
              class="nav-btn"
              :disabled="currentIndex === questions.length - 1"
              @click="currentIndex = Math.min(questions.length - 1, currentIndex + 1)"
            >
              下一题 →
            </button>
          </div>
        </div>

        <!-- 答题卡侧边栏 -->
        <div class="answer-card-sidebar">
          <div class="sidebar-header">
            <h3 class="sidebar-title">答题卡</h3>
            <span class="sidebar-total">{{ questions.length }} 题</span>
          </div>
          <div class="card-grid">
            <div
              v-for="(q, idx) in questions"
              :key="q.id"
              class="card-item"
              :class="getCardClass(idx)"
              @click="currentIndex = idx"
            >
              {{ idx + 1 }}
            </div>
          </div>
          <div class="card-legend">
            <span class="legend-item answered">● 已答</span>
            <span class="legend-item unanswered">○ 未答</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 视图3: 结果页 ==================== -->
    <div v-else-if="!reviewMode" class="result-view">
      <div class="result-card">
        <div class="result-header">
          <div class="score-circle">
            <span class="score-number">{{ examResult.score }}</span>
            <span class="score-total">/ {{ examResult.maxScore || totalScore }}</span>
          </div>
          <h2 class="result-title">考试完成！</h2>
        </div>

        <div class="result-stats">
          <div class="stat-item correct">
            <span class="stat-value">{{ correctCount }}</span>
            <span class="stat-label">正确</span>
          </div>
          <div class="stat-item wrong">
            <span class="stat-value">{{ questions.length - correctCount }}</span>
            <span class="stat-label">错误</span>
          </div>
          <div class="stat-item rate">
            <span class="stat-value">{{ Math.round(correctCount / questions.length * 100) }}%</span>
            <span class="stat-label">正确率</span>
          </div>
          <div class="stat-item time">
            <span class="stat-value">{{ formatTime(examResult.time || 0) }}</span>
            <span class="stat-label">用时</span>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-review" @click="startReview">查看试卷</button>
          <button class="btn-retry" @click="resetExam">再次考试</button>
        </div>
      </div>
    </div>

    <!-- ==================== 视图4: 试卷回顾 ==================== -->
    <div v-else class="review-view">
      <div class="review-header">
        <h2 class="review-title">📋 试卷回顾</h2>
        <button class="btn-back" @click="reviewMode = false; resetExam()">返回</button>
      </div>

      <div class="review-list">
        <div
          v-for="(q, idx) in questions"
          :key="q.id"
          class="review-item"
          :class="{ wrong: !isAnswerCorrect(q, idx) }"
        >
          <div class="review-question">
            <span class="review-num">{{ idx + 1 }}</span>
            <span class="review-type" :style="{ background: getTypeColor(q.type) }">{{ q.type }}</span>
            <span class="review-text">{{ q.question }}</span>
          </div>
          <div class="review-answer">
            <p class="my-answer">你的答案：{{ answers[idx]?.answer || '未答' }}</p>
            <p class="correct-answer">正确答案：{{ q.answer }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuestionStore } from '../store/question'
import { useWrongStore } from '../store/wrong'
import { ElMessage } from 'element-plus'
import api from '../utils/api'

const qs = useQuestionStore()
const ws = useWrongStore()

const examStarted = ref(false)
const examFinished = ref(false)
const reviewMode = ref(false)
const questions = ref([])
const answers = ref([])
const currentIndex = ref(0)
const elapsedTime = ref(0)
let timer = null

const examMode = ref('manual')
const examConfig = ref({ subject: '', difficulty: 'default' })
const typeCounts = ref({})
const typeScores = ref({})
const typeAvailability = ref({})

const aiExamPrompt = ref('')

const examResult = ref({})
const correctCount = computed(() => {
  let count = 0
  questions.value.forEach((q, idx) => {
    if (isAnswerCorrect(q, idx)) count++
  })
  return count
})

const subjects = computed(() => qs.subjects)
const questionTypes = computed(() => qs.questionTypes)

const totalCount = computed(() => {
  return Object.values(typeCounts.value).reduce((sum, val) => sum + (val || 0), 0)
})

const totalScore = computed(() => {
  return Object.entries(typeCounts.value).reduce((sum, [type, count]) => {
    return sum + (count || 0) * (typeScores.value[type] || 0)
  }, 0)
})

const currentQuestion = computed(() => questions.value[currentIndex.value])

function onSubjectChange() {
  const avail = {}
  const subjectQs = qs.allQuestions.filter(q => q.subject === examConfig.value.subject)
  questionTypes.value.forEach(t => {
    avail[t.name] = subjectQs.filter(q => q.type === t.name).length
  })
  typeAvailability.value = avail
}

function startExam() {
  let selected = []
  const subjectQs = qs.allQuestions.filter(q => q.subject === examConfig.value.subject)

  Object.entries(typeCounts.value).forEach(([type, count]) => {
    if (count > 0) {
      const pool = subjectQs.filter(q => q.type === type)
      selected.push(...pool.slice(0, count))
    }
  })

  if (selected.length === 0) {
    ElMessage.warning('请至少选择一些题目')
    return
  }

  questions.value = selected
  answers.value = questions.value.map(() => ({ answer: '' }))
  currentIndex.value = 0
  examStarted.value = true
  elapsedTime.value = 0
  timer = setInterval(() => { elapsedTime.value++ }, 1000)
}

function isOptionSelected(label) {
  const ans = answers.value[currentIndex.value]?.answer
  if (currentQuestion.value?.type === '多选') {
    return (ans || '').includes(label)
  }
  return ans === label
}

function selectOption(label) {
  if (currentQuestion.value?.type === '多选') {
    let arr = (answers.value[currentIndex.value].answer || '').split('').filter(l => l)
    if (arr.includes(label)) arr = arr.filter(l => l !== label)
    else arr.push(label)
    answers.value[currentIndex.value].answer = arr.sort().join('')
  } else {
    answers.value[currentIndex.value].answer = label
  }
}

function setAnswer(val) {
  answers.value[currentIndex.value].answer = val
}

function finishExam() {
  clearInterval(timer)
  const score = Math.round((correctCount.value / questions.value.length) * 100)
  examResult.value = {
    score,
    time: elapsedTime.value,
    total: questions.value.length,
    correct: correctCount.value
  }
  examFinished.value = true

  // 添加到错题本
  questions.value.forEach((q, idx) => {
    if (!isAnswerCorrect(q, idx)) {
      ws.add(q.id, answers.value[idx]?.answer || '未答', q)
    }
  })
}

function isAnswerCorrect(q, idx) {
  const myA = answers.value[idx]?.answer
  if (!myA) return false
  if (q.type === '多选') {
    const normalize = (ans) => ans.split('').filter(c => /[A-D]/i.test(c)).map(c => c.toUpperCase()).sort().join('')
    return normalize(myA) === normalize(q.answer)
  }
  return myA === q.answer
}

function startReview() {
  reviewMode.value = true
}

function resetExam() {
  examStarted.value = false
  examFinished.value = false
  reviewMode.value = false
  questions.value = []
  answers.value = []
  currentIndex.value = 0
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getTypeColor(typeName) {
  const t = questionTypes.value.find(t => t.name === typeName)
  return t?.color || '#10b981'
}

function getCardClass(idx) {
  if (answers.value[idx]?.answer) return 'answered'
  return 'unanswered'
}

async function parseAiExamRequest() {
  if (!aiExamPrompt.value.trim()) {
    ElMessage.warning('请输入考试需求描述')
    return
  }
  ElMessage.info('AI组卷功能开发中，当前使用手动组卷')
}

onMounted(async () => {
  if (qs.allQuestions.length === 0) {
    await qs.fetchQuestions()
  }
  if (qs.subjects.length > 0) {
    examConfig.value.subject = qs.subjects[0]
    onSubjectChange()
  }
  // 初始化题型数量和分值
  questionTypes.value.forEach(t => {
    typeCounts.value[t.name] = 0
    typeScores.value[t.name] = t.name === '综合题' ? 10 : (t.name === '简答' || t.name === '分析') ? 5 : 2
  })
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.exam-page {
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
  max-width: 800px;
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

/* Tab 切换 */
.config-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #909399;
  border-radius: 10px;
  transition: all 0.25s;
}

.tab-btn:hover {
  color: #10b981;
}

.tab-btn.active {
  background: #10b981;
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
}

.tab-icon {
  font-size: 18px;
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
  max-width: 320px;
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #1f2937;
  background: white;
  cursor: pointer;
}

/* 题型表格 */
.type-table {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.tt-header {
  display: grid;
  grid-template-columns: 1fr 100px 100px 80px;
  background: #f9fafb;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

.tt-col {
  text-align: center;
}

.tt-col:first-child {
  text-align: left;
}

.tt-row {
  display: grid;
  grid-template-columns: 1fr 100px 100px 80px;
  padding: 10px 16px;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
}

.tt-row:last-child {
  border-bottom: none;
}

.tt-type {
  font-weight: 600;
  font-size: 14px;
}

.tt-count,
.tt-score {
  text-align: center;
}

.tt-input {
  width: 60px;
  padding: 6px 8px;
  border: 1.5px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  color: #1f2937;
}

.tt-total {
  text-align: center;
  font-weight: 600;
  color: #10b981;
}

.tt-footer {
  display: flex;
  justify-content: space-around;
  padding: 14px 16px;
  background: #ecfdf5;
  font-size: 14px;
  color: #374151;
  border-top: 2px solid #d1fae5;
}

.tt-footer strong {
  color: #10b981;
}

/* 生成按钮 */
.btn-generate {
  display: block;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 14px 28px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-generate:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* AI 区域 */
.ai-section {
  animation: fadeIn 0.3s ease;
}

.ai-card {
  background: white;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.ai-header {
  text-align: center;
  margin-bottom: 24px;
}

.ai-avatar {
  font-size: 48px;
  margin-bottom: 12px;
}

.ai-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.ai-desc {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.ai-input-area {
  max-width: 600px;
  margin: 0 auto;
}

.ai-textarea {
  width: 100%;
  padding: 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #1f2937;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 16px;
}

.ai-textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.btn-ai-parse {
  display: block;
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ai-parse:hover:not(:disabled) {
  background: #059669;
}

.btn-ai-parse:disabled {
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
  gap: 16px;
}

.exam-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
}

.question-progress {
  font-size: 14px;
  color: #10b981;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.timer {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
  padding: 8px 14px;
  background: #f5f7fa;
  border-radius: 8px;
}

.timer.danger {
  color: #ef4444;
  background: #fef2f2;
}

.btn-submit-exam {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit-exam:hover {
  background: #dc2626;
}

/* 答题主体 */
.answer-body {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.question-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.question-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.question-type-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: white;
  font-weight: 600;
}

.score {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.question-content {
  margin-bottom: 20px;
}

.question-text {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.6;
  margin: 0 0 20px;
}

/* 选项 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.option-letter {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f7fa;
  font-weight: 700;
  color: #374151;
  flex-shrink: 0;
}

.option-item.selected .option-letter {
  background: #10b981;
  color: white;
}

.option-text {
  color: #1f2937;
  line-height: 1.5;
}

/* 主观题输入 */
.subjective-input {
  margin-top: 16px;
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
}

.answer-textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* 底部导航 */
.question-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.nav-btn {
  padding: 10px 20px;
  background: white;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  border-color: #10b981;
  color: #10b981;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-info {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* 答题卡侧边栏 */
.answer-card-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.sidebar-total {
  font-size: 13px;
  color: #6b7280;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.card-item {
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

.card-item:hover {
  background: #e5e7eb;
}

.card-item.answered {
  background: #d1fae5;
  color: #065f46;
}

.card-item.current {
  background: #10b981;
  color: white;
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

/* ==================== 视图3: 结果页 ==================== */
.result-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  animation: fadeIn 0.3s ease;
}

.result-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  max-width: 600px;
  width: 100%;
}

.result-header {
  margin-bottom: 32px;
}

.score-circle {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 16px;
}

.score-number {
  font-size: 64px;
  font-weight: 800;
  color: #10b981;
}

.score-total {
  font-size: 24px;
  color: #6b7280;
  font-weight: 600;
}

.result-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 12px;
  background: #f9fafb;
  border-radius: 10px;
}

.stat-item.correct {
  background: #ecfdf5;
}

.stat-item.wrong {
  background: #fef2f2;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a2e;
}

.stat-item.correct .stat-value {
  color: #10b981;
}

.stat-item.wrong .stat-value {
  color: #ef4444;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-review {
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

.btn-review:hover {
  background: #059669;
}

.btn-retry {
  padding: 12px 24px;
  background: white;
  color: #6b7280;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: #f9fafb;
}

/* ==================== 视图4: 回顾页 ==================== */
.review-view {
  animation: fadeIn 0.3s ease;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.review-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0;
}

.btn-back {
  padding: 10px 20px;
  background: white;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  border-color: #10b981;
  color: #10b981;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #10b981;
}

.review-item.wrong {
  border-left-color: #ef4444;
}

.review-question {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.review-num {
  font-size: 16px;
  font-weight: 700;
  color: #10b981;
  flex-shrink: 0;
}

.review-type {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: white;
  font-weight: 500;
  flex-shrink: 0;
}

.review-text {
  font-size: 15px;
  color: #1a1a2e;
  line-height: 1.6;
}

.review-answer {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.my-answer {
  margin: 0 0 8px;
  color: #374151;
}

.correct-answer {
  margin: 0;
  color: #10b981;
  font-weight: 500;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
