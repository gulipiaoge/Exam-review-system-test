<template>
  <div class="wrong-page">
    <!-- 页面标题栏 -->
    <div class="page-header">
      <h2 class="ph-title">❌ 错题本</h2>
      <div class="ph-actions">
        <div class="search-box">
          <span class="sb-icon">🔍</span>
          <input v-model="searchText" placeholder="搜索错题..." />
        </div>
        <button class="btn btn-ghost btn-sm" @click="clearAll" v-if="wrongQuestions.length > 0">🗑 一键清空</button>
      </div>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-tabs">
      <span :class="['ftab', { active: filterView === 'subject' }]" @click="filterView = 'subject'">科目</span>
      <span class="ftab-sep">/</span>
      <span :class="['ftab', { active: filterView === 'chapter' }]" @click="filterView = 'chapter'">章节</span>
      <span class="ftab-sep">/</span>
      <span :class="['ftab', { active: filterView === 'list' }]" @click="filterView = 'list'">错题列表</span>
    </div>

    <!-- 空状态 -->
    <div v-if="!ws.loading && wrongQuestions.length === 0" class="empty-state">
      <span class="empty-icon">🎉</span>
      <p>暂无错题，继续保持！</p>
    </div>

    <!-- 加载中 -->
    <div v-else-if="ws.loading && wrongQuestions.length === 0" class="empty-state">
      <span class="empty-icon">⏳</span>
      <p>正在加载...</p>
    </div>

    <!-- 三级折叠：科目 → 章节 → 题目 -->
    <div v-else class="wrong-tree">
      <div v-for="(subject, subjIdx) in ws.subjectsWithChapters" :key="'subj-' + subjIdx" class="subject-row" @click="toggleSubject(subjIdx)">
        <span class="sr-icon">{{ getSubjectIcon(subject.subject) }}</span>
        <span class="sr-name">{{ subject.subject }}</span>
        <span class="sr-count">{{ subject.totalQuestions }} 道错题 · {{ subject.chapters?.length || 0 }} 个章节</span>
        <span class="sr-arrow" :class="{ expanded: expandedSubjects[subjIdx] }">▶</span>
      </div>

      <!-- 章节列表 -->
      <template v-for="(subject, subjIdx) in ws.subjectsWithChapters" :key="'chlist-' + subjIdx">
        <div v-show="expandedSubjects[subjIdx]" class="chapter-list">
          <div v-for="(chapter, chIdx) in subject.chapters" :key="'ch-' + subjIdx + '-' + chIdx"
               class="chapter-row" @click="toggleChapter(subjIdx, chIdx)">
            <span class="cr-icon">🔗</span>
            <span class="cr-name">{{ chapter.name }}</span>
            <span class="cr-count">{{ chapter.count }} 道错题 · {{ chapter.count || 0 }} 个章节</span>
            <span class="cr-arrow" :class="{ expanded: chapterExpanded[subjIdx + '-' + chIdx] }">▶</span>
          </div>

          <!-- 题目列表 -->
          <div v-show="chapterExpanded[subjIdx + '-' + chIdx]" class="question-list">
            <div v-for="(chapter, chIdx) in subject.chapters" :key="'qlist-' + subjIdx + '-' + chIdx">
              <div v-show="chapterExpanded[subjIdx + '-' + chIdx]" class="q-section-header">
                <span class="qsh-icon">📄</span>
                <span class="qsh-name">{{ chapter.name }}</span>
                <span class="qsh-count">{{ chapter.count }} 道错题</span>
                <span class="qsh-arrow" :class="{ expanded: chapterExpanded[subjIdx + '-' + chIdx] }">▼</span>
              </div>
              <div v-show="chapterExpanded[subjIdx + '-' + chIdx]" class="q-items">
                <div v-for="(wq, qIdx) in chapter.questions" :key="'q-' + qIdx" class="wrong-q-card">
                  <!-- 题型标签 -->
                  <span class="wqc-type" :style="{ background: getTypeBg(wq.type), color: '#fff' }">{{ wq.type || '单选' }}</span>
                  <!-- 题目内容 -->
                  <div class="wqc-text" v-html="formatQuestionText(truncateText(wq.question, 120))"></div>
                  <!-- 答案对比行 -->
                  <div class="wqc-answer-row">
                    <span class="war-label">[你的答案]</span>
                    <span class="war-wrong">{{ wq.myAnswer || wq.user_answer || '未答' }}</span>
                    <span class="war-sep"></span>
                    <span class="war-label">[正确答案]</span>
                    <span class="war-right">{{ formatShortAnswer(wq.answer) }}</span>
                  </div>
                  <!-- 操作行 -->
                  <div class="wqc-actions">
                    <span class="wa-mastered">✅ 已掌握 <strong>{{ wq.correct_count || 0 }}</strong>/{{ wq.needed_correct || 3 }}次</span>
                    <span class="wa-remove">🗑️ 移除 <strong>{{ wq.removed_count || 0 }}</strong>/{{ wq.needed_correct || 3 }}次</span>
                  </div>
                  <!-- 底部按钮 -->
                  <div class="wqc-buttons">
                    <button class="btn btn-sm btn-primary-outline" @click.stop="getAiExplanationFor(wq)">🤖 AI 解析</button>
                    <button class="btn btn-sm btn-ghost" @click.stop="removeWrong(wq)">🗑 移除</button>
                  </div>
                  <!-- 进度计数器 -->
                  <div class="wqc-counter">{{ qIdx + 1 }}/{{ chapter.questions.length }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="错题详情" width="650px" :close-on-click-modal="false">
      <div v-if="currentWrong" class="wrong-detail">
        <div class="detail-stats">
          <div class="stat-item"><span class="si-icon">❌</span>做错 <strong>{{ currentWrong.count || 1 }}</strong> 次</div>
          <div class="stat-item"><span class="si-icon">✅</span>正确 <strong>{{ currentWrong.correct_count || 0 }}</strong> 次（还需 {{ 3 - (currentWrong.correct_count || 0) }} 次自动删除）</div>
          <div class="stat-item" v-if="currentWrong.myAnswer || currentWrong.user_answer">
            <span>上次答案：</span><span class="ans-wrong">{{ currentWrong.myAnswer || currentWrong.user_answer }}</span>
            <span> / 正确答案：</span><span class="ans-right" v-html="formatAnswerForReview(currentWrong.answer)"></span>
          </div>
        </div>
        <div class="detail-question"><h4 v-html="formatQuestionText(currentWrong.question)"></h4></div>
        <div v-if="currentWrong.explanation" class="detail-explanation"><strong>解析：</strong>{{ currentWrong.explanation }}</div>
        <div class="detail-ai">
          <el-button type="primary" @click="getAiExplanation" :loading="aiLoading">{{ aiExplanation ? 'AI 解析' : '查看 AI 解析' }}</el-button>
          <div v-if="aiExplanation" class="ai-explanation" v-html="formatAiText(aiExplanation)"></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useWrongStore } from '../store/wrong'
