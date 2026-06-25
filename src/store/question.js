import { ref, computed } from 'vue'
import api from '../utils/api.js'

// 响应式状态
const allQuestions = ref([])
const currentFilters = ref({})
const loading = ref(false)
const lastDeletedQuestion = ref(null) // Bug #4修复：保存最后删除的题目，用于撤销

// 计算属性
const subjects = computed(() => {
  const questions = Array.isArray(allQuestions.value) ? allQuestions.value : []
  const subs = new Set(questions.map(q => q?.subject).filter(Boolean))
  return Array.from(subs).sort()
})

const chapters = computed(() => {
  const questions = Array.isArray(allQuestions.value) ? allQuestions.value : []
  const chs = new Set(questions.map(q => q?.chapter).filter(Boolean))
  return Array.from(chs).sort()
})

const questionTypes = computed(() => {
  const questions = Array.isArray(allQuestions.value) ? allQuestions.value : []
  const types = new Set(questions.map(q => q?.type).filter(Boolean))
  return Array.from(types).sort()
})

// 过滤后的题目
const filteredQuestions = computed(() => {
  const questions = Array.isArray(allQuestions.value) ? allQuestions.value : []
  let result = questions
  
  if (currentFilters.value.subject) {
    result = result.filter(q => q?.subject === currentFilters.value.subject)
  }
  if (currentFilters.value.chapter) {
    result = result.filter(q => q?.chapter === currentFilters.value.chapter)
  }
  if (currentFilters.value.type) {
    result = result.filter(q => q?.type === currentFilters.value.type)
  }
  if (currentFilters.value.keyword) {
    const kw = currentFilters.value.keyword.toLowerCase()
    result = result.filter(q => 
      q?.question?.toLowerCase().includes(kw) ||
      q?.answer?.toLowerCase().includes(kw) ||
      q?.explanation?.toLowerCase().includes(kw)
    )
  }
  
  return result
})

// 初始化：从localStorage加载题目
function init() {
  const saved = localStorage.getItem('exam_questions')
  if (saved) {
    try {
      allQuestions.value = JSON.parse(saved)
    } catch (e) {
      console.error('加载题目失败:', e)
      allQuestions.value = []
    }
  }
  
  // 如果没有题目，添加示例题目
  if (allQuestions.value.length === 0) {
    allQuestions.value = generateSampleQuestions()
    save()
  }
}

// 从API获取题目
async function fetchQuestions(filters = {}) {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.subject) params.append('subject', filters.subject)
    if (filters.chapter) params.append('chapter', filters.chapter)
    if (filters.type) params.append('type', filters.type)
    if (filters.keyword) params.append('keyword', filters.keyword)
    
    const query = params.toString()
    const res = await api.get(`/questions${query ? '?' + query : ''}`)
    
    if (res?.questions && Array.isArray(res.questions)) {
      allQuestions.value = res.questions
      currentFilters.value = filters
      save()
    } else if (res?.questions) {
      console.warn('API返回的题目数据不是数组，使用空数组')
      allQuestions.value = []
    }
  } catch (err) {
    console.error('获取题目失败:', err)
    // 如果API失败，从本地加载
    init()
  }
  loading.value = false
}

// 加载题目（别名：loadQuestions）
async function loadQuestions() {
  return await fetchQuestions()
}

// 保存题目到localStorage
function save() {
  try {
    localStorage.setItem('exam_questions', JSON.stringify(allQuestions.value))
  } catch (e) {
    console.error('保存题目失败:', e)
  }
}

// 创建题目
async function createQuestion(questionData) {
  loading.value = true
  try {
    const res = await api.post('/questions', questionData)
    if (res?.question) {
      allQuestions.value.unshift(res.question)
      save()
      return res.question
    }
  } catch (err) {
    console.error('创建题目失败:', err)
    // 如果API失败，保存到本地
    const newQuestion = {
      ...questionData,
      id: `local_${Date.now()}`,
      created_at: new Date().toISOString()
    }
    allQuestions.value.unshift(newQuestion)
    save()
    return newQuestion
  }
  loading.value = false
}

