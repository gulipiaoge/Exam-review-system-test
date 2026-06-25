<template>
  <div class="stats-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="ph-title">📊 学习统计</h2>
      <button class="btn btn-ghost btn-sm" @click="loadStats">🔄 刷新</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <p>加载中...</p>
    </div>

    <template v-else>
    <!-- 4个统计卡片 -->
    <div class="stat-cards-grid">
      <div class="scard">
        <div class="sc-icon" style="background:#ecfdf5;color:#059669">📚</div>
        <span class="sc-val">{{ stats.questionCount || 0 }}</span>
        <span class="sc-lbl">总题目数</span>
      </div>
      <div class="scard">
        <div class="sc-icon" style="background:#eff6ff;color:#3b82f6">📝</div>
        <span class="sc-val">{{ stats.practiceCount || 0 }}</span>
        <span class="sc-lbl">练习次数</span>
      </div>
      <div class="scard">
        <div class="sc-icon" style="background:#fff7ed;color:#f59e0b">🎯</div>
        <span class="sc-val">{{ stats.examCount || 0 }}</span>
        <span class="sc-lbl">考试次数</span>
      </div>
      <div class="scard">
        <div class="sc-icon" style="background:#ecfdf5;color:#10b981">%</div>
        <span class="sc-val" style="color:#10b981;font-size:32px">{{ stats.avgAccuracy }}%</span>
        <span class="sc-lbl">综合正确率</span>
      </div>
    </div>

    <!-- 双栏：科目分布 + 科目正确率 -->
    <div class="two-col">
      <!-- 左：科目分布 -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">📊 科目分布</span>
        </div>
        <div class="bar-chart" v-if="stats.subjectDistribution && stats.subjectDistribution.length > 0">
          <div v-for="(s, i) in stats.subjectDistribution" :key="i" class="bar-item">
            <div class="bi-bar-wrap"><div class="bi-bar" :style="{ width: s.pct + '%', background: getSubjectColor(s.name) }"></div></div>
            <span class="bi-label">{{ s.name }} ({{ s.count }})</span>
          </div>
        </div>
        <div v-else class="empty-msg">暂无数据</div>
      </div>

      <!-- 右：科目正确率 -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">✅ 科目正确率</span>
        </div>
        <div class="acc-list" v-if="stats.accuracyBySubject && stats.accuracyBySubject.length > 0">
          <div v-for="(s, i) in stats.accuracyBySubject" :key="i" class="acc-item">
            <span class="ai-name">{{ s.name }}</span>
            <div class="ai-bar-wrap"><div class="ai-bar" :style="{ width: s.val + '%', background: getSubjectColor(s.name) }"></div></div>
            <span class="ai-pct" :style="{ color: getSubjectColor(s.name) }">{{ s.val }}%</span>
          </div>
        </div>
        <div v-else class="empty-msg">暂无数据</div>
      </div>
    </div>

    <!-- 练习趋势图 -->
    <div class="panel trend-panel">
      <div class="panel-head">
        <span class="panel-title">📈 练习趋势（近7天）</span>
      </div>
      <div class="trend-chart" v-if="stats.weekTrend && stats.weekTrend.length > 0">
        <div v-for="(d, i) in stats.weekTrend" :key="i" class="tc-bar-group">
          <div class="tc-bar" :style="{ height: d.h + '%' }"></div>
          <span class="tc-day">{{ d.day }}</span>
          <span class="tc-count">{{ d.cnt }}题</span>
        </div>
      </div>
      <div v-else class="empty-msg">暂无数据</div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../utils/api.js'

const loading = ref(false)
const stats = reactive({
  questionCount: 0,
  practiceCount: 0,
  examCount: 0,
  wrongCount: 0,
  avgAccuracy: 0,
  subjectDistribution: [],
  accuracyBySubject: [],
  weekTrend: []
})

const subjectColorMap = {
  '高等数学': '#10b981',
  '数据结构': '#3b82f6',
  '计算机网络': '#f59e0b',
  '操作系统': '#ef4444',
  '数据库原理': '#8b5cf6',
  '软件测试': '#06b6d4',
  '默认': '#10b981'
}

function getSubjectColor(name) {
  return subjectColorMap[name] || subjectColorMap['默认']
}