import { useQuestionStore } from '../store/question'
import { useAiStore } from '../store/ai'
import { ElMessage, ElMessageBox } from 'element-plus'
import { renderMath } from '../utils/katex'

const ws = useWrongStore()
const qs = useQuestionStore()
const ai = useAiStore()
const wrongQuestions = computed(() => ws.wrongQuestions)
const questionTypes = computed(() => qs.questionTypes)
const detailVisible = ref(false)
const currentWrong = ref(null)
const aiExplanation = ref('')
const aiLoading = ref(false)
const searchText = ref('')
const filterView = ref('subject')
const expandedSubjects = reactive({})
const chapterExpanded = reactive({})

onMounted(async () => {
  await ws.init()
  if (ws.subjectsWithChapters.length > 0) expandedSubjects[0] = true
})

function toggleSubject(idx) { expandedSubjects[idx] = !expandedSubjects[idx] }
function toggleChapter(s, c) { const key = s + '-' + c; chapterExpanded[key] = !chapterExpanded[key] }

function getSubjectIcon(name) {
  const icons = { '高等数学': '∫', '数据结构': '🔗', '计算机网络': '💻', '操作系统': '🖥️', '数据库原理': '🗄️' }
  return icons[name] || '📘'
}

function getTypeColor(typeName) {
  const t = qs.questionTypes.find(t => t.name === typeName)
  return t?.color || '#10b981'
}
function getTypeBg(typeName) { return getTypeColor(typeName) }