// 更新题目
async function updateQuestion(id, questionData) {
  loading.value = true
  try {
    const res = await api.put(`/questions/${id}`, questionData)
    if (res?.question) {
      const index = allQuestions.value.findIndex(q => q.id === id)
      if (index !== -1) {
        allQuestions.value[index] = res.question
        save()
      }
      return res.question
    }
  } catch (err) {
    console.error('更新题目失败:', err)
    // 如果API失败，更新本地数据
    const index = allQuestions.value.findIndex(q => q.id === id)
    if (index !== -1) {
      allQuestions.value[index] = { ...allQuestions.value[index], ...questionData }
      save()
    }
  }
  loading.value = false
}

// 删除题目
async function deleteQuestion(id) {
  loading.value = true
  try {
    // Bug #4修复：删除前保存题目，用于撤销
    const questionToDelete = allQuestions.value.find(q => q.id === id)
    if (questionToDelete) {
      lastDeletedQuestion.value = { ...questionToDelete }
    }
    
    await api.delete(`/questions/${id}`)
    allQuestions.value = allQuestions.value.filter(q => q.id !== id)
    save()
    
    // 提示用户可以撤销
    if (lastDeletedQuestion.value) {
      ElMessage.success('题目已删除，可撤销')
    }
  } catch (err) {
    console.error('删除题目失败:', err)
    // 如果API失败，从本地删除
    const questionToDelete = allQuestions.value.find(q => q.id === id)
    if (questionToDelete) {
      lastDeletedQuestion.value = { ...questionToDelete }
    }
    allQuestions.value = allQuestions.value.filter(q => q.id !== id)
    save()
  }
  loading.value = false
}

// Bug #4修复：撤销删除
async function undoDelete() {
  if (!lastDeletedQuestion.value) {
    ElMessage.warning('没有可撤销的删除操作')
    return null
  }
  
  try {
    // 恢复题目
    allQuestions.value.unshift(lastDeletedQuestion.value)
    save()
    
    const restoredQuestion = { ...lastDeletedQuestion.value }
    lastDeletedQuestion.value = null // 清除撤销缓存
    
    ElMessage.success('已撤销删除')
    return restoredQuestion
  } catch (err) {
    console.error('撤销删除失败:', err)
    ElMessage.error('撤销删除失败：' + err.message)
    return null
  }
}

// 生成示例题目（用于测试）
function generateSampleQuestions() {
  return [
    {
      id: 'sample_1',
      subject: '计算机网络',
      chapter: 'HTTP协议',
      type: '选择题',
      difficulty: 'medium',
      question: 'HTTP协议默认使用哪个端口？',
      options: ['80', '443', '8080', '22'],
      answer: '80',
      explanation: 'HTTP协议默认使用80端口，HTTPS默认使用443端口。',
      created_at: new Date().toISOString()
    },
    {
      id: 'sample_2',
      subject: '计算机网络',
      chapter: 'TCP/IP',
      type: '判断题',
      difficulty: 'easy',
      question: 'TCP是面向连接的协议，UDP是无连接的协议。',
      answer: '正确',
      explanation: 'TCP提供可靠的、面向连接的服务；UDP提供不可靠的、无连接的服务。',
      created_at: new Date().toISOString()
    },
    {
      id: 'sample_3',
      subject: '数据结构',
      chapter: '排序算法',
      type: '简答题',
      difficulty: 'hard',
      question: '请简述快速排序算法的基本思想和时间复杂度。',
      answer: '快速排序采用分治思想...',
      explanation: '快速排序平均时间复杂度为O(nlogn)，最坏情况为O(n²)。',
      created_at: new Date().toISOString()
    }
  ]
}

// 导出store
export function useQuestionStore() {
  return {
    allQuestions,
    currentFilters,
    loading,
    subjects,
    chapters,
    questionTypes,
    filteredQuestions,
    lastDeletedQuestion, // Bug #4修复：导出lastDeletedQuestion
    init,
    fetchQuestions,
    loadQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    undoDelete // Bug #4修复：导出undoDelete函数
  }
}
