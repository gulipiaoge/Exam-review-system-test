/**
 * 层3：解析适配层 - 试卷适配器
 * 解析模拟试卷、考试卷等
 */

import { cleanText } from '@/parser-v2/layer1-clean/cleaner'
import { FIELD_MAPPINGS } from '@/parser-v2/config/fieldMappings'
import { FAULT_TOLERANCE } from '@/parser-v2/config/faultTolerance'

/**
 * 解析试卷文件
 * @param {File} file - 上传的文件
 * @param {object} options - 解析选项
 * @returns {Promise<{success: boolean, data: Array, errors: Array, warnings: Array}>}
 */
export async function parseExamPaper(file, options = {}) {
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
        return mapAndFixRecord(record, 'exam_paper')
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
 * 解析docx文件（试卷）
 */
async function parseDocx(file, warnings) {
  try {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    
    // 提取文本
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = cleanText(result.value)
    
    // 使用试卷专用解析逻辑
    return parseExamText(text, warnings)
  } catch (e) {
    console.error('解析docx失败:', e)
    throw new Error('无法解析Word文档')
  }
}

/**
 * 解析Excel文件（试卷）
 */
async function parseExcel(file, warnings) {
  // 简化实现：返回空数组
  warnings.push('Excel解析功能开发中')
  return []
}

/**
 * 解析txt文件（试卷）
 */
async function parseTxt(file, warnings) {
  const text = await file.text()
  const cleaned = cleanText(text)
  return parseExamText(cleaned, warnings)
}

/**
 * 解析PDF文件（试卷）
 */
async function parsePdf(file, warnings) {
  warnings.push('PDF解析功能开发中')
  return []
}

/**
 * 从文本中解析试卷
 * 试卷结构：大题 → 小题
 * 示例：
 * 一、单项选择题（每题2分，共20分）
 * 1. 题目内容
 * A. 选项A
 * B. 选项B
 * 答案：A
 */
function parseExamText(text, warnings) {
  const questions = []
  const lines = text.split('\n').filter(line => line.trim())
  
  let currentSection = null  // 当前大题
  let currentQuestion = null
  let sectionNumber = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 检测大题标题（如"一、单项选择题（每题2分，共20分）"）
    const sectionMatch = line.match(/^([一二三四五六七八九十]+)[、.．]\s*(.+)$/)
    if (sectionMatch) {
      const sectionName = sectionMatch[2]
      
      // 提取分值信息
      const scoreMatch = sectionName.match(/每题\s*(\d+)\s*分/)
      const totalScoreMatch = sectionName.match(/共\s*(\d+)\s*分/)
      
      currentSection = {
        number: sectionMatch[1],
        name: sectionName,
        type: detectTypeFromSectionName(sectionName),
        scorePerQuestion: scoreMatch ? parseInt(scoreMatch[1]) : null,
        totalScore: totalScoreMatch ? parseInt(totalScoreMatch[1]) : null
      }
      sectionNumber++
      continue
    }
    
    // 检测小题开始（如"1."、"1、"（1）"）
    const questionMatch = line.match(/^\(?(\d+)[、.．）\)]\s*(.+)$/)
    if (questionMatch && currentSection) {
      // 保存上一题
      if (currentQuestion) {
        questions.push(currentQuestion)
      }
      
      // 开始新题目
      currentQuestion = {
        sectionNumber,
        sectionName: currentSection.name,
        type: currentSection.type,
        questionNumber: parseInt(questionMatch[1]),
        questionText: questionMatch[2],
        options: [],
        answer: '',
        score: currentSection.scorePerQuestion || null,
        explanation: ''
      }
      continue
    }
    
    // 检测选项（如"A."、"A、"）
    const optionMatch = line.match(/^([A-E])[、.．]\s*(.+)$/i)
    if (optionMatch && currentQuestion) {
      const optionKey = `option${optionMatch[1].toUpperCase()}`
      currentQuestion[optionKey] = optionMatch[2]
      currentQuestion.options.push(optionMatch[2])
      continue
    }
    
    // 检测答案（如"答案：A"、"【答案】A"）
    const answerMatch = line.match(/^(答案|正确答案|【答案】)[：:\s]*(.+)$/i)
    if (answerMatch && currentQuestion) {
      currentQuestion.answer = answerMatch[2].trim()
      continue
    }
    
    // 检测解析/评分标准
    const explanationMatch = line.match(/^(解析|评分标准|得分点)[：:\s]*(.+)$/i)
    if (explanationMatch && currentQuestion) {
      currentQuestion.explanation = explanationMatch[2].trim()
      continue
    }
    
    // 如果不是特殊行，追加到当前题目的题干
    if (currentQuestion && line.length > 0) {
      // 可能是题干的延续或选项/答案的延续
      if (!currentQuestion.answer && !currentQuestion.explanation) {
        // 检查是否是选项的一部分
        if (currentQuestion.options.length > 0) {
          // 可能是选项换行
          const lastOptionKey = `option${String.fromCharCode(64 + currentQuestion.options.length)}`
          if (currentQuestion[lastOptionKey]) {
            currentQuestion[lastOptionKey] += ' ' + line
            continue
          }
        }
        
        // 否则追加到题干
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
 * 从大题名称检测题型
 */
function detectTypeFromSectionName(name) {
  if (/单选|单项选择题/.test(name)) return 'single'
  if (/多选|多项选择题/.test(name)) return 'multi'
  if (/判断|判断题|是非题/.test(name)) return 'judge'
  if (/简答|简答题/.test(name)) return 'essay'
  if (/填空|填空题/.test(name)) return 'fill'
  if (/计算|计算题/.test(name)) return 'calc'
  if (/分析|分析题/.test(name)) return 'analysis'
  if (/综合|综合题/.test(name)) return 'comprehensive'
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
  parseExamPaper
}