async function loadStats() {
  loading.value = true
  try {
    // 从question store获取题目数据
    await qs.fetchQuestions()
    
    const allQuestions = qs.allQuestions || []
    
    // 总题目数
    stats.questionCount = allQuestions.length
    
    // 练习次数和考试次数（从localStorage获取）
    const practiceRecords = JSON.parse(localStorage.getItem('practice_records') || '[]')
    const examRecords = JSON.parse(localStorage.getItem('exam_records') || '[]')
    
    stats.practiceCount = practiceRecords.length
    stats.examCount = examRecords.length
    
    // 计算正确率（基于错题本）
    const wrongQuestions = JSON.parse(localStorage.getItem('exam_wrong_questions') || '[]')
    stats.wrongCount = wrongQuestions.length
    
    if (stats.practiceCount + stats.examCount > 0) {
      stats.avgAccuracy = Math.round((1 - stats.wrongCount / (stats.practiceCount + stats.examCount)) * 100)
    } else {
      stats.avgAccuracy = 0
    }
    
    // 科目分布
    const bySubject = {}
    allQuestions.forEach(q => {
      const subj = q.subject || '未分类'
      bySubject[subj] = (bySubject[subj] || 0) + 1
    })
    
    const total = allQuestions.length || 1
    stats.subjectDistribution = Object.entries(bySubject).map(([name, count]) => ({
      name,
      count,
      pct: Math.round(count / total * 100)
    }))
    
    // 科目正确率（模拟数据）
    stats.accuracyBySubject = Object.entries(bySubject).map(([name, count]) => ({
      name,
      val: Math.round(60 + Math.random() * 30) // 模拟60-90%的正确率
    }))
    
    // 练习趋势（最近7天）
    const last7 = getLast7Days()
    stats.weekTrend = last7.map(day => {
      const cnt = Math.floor(Math.random() * 20) // 模拟数据
      return { ...day, cnt, h: Math.min(cnt * 5, 100) }
    })
    
  } catch (err) {
    console.error('加载统计数据失败：', err)
    ElMessage.error('加载统计数据失败：' + err.message)
  }
  loading.value = false
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      day: ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()],
      label: d.toLocaleDateString('zh-CN')
    })
  }
  return days
}

onMounted(() => { loadStats() })
</script>

<style scoped>
.stats-page { display: flex; flex-direction: column; gap: 24px; }

/* 页面标题 */
.page-header { display: flex; align-items: center; justify-content: space-between; }
.ph-title { font-size: 20px; font-weight: 700; color: var(--gray-800); margin: 0; }

/* 统计卡片 */
.stat-cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.scard {
  background: #fff; border-radius: 14px; border: 1px solid var(--gray-200);
  padding: 22px 18px; display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.scard:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); transition: all 0.25s; }
.sc-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; align-self: flex-start; }
.sc-val { font-size: 28px; font-weight: 800; color: var(--gray-800); line-height: 1; }
.sc-lbl { font-size: 13px; color: var(--gray-500); }

/* 双栏布局 */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.panel {
  background: #fff; border-radius: 14px; border: 1px solid var(--gray-200);
  padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.panel-title { font-size: 15px; font-weight: 700; color: var(--gray-800); }

/* 科目条形图 */
.bar-chart { display: flex; flex-direction: column; gap: 16px; padding: 0 4px; }
.bar-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.bi-bar-wrap { width: 100%; height: 24px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.bi-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; min-width: 8px; }
.bi-label { font-size: 12px; color: var(--gray-500); }

/* 正确率列表 */
.acc-list { display: flex; flex-direction: column; gap: 16px; }
.acc-item { display: flex; align-items: center; gap: 12px; }
.ai-name { font-size: 13px; color: var(--gray-700); min-width: 72px; flex-shrink: 0; }
.ai-bar-wrap { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.ai-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.ai-pct { font-size: 13px; font-weight: 600; min-width: 36px; text-align: right; flex-shrink: 0; }

/* 趋势图 */
.trend-panel { margin-top: 0; }
.trend-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 160px; padding: 0 10px; gap: 8px; }
.tc-bar-group { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; height: 100%; justify-content: flex-end; }
.tc-bar { width: 28px; border-radius: 4px 4px 0 0; background: linear-gradient(to top, #a7f3d0, #10b981); min-height: 8px; transition: height 0.5s ease; }
.tc-day { font-size: 11px; color: var(--gray-400); }
.tc-count { font-size: 11px; color: var(--gray-600); font-weight: 600; }

.empty-msg { text-align: center; padding: 40px 20px; color: var(--gray-400); font-size: 13px; }

.loading-state { text-align: center; padding: 60px 20px; color: var(--gray-400); }

/* 响应式 */
@media (max-width: 1024px) { .stat-cards-grid { grid-template-columns: repeat(2, 1fr); } .two-col { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .stat-cards-grid { grid-template-columns: 1fr 1fr; } .two-col { grid-template-columns: 1fr; } }
</style>
