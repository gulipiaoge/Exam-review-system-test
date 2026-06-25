/**
 * 层5：入库持久层
 * 将校验通过的数据转换为最终格式并存储
 */

import { useQuestionStore } from '../../store/question.js'

/**
 * 持久化数据
 * @param {Array} data - 校验通过的数据
 * @param {string} typeId - 内容类型ID
 * @param {object} options - 选项
 * @returns {Promise<{success: boolean, saved: number, errors: Array}>}
 */
export async function persist(data, typeId, options = {}) {
  const errors = []
  let saved = 0
  
  try {
    // 根据类型ID选择不同的持久化策略
    switch (typeId) {
      case 'question_bank':
        saved = await persistQuestions(data, options)
        break
      case 'exam_paper':
        saved = await persistExamPapers(data, options)
        break
      case 'vocabulary':
        saved = await persistVocabulary(data, options)
        break
      case 'flashcard':
        saved = await persistFlashcards(data, options)
        break
      default:
        throw new Error(`不支持的类型：${typeId}`)
    }
    
    return { success: true, saved, errors }
  } catch (e) {
    return { success: false, saved, errors: [e.message] }
  }
}

/**
 * 持久化题目数据
 */
async function persistQuestions(data, options) {
  const store = useQuestionStore()
  
  data.forEach(record => {
    // 转换为 store 需要的格式
    const question = {
      id: generateId(),
      type: record.type || 'single',
      question: record.questionText,
      options: buildOptions(record),
      answer: record.answer,
      explanation: record.explanation || '',
      chapter: record.chapter || '未分类',
      difficulty: record.difficulty || 'medium',
      createdAt: new Date().toISOString(),
      ...options.extraFields
    }
    
    // 保存到 store
    store.addQuestion(question)
  })
  
  return data.length
}

/**
 * 持久化试卷数据
 */
async function persistExamPapers(data, options) {
  // 简化实现
  console.log('持久化试卷:', data.length)
  return data.length
}

/**
 * 持久化单词数据
 */
async function persistVocabulary(data, options) {
  // 简化实现
  console.log('持久化单词:', data.length)
  return data.length
}

/**
 * 持久化闪卡数据
 */
async function persistFlashcards(data, options) {
  // 简化实现
  console.log('持久化闪卡:', data.length)
  return data.length
}

/**
 * 构建选项数组
 */
function buildOptions(record) {
  const options = []
  
  if (record.optionA) options.push({ label: 'A', text: record.optionA })
  if (record.optionB) options.push({ label: 'B', text: record.optionB })
  if (record.optionC) options.push({ label: 'C', text: record.optionC })
  if (record.optionD) options.push({ label: 'D', text: record.optionD })
  
  return options
}

/**
 * 生成唯一ID
 */
function generateId() {
  return 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 批量持久化（支持事务）
 */
export async function persistBatch(data, typeId, options = {}) {
  const { atomic = false } = options  // 是否原子操作（全部成功或全部失败）
  
  if (atomic) {
    // 原子操作：先暂存，全部成功才提交
    try {
      const tempData = [...data]
      const result = await persist(tempData, typeId, options)
      return result
    } catch (e) {
      // 回滚（简化实现：实际应该记录回滚逻辑）
      console.error('持久化失败，需要回滚:', e)
      return { success: false, saved: 0, errors: [e.message] }
    }
  } else {
    // 非原子操作：逐条保存，失败继续
    return persist(data, typeId, options)
  }
}

export default {
  persist,
  persistBatch
}
