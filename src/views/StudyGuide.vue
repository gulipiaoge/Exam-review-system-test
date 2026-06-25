<template>
  <div class="study-guide-page">
    <!-- 页面顶栏 -->
    <div class="page-top">
      <!-- 步骤指示器 -->
      <div class="step-bar">
        <div :class="['step', { done: true }]"><span class="step-icon">✓</span><span>配置项目</span></div>
        <div class="step-line"></div>
        <div :class="['step', { done: hasResource }]"><span class="step-icon">{{ hasResource ? '✓' : '○' }}</span><span>关联资源</span></div>
        <div class="step-line"></div>
        <div :class="['step', { active: generating || generated }]"><span class="step-icon">{{ generating ? '🔄' : (generated ? '✓' : '○') }}</span><span>AI 生成</span></div>
      </div>
    </div>

    <!-- ===== 配置区域（步骤1）===== -->
    <div v-if="!generated && !generating" class="config-section">
      <div class="config-card">
        <h3 class="cc-title">配置复习需求</h3>

        <div class="form-group">
          <label>科目名称</label>
          <input v-model="config.subject" placeholder="必填：例如 软件测试 / 高等数学" class="form-input" />
        </div>

        <div class="form-group">
          <label>自由描述</label>
          <textarea v-model="config.freeText" rows="4" placeholder="描述科目、考试范围、具体要求… 写得越细指导越精准" class="form-textarea"></textarea>
        </div>

        <div class="form-group">
          <label>关联资源</label>
          <div class="resource-selects">
            <select v-model="resourceType" @change="onResourceTypeChange" class="form-select">
              <option value="">选择库种类</option>
              <option v-for="rt in resourceTypes" :key="rt.type" :value="rt.type">{{ rt.name }}</option>
            </select>

            <template v-if="resourceType === 'question_bank'">
              <select v-model="resourceSubject" @change="onResourceSubjectChange" class="form-select">
                <option value="">选择科目</option>
                <option v-for="s in questionSubjects" :key="s" :value="s">{{ s }}</option>
              </select>
              <select v-if="resourceSubject" v-model="resourceChapters" multiple class="form-select">
                <option v-for="ch in filteredChapters" :key="ch" :value="ch">{{ ch }}</option>
              </select>
            </template>
            <template v-else-if="resourceType === 'exam_paper'">
              <select v-model="resourcePaperId" class="form-select">
                <option value="">选择试卷</option>
                <option v-for="p in examPapers" :key="p.id" :value="p.id">{{ p.title }}</option>
              </select>
            </template>
          </div>
        </div>

        <button class="btn btn-primary btn-lg btn-full" @click="startGenerate" :disabled="!config.subject">🚀 开始生成复习指导</button>
      </div>
    </div>

    <!-- ===== AI 生成中（步骤3）===== -->
    <div v-if="generating" class="gen-card">
      <div class="gc-avatar">🤖</div>
      <h3 class="gc-title">AI 正在为你生成复习指导...</h3>
      <p class="gc-subtitle">分析资料中...</p>
      <div class="progress-wrap">
        <div class="progress-bar" style="width:65%"></div>
      </div>
      <p class="gc-time">预计还需 ~15 秒完成</p>
    </div>

    <!-- ===== 已生成的结果（步骤3完成）===== -->
    <div v-if="generated" class="result-area">
      <!-- 结果卡片头部 -->
      <div class="result-header">
        <div class="rh-left"><span class="rh-icon">📘</span><span class="rh-title">《{{ config.subject }}》期末复习指导</span></div>
        <div class="rh-actions">
          <button class="btn btn-primary btn-sm" @click="saveGuide">💾 保存到本地</button>
          <button class="btn btn-secondary btn-sm" @click="$router.push('/exam')">📝 生成试卷</button>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="guide-content">
        <h2 class="gc-heading">{{ config.subject }}（上）期末复习指导</h2>
        <p class="gc-desc">本复习指导涵盖函数与极限、导数与微分、不定积分等三大章节，适用于期末备考。请结合课堂笔记和教材重点阅读。</p>

        <!-- 章节内容 -->
        <div class="chapter-block">
          <h3 class="cb-title">第一章 函数与极限</h3>

          <h4 class="sub-title">1.1 函数概念</h4>
          <ul class="content-list">
            <li>函数是从定义域到值域的映射关系，重点是<strong>单值对应</strong></li>
          </ul>

          <h4 class="sub-title">1.2 极限</h4>
          <ul class="content-list">
            <li>极限是数学的基石，关键在于<strong>ε-δ语言</strong>（或等价的<strong>邻域描述法</strong>）</li>
            <li>重要运算法则：
              <ul class="sub-list">
                <li>加减法：lim(f±g) = lim f ± lim g</li>
                <li>乘法：lim(f·g) = lim f · lim g</li>
                <li>除法：lim(f/g) = lim f / lim g （要求 lim g ≠ 0）</li>
              </ul>
            </li>
          </ul>

          <div class="key-point">
            <span class="kp-icon">📍</span>
            <div>
              <strong>核心要点</strong>
              <p>极限存在的充分必要条件是左右极限都存在且相等。</p>
            </div>
          </div>
        </div>

        <!-- 更多章节... -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../utils/api.js'
