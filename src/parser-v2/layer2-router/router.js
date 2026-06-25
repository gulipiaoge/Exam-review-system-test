/**
 * 层2：路由识别层
 * 根据文件头特征自动或半自动判断类型
 * 输出置信度评分，支持用户手动选择
 */

import { FIELD_MAPPINGS } from '@/parser-v2/config/fieldMappings'

/**
 * 识别文件类型
 * @param {File} file - 上传的文件
 * @param {string} text - 文件文本内容（已清洗）
 * @returns {Promise<{type: string, confidence: number, alternatives: Array}>}
 */
export async function recognizeType(file, text) {
  const results = []
  
  // 1. 基于文件扩展名的初步判断
  const ext = file.name.split('.').pop().toLowerCase()
  const extHints = getExtensionHints(ext)
  results.push(...extHints)
  
  // 2. 基于文件内容的深度分析
  if (text && text.length > 0) {
    const contentHints = analyzeContent(text)
    results.push(...contentHints)
  }
  
  // 3. docx文件特殊处理：提取样式信息
  if (ext === 'docx') {
    const docxHints = await analyzeDocxStructure(file)
    results.push(...docxHints)
  }
  
  // 4. Excel文件特殊处理
  if (['xls', 'xlsx'].includes(ext)) {
    const excelHints = await analyzeExcelStructure(file)
    results.push(...excelHints)
  }
  
  // 5. 汇总评分，选择最佳匹配
  const scoredResults = scoreResults(results)
  
  if (scoredResults.length === 0) {
    return {
      type: 'unknown',
      confidence: 0,
      alternatives: [],
      needsUserInput: true
    }
  }
  
  // 6. 判断是否需要用户确认
  const topResult = scoredResults[0]
  const needsUserInput = topResult.confidence < 0.8 || 
    (scoredResults.length > 1 && scoredResults[1].confidence > 0.5)
  
  return {
    type: topResult.type,
    confidence: topResult.confidence,
    alternatives: scoredResults.slice(1, 4),
    needsUserInput,
    preview: topResult.preview
  }
}

/**
 * 基于文件扩展名获取提示
 */
function getExtensionHints(ext) {
  const hints = {
    'docx': { type: 'question_bank', confidence: 0.3, source: 'extension' },
    'doc': { type: 'question_bank', confidence: 0.3, source: 'extension' },
    'xlsx': { type: 'question_bank', confidence: 0.4, source: 'extension' },
    'xls': { type: 'question_bank', confidence: 0.4, source: 'extension' },
    'pdf': { type: 'question_bank', confidence: 0.3, source: 'extension' },
    'txt': { type: 'question_bank', confidence: 0.2, source: 'extension' }
  }
  
  return hints[ext] ? [hints[ext]] : []
}

/**
 * 分析文件内容
 */
function analyzeContent(text) {
  const results = []
  const lowerText = text.toLowerCase()
  
  // 题库特征
  let questionScore = 0
  
  // 检测题型关键词
  const typeKeywords = ['单选题', '多选题', '判断题', '简答题', '填空题']
  const foundTypes = typeKeywords.filter(kw => lowerText.includes(kw))
  questionScore += foundTypes.length * 0.2
  
  // 检测答案模式
  if (/答案[：:]/i.test(text)) questionScore += 0.2
  if (/[A-D][\.、]/i.test(text)) questionScore += 0.15
  if (/[√×对错]/.test(text)) questionScore += 0.15
  
  // 检测选项模式
  if (/[A-D][\.、][^A-D]/i.test(text)) questionScore += 0.2
  
  if (questionScore > 0.3) {
    results.push({
      type: 'question_bank',
      confidence: Math.min(questionScore, 0.9),
      source: 'content'
    })
  }
  
  // 试卷特征
  let examScore = 0
  
  // 检测"模拟试卷"、"考试"、"测试"等关键词
  if (/模拟试卷|考试|测试|test|exam/i.test(text)) examScore += 0.3
  
  // 检测大题结构
  if (/[一二三四五六七八九十][、.．]\s*(单选|多选|判断|简答)/i.test(text)) {
    examScore += 0.4
  }
  
  if (examScore > 0.3) {
    results.push({
      type: 'exam_paper',
      confidence: Math.min(examScore, 0.9),
      source: 'content'
    })
  }
  
  // 单词列表特征
  let vocabScore = 0
  
  // 检测"单词"、"词汇"、"词头"等关键词
  if (/单词|词汇|词头|vocabulary|word list/i.test(text)) vocabScore += 0.3
  
  // 检测音标符号
  if (/[\[\/\/].*[\/\/]]/.test(text)) vocabScore += 0.3
  
  if (vocabScore > 0.3) {
    results.push({
      type: 'vocabulary',
      confidence: Math.min(vocabScore, 0.9),
      source: 'content'
    })
  }
  
  return results
}

/**
 * 分析docx文件结构
 */
async function analyzeDocxStructure(file) {
  const results = []
  
  try {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = result.value
    
    // 复用内容分析逻辑
    const contentHints = analyzeContent(text)
    
    // 提高置信度（因为有实际文件内容）
    contentHints.forEach(hint => {
      hint.confidence = Math.min(hint.confidence + 0.1, 0.95)
      hint.source = 'docx_structure'
    })
    
    results.push(...contentHints)
  } catch (e) {
    console.warn('无法分析docx结构:', e)
  }
  
  return results
}

/**
 * 分析Excel文件结构
 */
async function analyzeExcelStructure(file) {
  const results = []
  
  try {
    // 这里可以读取Excel表头来判断
    // 暂时返回基础判断
    results.push({
      type: 'question_bank',
      confidence: 0.6,
      source: 'excel_structure'
    })
  } catch (e) {
    console.warn('无法分析Excel结构:', e)
  }
  
  return results
}

/**
 * 汇总评分
 */
function scoreResults(results) {
  const typeScores = {}
  
  results.forEach(result => {
    if (!typeScores[result.type]) {
      typeScores[result.type] = {
        type: result.type,
        confidence: 0,
        sources: []
      }
    }
    
    typeScores[result.type].confidence += result.confidence
    typeScores[result.type].sources.push(result.source)
  })
  
  // 转换为数组并排序
  const scoredArray = Object.values(typeScores).map(item => ({
    ...item,
    confidence: Math.min(item.confidence, 1.0)
  }))
  
  scoredArray.sort((a, b) => b.confidence - a.confidence)
  
  return scoredArray
}

/**
 * 获取类型描述
 */
export function getTypeDescription(typeId) {
  const mapping = FIELD_MAPPINGS[typeId]
  return mapping ? mapping.description : '未知类型'
}

/**
 * 获取所有支持的类型
 */
export function getSupportedTypes() {
  return Object.values(FIELD_MAPPINGS).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description
  }))
}

export default {
  recognizeType,
  getTypeDescription,
  getSupportedTypes
}
