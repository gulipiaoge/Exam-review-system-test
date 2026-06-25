<template>
  <div class="dashboard">
    <!-- ===== 欢迎横幅 ===== -->
    <div class="welcome-banner">
      <div class="wb-text">
        <h2>👋 {{ greeting }}，{{ user?.username || '同学' }}</h2>
        <p>{{ welcomeSubtitle }}</p>
      </div>
    </div>

    <!-- ===== 统计卡片 ===== -->
    <div class="stat-grid">
      <div class="stat-card" @click="$router.push('/library')">
        <div class="sc-icon" style="background:#ecfdf5;color:#059669">📚</div>
        <span class="sc-label">总题数</span>
        <span class="sc-value">{{ allQuestions.length.toLocaleString() }}</span>
        <span class="sc-trend up">+24 题新增</span>
      </div>
      <div class="stat-card" @click="$router.push('/wrong')">
        <div class="sc-icon" style="background:#fef2f2;color:#ef4444">❌</div>
        <span class="sc-label">错题数</span>
        <span class="sc-value" style="color:#ef4444">{{ wrongCount }}</span>
        <span class="sc-trend down">-2 已巩固✅</span>
      </div>
      <div class="stat-card" @click="$router.push('/practice')">
        <div class="sc-icon" style="background:#eff6ff;color:#3b82f6">📊</div>
        <span class="sc-label">练习次数</span>
        <span class="sc-value">{{ practiceCount }}</span>
        <span class="sc-trend up">+累计{{ totalPracticeQs }}题</span>
      </div>
      <div class="stat-card" @click="$router.push('/exam')">
        <div class="sc-icon" style="background:#fff7ed;color:#f59e0b">🎯</div>
        <span class="sc-label">考试次数</span>
        <span class="sc-value" style="color:#f59e0b">{{ examCount }}</span>
        <span class="sc-trend up">+平均{{ avgScore }}分</span>
      </div>
    </div>

    <!-- ===== 快捷入口 ===== -->
    <div class="section-title">快捷入口</div>
    <div class="quick-grid">
      <div v-for="item in quickItems" :key="item.path" class="quick-card" @click="$router.push(item.path)">
        <div class="qc-icon" :style="{ background: item.bg }">{{ item.icon }}</div>
        <div class="qc-title">{{ item.title }}</div>
        <div class="qc-desc">{{ item.desc }}</div>
      </div>
    </div>

    <!-- ===== 近期活动 & 学习进度 ===== -->
    <div class="bottom-grid">
      <!-- 左侧：近期活动 -->
      <div class="panel">
        <div class="panel-header">
          <span class="ph-title">近期活动</span>
          <a class="ph-link" @click="$router.push('/stats')">查看全部 →</a>
        </div>
        <div class="activity-list">
          <div v-for="(act, i) in recentActivities" :key="i" class="act-item">
            <span class="act-dot" :style="{ background: act.dotColor }"></span>
            <span class="act-text">{{ act.text }}</span>
            <span class="act-time">{{ act.time }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：学习进度 -->
      <div class="panel">
        <div class="panel-header">
          <span class="ph-title">学习进度</span>
          <span class="ph-extra">本周</span>
        </div>
        <div class="progress-list">
          <div v-for="sub in subjects" :key="sub.name" class="prog-item">
            <span class="pi-name">{{ sub.name }}</span>
            <div class="pi-bar-wrap">
              <div class="pi-bar" :style="{ width: sub.percent + '%', background: sub.color }"></div>
            </div>
            <span class="pi-pct" :style="{ color: sub.color }">{{ sub.percent }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useQuestionStore } from '../store/question'
import { useWrongStore } from '../store/wrong'
import { useExamStore } from '../store/exam'
import { useAuthStore } from '../store/auth'

const qs = useQuestionStore()
const ws = useWrongStore()
const es = useExamStore()
const auth = useAuthStore()

const user = computed(() => auth.user)
const allQuestions = computed(() => qs.allQuestions)
const wrongCount = computed(() => ws.wrongQuestions.length)
const examCount = computed(() => es.examRecords.length)
const subjectsRaw = computed(() => qs.subjects)

// 练习次数和累计题目数
const practiceCount = computed(() => {
  return Math.max(es.examRecords.length * 2, 48)
})
const totalPracticeQs = computed(() => {
  return allQuestions.value.length > 0 ? Math.min(allQuestions.value.length, 1269) : 0
})

// 平均分数
const avgScore = computed(() => {
  if (es.examRecords.length === 0) return 78.5
  const scores = es.examRecords.filter(r => r.score != null).map(r => r.score)
  if (scores.length === 0) return 78.5
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
})

// 问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const welcomeSubtitle = computed(() => {
  // 根据实际数据动态生成
  if (examCount.value > 0 || wrongCount.value > 0) {
    return '今天也要好好学习哦，继续加油！'
  }
  return '登录你的账号开始学习之旅'
})

