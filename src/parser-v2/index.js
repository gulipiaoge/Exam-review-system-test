/**
 * 解析器主协调器
 * 将五层架构串联起来
 * 
 * 使用方式：
 * import { parseFile } from './parser-v2/index.js'
 * 
 * const result = await parseFile(file, {
 *   onProgress: (percent, message) => {},
 *   onPreview: (data) => {},  // 试解析预览
 *   userConfirmedType: null    // 用户确认的类型（如果需要）
 * })
 */

import { precheck } from '@/parser-v2/layer0-precheck/precheck'
import { cleanText, cleanFromFile } from '@/parser-v2/layer1-clean/cleaner'
import { recognizeType } from '@/parser-v2/layer2-router/router'
import { parseQuestionBank } from '@/parser-v2/layer3-parse/adapters/questionBankAdapter'
import { parseExamPaper } from '@/parser-v2/layer3-parse/adapters/examPaperAdapter'
import { parseVocabulary } from '@/parser-v2/layer3-parse/adapters/vocabularyAdapter'
import { parseFlashcard } from '@/parser-v2/layer3-parse/adapters/flashcardAdapter'
import { validate } from '@/parser-v2/layer4-validate/validator'
import { persist } from '@/parser-v2/layer5-persist/persistor'

/**
 * 解析文件（完整流程）
 * @param {File} file - 上传的文件
 * @param {object} options - 选项
 * @returns {Promise<{success: boolean, data: Array, type: string, errors: Array}>}
 */
export async function parseFile(file, options = {}) {
  const {
    onProgress = () => {},
    onPreview = null,
    userConfirmedType = null,
    skipValidation = false
  } = options
  
  try {
    // ==================== 层0：预检 ====================
    onProgress(5, '正在检查文件...')
    const precheckResult = await precheck(file)
    
    if (!precheckResult.valid) {
      throw new Error(precheckResult.error)
    }
    
    // ==================== 层1：格式清洗 ====================
    onProgress(15, '正在清洗文件格式...')
    let text = ''
    if (file.type.includes('text') || file.name.endsWith('.txt')) {
      text = await cleanFromFile(file)
    } else {
      // 对于二进制文件（docx等），层1的清洗在解析器内部进行
      text = await file.text().catch(() => '')
    }
    
    // ==================== 层2：路由识别 ====================
    onProgress(25, '正在识别文件类型...')
    let typeResult
    
    if (userConfirmedType) {
      // 用户已确认类型
      typeResult = {
        type: userConfirmedType,
        confidence: 1.0,
        needsUserInput: false
      }
    } else {
      // 自动识别
      typeResult = await recognizeType(file, text)
      
      // 如果需要用户确认，暂停并返回候选类型
      if (typeResult.needsUserInput && onPreview) {
        return {
          success: false,
          needsUserInput: true,
          candidates: [typeResult, ...typeResult.alternatives],
          preview: null
        }
      }
    }
    
    // ==================== 层3：解析 ====================
    onProgress(40, '正在解析文件内容...')
    const parseResult = await parseByType(file, typeResult.type, onProgress)
    
    if (!parseResult.success) {
      throw new Error(parseResult.errors.map(e => e.error).join('; '))
    }
    
    // ==================== 试解析预览 ====================
    if (onPreview && typeof onPreview === 'function') {
      const shouldContinue = await onPreview({
        type: typeResult.type,
        data: parseResult.data.slice(0, 5),  // 预览前5条
        total: parseResult.data.length
      })
      
      if (shouldContinue === false) {
        return {
          success: false,
          cancelled: true,
          message: '用户取消导入'
        }
      }
    }
    
    // ==================== 层4：校验 ====================
    if (!skipValidation) {
      onProgress(70, '正在校验数据...')
      const validateResult = validate(parseResult.data, typeResult.type)
      
      if (validateResult.errors.length > 0) {
        console.warn('校验发现错误:', validateResult.errors)
        // 可以选择：继续导入有效数据，或全部拒绝
        // 这里选择继续导入有效数据
        parseResult.data = validateResult.validData
      }
    }
    
    // ==================== 层5：持久化 ====================
    onProgress(85, '正在保存数据...')
    const persistResult = await persist(parseResult.data, typeResult.type, options)
    
    if (!persistResult.success) {
      throw new Error(persistResult.errors.join('; '))
    }
    
    // ==================== 完成 ====================
    onProgress(100, '导入完成！')
    
    return {
      success: true,
      type: typeResult.type,
      total: parseResult.data.length,
      saved: persistResult.saved,
      errors: parseResult.errors || [],
      warnings: parseResult.warnings || []
    }
    
  } catch (e) {
    console.error('解析失败:', e)
    return {
      success: false,
      error: e.message,
      data: []
    }
  }
}

/**
 * 根据类型选择解析器
 */
async function parseByType(file, typeId, onProgress) {
  switch (typeId) {
    case 'question_bank':
      return await parseQuestionBank(file, { onProgress })
    case 'exam_paper':
      return await parseExamPaper(file, { onProgress })
    case 'vocabulary':
      return await parseVocabulary(file, { onProgress })
    case 'flashcard':
      return await parseFlashcard(file, { onProgress })
    default:
      throw new Error(`不支持的类型：${typeId}`)
  }
}

/**
 * 快速预览（只解析前N条，用于用户确认）
 * @param {File} file - 上传的文件
 * @param {number} maxItems - 最大预览条数
 * @returns {Promise<{type: string, preview: Array, total: number}>}
 */
export async function quickPreview(file, maxItems = 5) {
  try {
    // 层0：预检
    const precheckResult = await precheck(file)
    if (!precheckResult.valid) {
      throw new Error(precheckResult.error)
    }
    
    // 层2：识别类型
    const text = await file.text().catch(() => '')
    const typeResult = await recognizeType(file, text)
    
    // 层3：解析（限制条数）
    const parseResult = await parseByType(file, typeResult.type, () => {})
    
    return {
      success: true,
      type: typeResult.type,
      typeName: getTypeDisplayName(typeResult.type),
      confidence: typeResult.confidence,
      preview: parseResult.data.slice(0, maxItems),
      total: parseResult.data.length
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    }
  }
}

/**
 * 获取类型显示名称
 */
function getTypeDisplayName(typeId) {
  const names = {
    'question_bank': '题库',
    'exam_paper': '试卷',
    'vocabulary': '单词',
    'flashcard': '闪卡'
  }
  return names[typeId] || typeId
}

/**
 * 获取支持的文件类型
 */
export function getSupportedFileTypes() {
  return [
    { ext: 'docx', name: 'Word文档 (.docx)' },
    { ext: 'doc', name: 'Word文档 (.doc)' },
    { ext: 'xlsx', name: 'Excel文档 (.xlsx)' },
    { ext: 'xls', name: 'Excel文档 (.xls)' },
    { ext: 'pdf', name: 'PDF文档 (.pdf)' },
    { ext: 'txt', name: '文本文件 (.txt)' }
  ]
}

export default {
  parseFile,
  quickPreview,
  getSupportedFileTypes
}