import { useQuestionStore } from '../store/question'
import { renderMath } from '../utils/katex'

const qs = useQuestionStore()

const config = reactive({ subject: '', freeText: '' })
const resourceType = ref('')
const resourceSubject = ref('')
const resourceChapters = ref([])
const resourcePaperId = ref('')
const generating = ref(false)
const generated = ref(false)
const generatedContent = ref('')

const resourceTypes = [
  { type: 'question_bank', name: '题库' },
  { type: 'exam_paper', name: '试卷库' },
  { type: 'study_guide', name: '复习指导库' },
  { type: 'material', name: '资料库' }
]

const questionSubjects = computed(() => qs.subjects)
const examPapers = ref([])

const hasResource = computed(() => !!resourceType.value)
const filteredChapters = computed(() => {
  // 简化：返回一些默认章节名
  if (!resourceSubject.value) return []
  return ['第一章 函数与极限', '第二章 导数与微分', '第三章 不定积分', '第四章 定积分']
})

function onResourceTypeChange() { resourceSubject.value = ''; resourceChapters.value = [] }
function onResourceSubjectChange() { resourceChapters.value = []; }

async function startGenerate() {
  if (!config.subject.trim()) { ElMessage.warning('请输入科目名称'); return }
  generating.value = true; generated.value = false

  try {
    // 尝试调用后端AI生成API
    const res = await api.post('/ai/study-guide', {
      subject: config.subject,
      freeText: config.freeText,
      resourceType: resourceType.value,
      resourceSubject: resourceSubject.value,
      resourceChapters: resourceChapters.value
    })

    if (res?.guide) {
      generating.value = false; generated.value = true
      generatedContent.value = res.guide.overview || ''
      if (res.guide.corePoints) generatedContent.value += '\n\n' + res.guide.corePoints
      if (res.guide.mistakes) generatedContent.value += '\n\n' + res.guide.mistakes
      if (res.guide.schedule) generatedContent.value += '\n\n' + res.guide.schedule
      if (res.guide.checklist) generatedContent.value += '\n\n' + res.guide.checklist
      ElMessage.success('复习指导已生成！')
    } else {
      throw new Error(res?.error || '生成失败')
    }
  } catch (err) {
    console.error('AI生成失败，使用模拟数据:', err)
    // Bug #7修复：当API失败时，使用模拟数据
    ElMessage.info('使用模拟数据生成复习指导...')
    
    // 模拟生成复习指导
    await delay(2000) // 模拟2秒生成时间
    
    generating.value = false; generated.value = true
    generatedContent.value = generateMockGuide(config.subject, config.freeText)
    ElMessage.success('复习指导已生成！（模拟数据）')
  }
}

