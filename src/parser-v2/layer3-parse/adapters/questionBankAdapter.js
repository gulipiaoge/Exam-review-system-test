/**
 * 层3：解析适配层 - 题库适配器
 * 独立解析器，与题型无关
 */

import { cleanText } from '@/parser-v2/layer1-clean/cleaner'
import { FIELD_MAPPINGS } from '@/parser-v2/config/fieldMappings'
import { FAULT_TOLERANCE } from '@/parser-v2/config/faultTolerance'

/**
 * 解析题库文件
 * @param {File} file - 上传的文件
 * @param {object} options - 解析选项
 * @returns {Promise<{success: boolean, data: Array, errors: Array, warnings: Array}>}
 */
export async function parseQuestionBank(file, options = {}) {
  const errors = []
  const warnings = []
  let data = []
  
  try {
    const ext = file.name.split('.').pop().toLowerCase()
    
    // 根据文件类型选择解析方法
    if (ext === 'docx' || ext === 'doc') {
      data = await parseDocx(file, warnings)
    } else if (ext === 'xlsx' || ext === 'xls') {
      data = await parseExcel(file, warnings)
    } else if (ext === 'txt') {
      data = await parseTxt(file, warnings)
    } else if (ext === 'pdf') {
      data = await parsePdf(file, warnings)
    } else {
      throw new Error(`不支持的文件类型：${ext}`)
    }
    
    // 字段映射和容错处理
    data = data.map((record, index) => {
      try {
        return mapAndFixRecord(record, 'question_bank')
      } catch (e) {
        errors.push({ row: index + 1, error: e.message })
        return null
      }
    }).filter(Boolean)
    
    return {
      success: true,
      data,
      errors,
      warnings
    }
  } catch (e) {
    return {
      success: false,
      data: [],
      errors: [{ error: e.message }],
      warnings
    }
  }
}

/**
 * 解析docx文件
 */
async function parseDocx(file, warnings) {
  try {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    
    // 提取文本
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = cleanText(result.value)
    
    // 使用增强的解析逻辑
    return parseQuestionText(text, warnings)
  } catch (e) {
    console.error('解析docx失败:', e)
    throw new Error('无法解析Word文档')
  }
}

/**
 * 解析Excel文件
 */
async function parseExcel(file, warnings) {
  // 简化实现：返回空数组
  // 实际应该读取Excel并映射到字段
  warnings.push('Excel解析功能开发中')
  return []
}

/**
 * 解析txt文件
 */
async function parseTxt(file, warnings) {
  const text = await file.text()
  const cleaned = cleanText(text)
  return parseQuestionText(cleaned, warnings)
}

/**
 * 解析PDF文件
 */
async function parsePdf(file, warnings) {
  warnings.push('PDF解析功能开发中')
  return []
}

/**
 * 从文本中解析题目
 * 这是核心解析逻辑
 */
function parseQuestionText(text, warnings) {
  const questions = []
  const lines = text.split('\n').filter(line => line.trim())
  
  let currentQuestion = null
  let currentSection = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 检测章节标题（如"一、单选题"）
    const sectionMatch = line.match(/^([一二三四五六七八九十]+)[、.．]\s*(.+)$/)
    if (sectionMatch) {
      const sectionName = sectionMatch[2]
      if (/单选|多选|判断|简答|填空/.test(sectionName)) {
        currentSection = detectTypeFromName(sectionName)
        continue
      }
    }
    
    // 检测题目开始（如"1."、"1、"）
    const questionMatch = line.match(/^(\d+)[、.．]\s*(.+)$/)
    if (questionMatch) {
      // 保存上一题
      if (currentQuestion) {
        questions.push(currentQuestion)
      }
      
      // 开始新题目
      currentQuestion = {
        questionText: questionMatch[2],
        type: currentSection || 'single',
        options: [],
        answer: '',
        explanation: ''
      }
      continue
    }
    
    // 检测选项（如"A."、"A、"）
    const optionMatch = line.match(/^([A-D])[、.．]\s*(.+)$/i)
    if (optionMatch && currentQuestion) {
      const optionKey = `option${optionMatch[1].toUpperCase()}`
      currentQuestion[optionKey] = optionMatch[2]
      currentQuestion.options.push(optionMatch[2])
      continue
    }
    
    // 检测答案
    const answerMatch = line.match(/^(答案|正确答案)[：:]\s*(.+)$/i)
    if (answerMatch && currentQuestion) {
      currentQuestion.answer = answerMatch[2].trim()
      continue
    }
    
    // 检测解析
    const explanationMatch = line.match(/^(解析|解释)[：:]\s*(.+)$/i)
    if (explanationMatch && currentQuestion) {
      currentQuestion.explanation = explanationMatch[2].trim()
      continue
    }
    
    // 如果不是特殊行，追加到当前题目的题干
    if (currentQuestion && !line.match(/^[A-D][、.．]/i)) {
      // 可能是题干的延续
      if (!currentQuestion.answer && !currentQuestion.explanation) {
        currentQuestion.questionText += ' ' + line
      }
    }
  }
  
  // 保存最后一题
  if (currentQuestion) {
    questions.push(currentQuestion)
  }
  
  return questions
}

/**
 * 从章节名称检测题型
 */
function detectTypeFromName(name) {
  if (/单选/.test(name)) return 'single'
  if (/多选/.test(name)) return 'multi'
  if (/判断|是非/.test(name)) return 'judge'
  if (/简答/.test(name)) return 'essay'
  if (/填空/.test(name)) return 'fill'
  return 'single'
}

/**
 * 字段映射和容错处理
 */
function mapAndFixRecord(record, typeId) {
  const mapping = FIELD_MAPPINGS[typeId]
  const tolerance = FAULT_TOLERANCE[typeId]
  
  if (!mapping || !tolerance) {
    return record
  }
  
  const mapped = {}
  
  // 字段映射
  Object.values(mapping.mappings).forEach(fieldConfig => {
    const { internal, aliases, required, type, defaultValue } = fieldConfig
    
    // 查找字段值（支持别名）
    let value = null
    for (const alias of aliases) {
      if (record[alias] !== undefined) {
        value = record[alias]
        break
      }
    }
    
    // 容错处理
    if (value === null || value === undefined || value === '') {
      if (required && !tolerance.nullableFields.includes(internal)) {
        throw new Error(`字段"${internal}"不能为空`)
      }
      value = tolerance.defaults[internal] || ''
    }
    
    // 类型转换
    if (type === 'number') {
      value = parseFloat(value) || 0
    }
    
    mapped[internal] = value
  })
  
  // 自动修复
  Object.entries(tolerance.autoFix).forEach(([field, fixer]) => {
    if (typeof fixer === 'function' && mapped[field]) {
      mapped[field] = fixer(mapped[field], mapped)
    }
  })
  
  return mapped
}

export default {
  parseQuestionBank
}
