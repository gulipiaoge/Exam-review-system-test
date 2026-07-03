import { ref } from 'vue'
import api from '../utils/api.js'

// 响应式状态
const wrongQuestions = ref([])
const loading = ref(false)

// 初始化：从localStorage加载错题
function init() {
  const saved = localStorage.getItem('exam_wrong_questions')
  if (saved) {
    try {
      wrongQuestions.value = JSON.parse(saved)
    } catch (e) {
      console.error('加载错题失败:', e)
      wrongQuestions.value = []
    }
  }
  
  // 如果没有错题，添加示例错题
  if (wrongQuestions.value.length === 0) {
    wrongQuestions.value = generateSampleWrongQuestions()
    save()
  }
}

// 保存错题到localStorage
function save() {
  try {
    localStorage.setItem('exam_wrong_questions', JSON.stringify(wrongQuestions.value))
  } catch (e) {
    console.error('保存错题失败:', e)
  }
}

// 添加错题
async function addWrongQuestion(questionId, wrongRecord) {
  loading.value = true
  try {
    await api.post('/wrong-questions', {
      questionId,
      ...wrongRecord
    })
    
    // 添加到本地
    wrongQuestions.value.unshift({
      id: `wrong_${Date.now()}`,
      questionId,
      ...wrongRecord,
      created_at: new Date().toISOString()
    })
    save()
  } catch (err) {
    console.error('添加错题失败:', err)
    // 如果API失败，保存到本地
    wrongQuestions.value.unshift({
      id: `wrong_${Date.now()}`,
      questionId,
      ...wrongRecord,
      created_at: new Date().toISOString()
    })
    save()
  }
  loading.value = false
}

// 删除错题
async function removeWrongQuestion(wrongId) {
  loading.value = true
  try {
    await api.delete(`/wrong-questions/${wrongId}`)
    wrongQuestions.value = wrongQuestions.value.filter(q => q.id !== wrongId)
    save()
  } catch (err) {
    console.error('删除错题失败:', err)
    // 如果API失败，从本地删除
    wrongQuestions.value = wrongQuestions.value.filter(q => q.id !== wrongId)
    save()
  }
  loading.value = false
}

// 获取错题列表
async function fetchWrongQuestions(filters = {}) {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.subject) params.append('subject', filters.subject)
    if (filters.limit) params.append('limit', filters.limit)
    
    const query = params.toString()
    const res = await api.get(`/wrong-questions${query ? '?' + query : ''}`)
    
    if (res?.wrongQuestions && Array.isArray(res.wrongQuestions)) {
      wrongQuestions.value = res.wrongQuestions
      save()
    } else if (res?.wrongQuestions) {
      console.warn('API返回的错题数据不是数组，使用空数组')
      wrongQuestions.value = []
    }
  } catch (err) {
    console.error('获取错题失败:', err)
    // 如果API失败，从本地加载
    init()
  }
  loading.value = false
}

// 生成示例错题（用于测试）
function generateSampleWrongQuestions() {
  return [
    {
      id: 'wrong_1',
      questionId: 'sample_1',
      subject: '计算机网络',
      chapter: 'HTTP协议',
      question: 'HTTP协议默认使用哪个端口？',
      userAnswer: '443',
      correctAnswer: '80',
      explanation: 'HTTP协议默认使用80端口，HTTPS默认使用443端口。',
      created_at: new Date().toISOString()
    },
    {
      id: 'wrong_2',
      questionId: 'sample_2',
      subject: '计算机网络',
      chapter: 'TCP/IP',
      question: 'TCP是面向连接的协议，UDP是无连接的协议。',
      userAnswer: '错误',
      correctAnswer: '正确',
      explanation: 'TCP提供可靠的、面向连接的服务；UDP提供不可靠的、无连接的服务。',
      created_at: new Date().toISOString()
    }
  ]
}

// 导出store
export function useWrongStore() {
  return {
    wrongQuestions,
    loading,
    init,
    addWrongQuestion,
    removeWrongQuestion,
    fetchWrongQuestions
  }
}
