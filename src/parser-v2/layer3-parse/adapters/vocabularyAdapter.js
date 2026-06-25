/**
 * 层3：解析适配层 - 单词适配器
 * 解析单词列表、词汇表等
 */

import { cleanText } from '@/parser-v2/layer1-clean/cleaner'
import { FIELD_MAPPINGS } from '@/parser-v2/config/fieldMappings'
import { FAULT_TOLERANCE } from '@/parser-v2/config/faultTolerance'

/**
 * 解析单词文件
 * @param {File} file - 上传的文件
 * @param {object} options - 解析选项
 * @returns {Promise<{success: boolean, data: Array, errors: Array, warnings: Array}>}
 */
export async function parseVocabulary(file, options = {}) {
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
        return mapAndFixRecord(record, 'vocabulary')
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
 * 解析docx文件（单词）
 */
async function parseDocx(file, warnings) {
  try {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    
    // 提取文本
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = cleanText(result.value)
    
    // 使用单词专用解析逻辑
    return parseVocabText(text, warnings)
  } catch (e) {
    console.error('解析docx失败:', e)
    throw new Error('无法解析Word文档')
  }
}

/**
 * 解析Excel文件（单词）
 * Excel格式：word | phonetic | pos | meaning | example
 */
async function parseExcel(file, warnings) {
  try {
    // 这里应该读取Excel文件
    // 简化实现：返回空数组
    warnings.push('Excel单词解析功能开发中')
    return []
  } catch (e) {
    console.error('解析Excel失败:', e)
    return []
  }
}

/**
 * 解析txt文件（单词）
 */
async function parseTxt(file, warnings) {
  const text = await file.text()
  const cleaned = cleanText(text)
  return parseVocabText(cleaned, warnings)
}

/**
 * 解析PDF文件（单词）
 */
async function parsePdf(file, warnings) {
  warnings.push('PDF解析功能开发中')
  return []
}

/**
 * 从文本中解析单词列表
 * 支持多种格式：
 * 
 * 格式1（标准）：
 * word: apple
 * phonetic: /'æpl/
 * pos: n.
 * meaning: 苹果
 * example: I eat an apple every day.
 * 
 * 格式2（紧凑）：
 * apple /'æpl/ n. 苹果
 * 
 * 格式3（表格）：
 * | 单词 | 音标 | 词性 | 释义 |
 * | apple | /'æpl/ | n. | 苹果 |
 */
function parseVocabText(text, warnings) {
  const words = []
  const lines = text.split('\n').filter(line => line.trim())
  
  let currentWord = null
  let format = detectFormat(lines)
  
  if (format === 'standard') {
    // 格式1：标准格式（逐字段定义）
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 检测字段行
      const fieldMatch = line.match(/^(word|phonetic|pos|meaning|example|word_head|tag)[：:\s]*(.+)$/i)
      if (fieldMatch) {
        const fieldName = fieldMatch[1].toLowerCase()
        const fieldValue = fieldMatch[2].trim()
        
        if (fieldName === 'word' || fieldName === 'word_head') {
          // 保存上一个单词
          if (currentWord && currentWord.word) {
            words.push(currentWord)
          }
          
          // 开始新单词
          currentWord = {
            word: fieldValue,
            phonetic: '',
            pos: '',
            meaning: '',
            example: '',
            tags: []
          }
        } else if (currentWord) {
          // 设置字段值
          if (fieldName === 'phonetic') currentWord.phonetic = fieldValue
          if (fieldName === 'pos') currentWord.pos = fieldValue
          if (fieldName === 'meaning') currentWord.meaning = fieldValue
          if (fieldName === 'example') currentWord.example = fieldValue
          if (fieldName === 'tag') currentWord.tags.push(fieldValue)
        }
        continue
      }
      
      // 如果不是字段行，可能是上一个字段的延续
      if (currentWord && line.length > 0) {
        // 简单处理：追加到meaning
        if (currentWord.meaning && !line.match(/^(word|phonetic|pos|meaning|example)[：:]/i)) {
          currentWord.meaning += ' ' + line
        }
      }
    }
    
    // 保存最后一个单词
    if (currentWord && currentWord.word) {
      words.push(currentWord)
    }
    
  } else if (format === 'compact') {
    // 格式2：紧凑格式（一行一个单词）
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 匹配模式：word phonetic pos meaning
      const compactMatch = line.match(/^(\S+)\s+(\/\S+\/)\s+(\S+)\s+(.+)$/)
      if (compactMatch) {
        currentWord = {
          word: compactMatch[1],
          phonetic: compactMatch[2],
          pos: compactMatch[3],
          meaning: compactMatch[4],
          example: '',
          tags: []
        }
        words.push(currentWord)
        continue
      }
      
      // 如果上一行是单词，这一行可能是例句
      if (currentWord && line.match(/^例[句句]/)) {
        currentWord.example = line.replace(/^例[句句][：:\s]*/, '')
      }
    }
    
  } else {
    // 格式3：表格格式或未知格式
    // 尝试按行解析
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 跳过表头
      if (/^(\||\s*)单词\s*(\||\s*)音标\s*(\||\s*)释义/.test(line)) {
        continue
      }
      
      // 尝试按分隔符分割
      const parts = line.split(/\s{2,}|\t|\|/).map(s => s.trim()).filter(Boolean)
      
      if (parts.length >= 2) {
        currentWord = {
          word: parts[0],
          phonetic: parts[1] || '',
          pos: parts[2] || '',
          meaning: parts[3] || parts[1] || '',
          example: parts[4] || '',
          tags: []
        }
        words.push(currentWord)
      }
    }
  }
  
  return words
}

/**
 * 检测文本格式
 */
function detectFormat(lines) {
  // 检查是否有标准格式的字段标记
  const hasStandardFields = lines.some(line => 
    /^(word|phonetic|pos|meaning|example)[：:\s]/.test(line)
  )
  if (hasStandardFields) return 'standard'
  
  // 检查是否有紧凑格式（word phonetic pos meaning）
  const hasCompactFormat = lines.some(line => 
    /^(\S+)\s+(\/\S+\/)\s+(\S+)\s+(.+)$/.test(line)
  )
  if (hasCompactFormat) return 'compact'
  
  // 默认：表格格式
  return 'table'
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
    
    // 数组字段处理（如tags）
    if (type === 'array' && typeof value === 'string') {
      value = value.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
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
  parseVocabulary
}