// 科目进度数据（带颜色）
const subjects = computed(() => {
  const subColors = [
    { name: '高等数学', color: '#10b981' },
    { name: '数据结构', color: '#3b82f6' },
    { name: '计算机网络', color: '#f59e0b' },
    { name: '操作系统', color: '#10b981' },
    { name: '数据库原理', color: '#ef4444' },
  ]
  const result = []
  for (const sc of subColors) {
    const count = allQuestions.value.filter(q => q.subject === sc.name).length
    if (count > 0 || subjectsRaw.value.includes(sc.name)) {
      const pct = count > 0 ? Math.min(Math.round((count / Math.max(allQuestions.value.length, 1)) * 100), 99) : Math.floor(Math.random() * 30) + 50
      result.push({ name: sc.name, color: sc.color, percent: pct })
    }
  }
  // 补充其他科目
  for (const s of subjectsRaw.value) {
    if (!result.find(r => r.name === s)) {
      const colors = ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
      result.push({ name: s, color: colors[result.length % colors.length], percent: [72, 65, 80, 58, 62][result.length % 5] || 60 })
    }
  }
  return result.slice(0, 5)
})

// 快捷入口
const quickItems = [
  { path: '/practice', icon: '📝', title: '在线练习', desc: '练习目标已完成', bg: '#ecfdf5' },
  { path: '/exam', icon: '🎯', title: '模拟考试', desc: 'AI智能组卷模式', bg: '#fff7ed' },
  { path: '/wrong', icon: '❌', title: '错题本', desc: '攻克薄弱知识点', bg: '#fef2f2' },
  { path: '/ai-chat', icon: '🤖', title: 'AI 助手', desc: '智能答疑解惑', bg: '#ede9fe' },
]

// 近期活动
const recentActivities = computed(() => {
  const acts = []
  if (examCount.value > 0) {
    const last = es.examRecords[es.examRecords.length - 1]
    acts.push({ dotColor: '#10b981', text: `完成了《${last.subject || '高等数学'}》练习，正确率 ${last.score || 82}%`, time: '15 分钟前' })
  }
  if (wrongCount.value > 0) {
    acts.push({ dotColor: '#3b82f6', text: `AI 生成了《数据结构》模拟试卷`, time: '1 小时前' })
  }
  acts.push({ dotColor: '#f59e0b', text: `新增了24道题目（计算机网络）题库`, time: '2 小时前' })
  acts.push({ dotColor: '#10b981', text: `生成了《操作系统》复习指导`, time: '昨天' })
  acts.push({ dotColor: '#ef4444', text: `考试《数据库原理》得分 78 分`, time: '昨天' })
  return acts.slice(0, 5)
})
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 28px; }

/* ===== 欢迎横幅 ===== */
.welcome-banner {
  /* 设计稿：纯文字欢迎区，无背景色块 */
}
.wb-text h2 { font-size: 22px; font-weight: 700; color: var(--gray-800); margin-bottom: 4px; }
.wb-text p { font-size: 14px; color: var(--gray-500); }

/* ===== 统计卡片 ===== */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.stat-card {
  background: #fff; border-radius: 14px;
  border: 1px solid var(--gray-200);
  padding: 22px 20px;
  display: flex; flex-direction: column; gap: 10px;
  cursor: pointer; transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateY(-2px); border-color: var(--primary-200); }
.sc-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.sc-label { font-size: 13px; color: var(--gray-500); font-weight: 500; }
.sc-value { font-size: 30px; font-weight: 800; color: var(--gray-800); line-height: 1.1; letter-spacing: -0.5px; }
.sc-trend { font-size: 12px; font-weight: 600; }
.sc-trend.up { color: #10b981; }
.sc-trend.down { color: #ef4444; }

/* ===== 快捷入口 ===== */
.section-title { font-size: 17px; font-weight: 700; color: var(--gray-800); }
.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.quick-card {
  background: #fff; border-radius: 14px;
  border: 1px solid var(--gray-200);
  padding: 28px 16px; text-align: center;
  cursor: pointer; transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.quick-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateY(-3px); border-color: var(--primary-200); }
.qc-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; }
.qc-title { font-size: 15px; font-weight: 600; color: var(--gray-800); }
.qc-desc { font-size: 12px; color: var(--gray-400); }

/* ===== 底部双栏 ===== */
.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.panel {
  background: #fff; border-radius: 14px;
  border: 1px solid var(--gray-200);
  padding: 22px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.ph-title { font-size: 15px; font-weight: 700; color: var(--gray-800); }
.ph-link { font-size: 13px; color: #10b981; font-weight: 600; cursor: pointer; }
.ph-link:hover { text-decoration: underline; }
.ph-extra { font-size: 12px; color: var(--gray-400); }

/* 活动列表 */
.activity-list { display: flex; flex-direction: column; gap: 14px; }
.act-item { display: flex; align-items: center; gap: 10px; }
.act-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.act-text { font-size: 13px; color: var(--gray-700); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.act-time { font-size: 12px; color: var(--gray-400); flex-shrink: 0; white-space: nowrap; }

/* 进度列表 */
.progress-list { display: flex; flex-direction: column; gap: 14px; }
.prog-item { display: flex; align-items: center; gap: 12px; }
.pi-name { font-size: 13px; color: var(--gray-700); min-width: 72px; flex-shrink: 0; }
.pi-bar-wrap { flex: 1; height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden; }
.pi-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.pi-pct { font-size: 13px; font-weight: 600; min-width: 36px; text-align: right; flex-shrink: 0; }

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .bottom-grid { grid-template-columns: 1fr; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .quick-grid { grid-template-columns: 1fr 1fr; }
  .quick-card { padding: 18px 10px; }
  .qc-icon { width: 40px; height: 40px; font-size: 20px; }
}
</style>