function truncateText(text, maxLen) {
  if (!text) return ''
  const plain = text.replace(/<[^>]+>/g, '')
  return plain.length <= maxLen ? plain : plain.substring(0, maxLen) + '...'
}

function formatQuestionText(text) {
  if (!text) return ''
  if (/<(table|img|br|hr|sup|sub|pre|code|span|strong|em|p|div|h[1-6]|ul|ol|li|tr|td|th|thead|tbody)\b/i.test(text)) {
    return text.replace(/\\n/g, '\n').replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '')
  }
  return renderMath(text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'))
}

function formatShortAnswer(text) {
  if (!text) return '-'
  return String(text).replace(/<[^>]+>/g, '').substring(0, 30)
}

function formatAnswerForReview(text) {
  if (!text) return '<span style="color:#c0c4cc">-</span>'
  let result = String(text)
  const hasHtml = /<(img|br|p|div|table|sup|sub|strong|em|span|code|pre|h[1-6]|ul|ol|li|tr|td|th)\b/i.test(result)
  if (hasHtml) return result.replace(/\\n/g, '<br>').replace(/\n/g, '<br>')
  return renderMath(result.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'))
}

function formatAiText(text) {
  if (!text) return ''
  let result = String(text)
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5"><code>${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`
  )
  const BR = '\x00BR\x00'
  result = result.replace(/\\n/g, '\n').replace(/\n/g, BR).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(new RegExp(BR, 'g'), '<br>')
  result = result.replace(/(解析：)/g, '<span style="color:#059669;font-weight:bold">$1</span>')
  return renderMath(result)
}

function viewDetail(row) { currentWrong.value = row; aiExplanation.value = ''; detailVisible.value = true }

async function getAiExplanation() {
  aiLoading.value = true
  try { aiExplanation.value = await ai.explainQuestion(currentWrong.value) }
  catch (e) { aiExplanation.value = 'AI 解析暂时不可用' }
  aiLoading.value = false
  await nextTick()
}

function getAiExplanationFor(wq) { currentWrong.value = wq; aiExplanation.value = ''; detailVisible.value = true; getAiExplanation() }

function removeWrong(wq) {
  const id = wq.question_id || wq.questionId
  ws.remove(id)
  ElMessage.success('已移除')
}

async function clearAll() {
  await ElMessageBox.confirm('确定清空所有错题？此操作不可恢复！', '警告', { confirmButtonText: '确定清空', cancelButtonText: '取消', type: 'warning' })
  ws.clearAll()
  ElMessage.success('已清空所有错题')
}
</script>

<style scoped>
.wrong-page { display: flex; flex-direction: column; gap: 20px; }

/* ===== 页面头部 ===== */
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ph-title { font-size: 20px; font-weight: 700; color: var(--gray-800); margin: 0; }
.ph-actions { display: flex; align-items: center; gap: 10px; }
.search-box { position: relative; }
.search-box .sb-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--gray-400); }
.search-box input { padding: 7px 12px 7px 32px; border: 1px solid var(--gray-200); border-radius: 8px; font-size: 13px; outline: none; width: 200px; background: var(--bg-card); }
.search-box input:focus { border-color: var(--primary-400); }

/* ===== 筛选标签 ===== */
.filter-tabs { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--gray-400); }
.ftab { cursor: pointer; color: var(--gray-400); transition: color 0.2s; }
.ftab.active { color: var(--gray-700); font-weight: 600; }
.ftab-sep { color: var(--gray-300); }

/* ===== 三级折叠树 ===== */
.wrong-tree { display: flex; flex-direction: column; gap: 8px; }

/* 科目行 */
.subject-row {
  display: flex; align-items: center; gap: 12px;
  padding: 18px 22px; background: #fff;
  border: 1px solid var(--gray-200); border-radius: 14px;
  cursor: pointer; transition: all 0.2s;
}
.subject-row:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.sr-icon { font-size: 24px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f0fdf4; border-radius: 10px; flex-shrink: 0; }
.sr-name { font-size: 15px; font-weight: 700; color: var(--gray-800); flex: 1; }
.sr-count { font-size: 13px; color: var(--gray-400); }
.sr-arrow { font-size: 10px; color: var(--gray-400); transition: transform 0.2s; }
.sr-arrow.expanded { transform: rotate(90deg); }