// 生成模拟复习指导
function generateMockGuide(subject, freeText) {
  return `# 《${subject}》期末复习指导

## 一、课程概述
本课程主要涵盖${subject}的核心知识点，适用于期末备考。

## 二、重点章节

### 第一章 基础概念
- 理解基本概念和定义
- 掌握基本计算方法和公式
- **重点**：概念的理解和记忆

### 第二章 核心理论
- 深入理解核心理论体系
- 掌握理论的应用场景
- **重点**：理论的实际应用

### 第三章 实践应用
- 结合实际案例进行分析
- 掌握解题方法和技巧
- **重点**：解题思路和步骤

## 三、复习建议
1. **第一阶段（1-2天）**：复习基础概念，理解定义
2. **第二阶段（3-4天）**：深入学习核心理论，做课后习题
3. **第三阶段（5-7天）**：综合练习，模拟考试

## 四、常见错误
- ❌ 概念理解不清
- ❌ 公式记忆错误
- ❌ 解题步骤不完整

## 五、复习清单
- [ ] 复习第一章笔记
- [ ] 完成第一章练习题
- [ ] 复习第二章笔记
- [ ] 完成第二章练习题
- [ ] 做一套模拟试卷
`
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function saveGuide() {
  const content = document.querySelector('.guide-content')?.innerText || ''
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${config.subject}_复习指导.md`; a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已保存')
}

function renderMathContent(text) {
  if (!text) return text
  return renderMath(text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'))
}
</script>

<style scoped>
.study-guide-page { display: flex; flex-direction: column; gap: 24px; }

/* ===== 步骤条 ===== */
.page-top { margin-bottom: 8px; }
.step-bar { display: flex; align-items: center; gap: 0; padding: 20px 0; }
.step { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--gray-400); }
.step.done { color: #059669; font-weight: 600; }
.step.active { color: var(--primary-600); font-weight: 600; }
.step-icon {
  width: 28px; height: 28px; border-radius: 50%; border: 2px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.step.done .step-icon { background: #10b981; border-color: #10b981; color: #fff; }
.step-line { flex: 1; height: 0; border-top: 2px dashed var(--gray-200); margin: 0 8px; }

/* ===== 配置区 ===== */
.config-section { max-width: 680px; margin: 0 auto; width: 100%; }
.config-card {
  background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
  padding: 32px;
}
.cc-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: var(--gray-800); }
.form-group { margin-bottom: 20px; }
.form-group > label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-600); margin-bottom: 6px; }
.form-input, .form-textarea, .form-select {
  width: 100%; padding: 10px 14px; border: 1px solid var(--gray-200); border-radius: 8px;
  font-size: 14px; color: var(--gray-800); background: #fff;
  transition: border-color .2s;
}
.form-input:focus, .form-textarea:focus, .form-select:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(16,185,129,.12); }
.form-textarea { resize: vertical; min-height: 100px; }
.resource-selects { display: flex; flex-direction: column; gap: 8px; }

/* ===== 生成中 ===== */
.gen-card {
  text-align: center; padding: 60px 20px;
  background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
  max-width: 480px; margin: 40px auto;
}
.gc-avatar { font-size: 48px; margin-bottom: 16px; }
.gc-title { font-size: 20px; font-weight: 700; color: var(--gray-800); margin-bottom: 8px; }
.gc-subtitle { font-size: 14px; color: var(--gray-400); margin-bottom: 24px; }
.progress-wrap { height: 6px; background: var(--gray-100); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
.progress-bar { height: 100%; background: linear-gradient(90deg, var(--primary-500), var(--primary-600)); border-radius: 3px; transition: width .3s; }
.gc-time { font-size: 13px; color: var(--gray-400); }

/* ===== 结果区 ===== */
.result-area { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
.result-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid var(--gray-100);
}
.rh-left { display: flex; align-items: center; gap: 10px; }
.rh-icon { font-size: 24px; }
.rh-title { font-size: 18px; font-weight: 700; color: var(--gray-800); }
.rh-actions { display: flex; gap: 8px; }

.guide-content { padding: 32px; max-width: 800px; margin: 0 auto; }
.gc-heading { font-size: 24px; font-weight: 800; color: var(--gray-900); margin-bottom: 12px; }
.gc-desc { font-size: 15px; color: var(--gray-600); line-height: 1.6; margin-bottom: 32px; }

.chapter-block { margin-bottom: 32px; }
.cb-title { font-size: 20px; font-weight: 700; color: var(--gray-800); margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--primary-500); }
.sub-title { font-size: 16px; font-weight: 600; color: var(--gray-700); margin: 16px 0 8px; }
.content-list { padding-left: 20px; margin-bottom: 12px; }
.content-list li { font-size: 14px; color: var(--gray-600); line-height: 1.8; }

.key-point {
  display: flex; gap: 12px; padding: 16px; background: #ecfdf5;
  border-radius: 8px; border-left: 4px solid var(--primary-500);
  margin: 16px 0;
}
.kp-icon { font-size: 20px; flex-shrink: 0; }
.key-point strong { display: block; font-size: 14px; color: var(--gray-800); margin-bottom: 4px; }
.key-point p { font-size: 14px; color: var(--gray-600); line-height: 1.6; }
</style>