/* 章节列表 */
.chapter-list { padding-left: 12px; display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.chapter-row {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; background: #fff;
  border: 1px solid var(--gray-200); border-radius: 12px;
  cursor: pointer; transition: all 0.2s;
}
.chapter-row:hover { border-color: var(--primary-200); }
.cr-icon { font-size: 16px; flex-shrink: 0; }
.cr-name { font-size: 14px; font-weight: 600; color: var(--gray-700); flex: 1; }
.cr-count { font-size: 12px; color: var(--gray-400); }
.cr-arrow { font-size: 10px; color: var(--gray-400); transition: transform 0.2s; }
.cr-arrow.expanded { transform: rotate(90deg); }

/* 题目列表区 */
.question-list { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }

.q-section-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; background: #fff;
  border: 1px solid var(--gray-200);
  border-left: 3px solid #10b981; border-radius: 0 10px 10px 0;
  cursor: pointer; margin-bottom: 6px;
}
.qsh-icon { font-size: 16px; }
.qsh-name { font-size: 14px; font-weight: 600; color: var(--gray-700); flex: 1; }
.qsh-count { font-size: 12px; color: var(--gray-400); }
.qsh-arrow { font-size: 10px; color: var(--gray-500); transition: transform 0.2s; }
.qsh-arrow.expanded { transform: rotate(180deg); }

.q-items { display: flex; flex-direction: column; gap: 10px; padding-bottom: 8px; }

/* 错题卡片 */
.wrong-q-card {
  position: relative; background: #fff;
  border: 1px solid var(--gray-200); border-radius: 12px;
  padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;
  transition: all 0.2s;
}
.wrong-q-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: var(--primary-200); }

.wqc-type { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; align-self: flex-start; }
.wqc-text { font-size: 14px; color: var(--gray-800); line-height: 1.7; }

.wqc-answer-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; }
.war-label { color: var(--gray-500); font-size: 12px; }
.war-wrong { color: #ef4444; font-weight: 600; text-decoration: line-through; }
.war-right { color: #10b981; font-weight: 600; }
.war-sep { width: 1px; height: 14px; background: var(--gray-200); }

.wqc-actions { display: flex; gap: 16px; align-items: center; }
.wa-mastered { font-size: 13px; color: var(--gray-600); background: #ecfdf5; padding: 3px 10px; border-radius: 6px; }
.wa-mastered strong { color: #059669; }
.wa-remove { font-size: 13px; color: var(--gray-600); background: #fef2f2; padding: 3px 10px; border-radius: 6px; }
.wa-remove strong { color: #ef4444; }

.wqc-buttons { display: flex; gap: 8px; }
.wqc-counter { position: absolute; bottom: 16px; right: 18px; font-size: 11px; color: var(--gray-400); }

/* ===== 弹窗内容 ===== */
.wrong-detail { display: flex; flex-direction: column; gap: 16px; }
.detail-stats { display: flex; flex-wrap: wrap; gap: 16px; padding: 12px 16px; background: #f8fafc; border-radius: 10px; }
.stat-item { font-size: 14px; color: var(--gray-600); }
.si-icon { margin-right: 4px; }
.ans-wrong { color: #ef4444; font-weight: 600; text-decoration: line-through; }
.ans-right { color: #10b981; font-weight: 600; }
.detail-question h4 { margin: 0; line-height: 1.8; font-size: 15px; word-break: break-all; }
.detail-explanation { padding: 14px 18px; background: #fffbeb; border-radius: 10px; font-size: 14px; line-height: 1.8; color: #92400e; }
.detail-ai { margin-top: 4px; }
.ai-explanation { margin-top: 10px; padding: 14px 18px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 4px; line-height: 1.8; font-size: 14px; max-height: 400px; overflow-y: auto; }

/* 空状态 */
.empty-state { text-align: center; padding: 60px 20px; color: var(--gray-400); }
.empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
.empty-state p { font-size: 14px; }
</style>
