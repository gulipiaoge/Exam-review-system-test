/**
 * 层3：解析适配层 - 闪卡适配器
 * 解析闪卡、记忆卡片等
 */

import { cleanText } from '@/parser-v2/layer1-clean/cleaner'
import { FIELD_MAPPINGS } from '@/parser-v2/config/fieldMappings'
import { FAULT_TOLERANCE } from '@/parser-v2/config/faultTolerance'

/**
 * 解析闪卡文件
 * @param {File} file - 上传的文件
 * @param {object} options - 解析选项
 * @returns {Promise<{success: boolean, data: Array, errors: Array, warnings: Array}>}
 */
export async function parseFlashcard(file, options = {}) {
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
        return mapAndFixRecord(record, 'flashcard')
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
 * 解析docx文件（闪卡）
 */
async function parseDocx(file, warnings) {
  try {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    
    // 提取文本
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = cleanText(result.value)
    
    // 使用闪卡专用解析逻辑
    return parseFlashcardText(text, warnings)
  } catch (e) {
    console.error('解析docx失败:', e)
    throw new Error('无法解析Word文档')
  }
}

/**
 * 解析Excel文件（闪卡）
 * Excel格式：front | back | hint | tag
 */
async function parseExcel(file, warnings) {
  try {
    // 这里应该读取Excel文件
    // 简化实现：返回空数组
    warnings.push('Excel闪卡解析功能开发中')
    return []
  } catch (e) {
    console.error('解析Excel失败:', e)
    return []
  }
}

/**
 * 解析txt文件（闪卡）
 */
async function parseTxt(file, warnings) {
  const text = await file.text()
  const cleaned = cleanText(text)
  return parseFlashcardText(cleaned, warnings)
}

/**
 * 解析PDF文件（闪卡）
 */
async function parsePdf(file, warnings) {
  warnings.push('PDF解析功能开发中')
  return []
}

/**
 * 从文本中解析闪卡
 * 支持多种格式：
 * 
 * 格式1（标准）：
 * front: 问题内容
 * back: 答案内容
 * hint: 提示（可选）
 * tag: 标签（可选）
 * 
 * 格式2（紧凑）：
 * 问题内容 || 答案内容
 * 问题内容 \t 答案内容
 * 
 * 格式3（QA格式）：
 * Q: 问题
 * A: 答案
 */
function parseFlashcardText(text, warnings) {
  const cards = []
  const lines = text.split('\n').filter(line => line.trim())
  
  let currentCard = null
  let format = detectFlashcardFormat(lines)
  
  if (format === 'standard') {
    // 格式1：标准格式（逐字段定义）
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 检测字段行
      const fieldMatch = line.match(/^(front|back|hint|tag|Q|A)[：:\s]*(.+)$/i)
      if (fieldMatch) {
        const fieldName = fieldMatch[1].toLowerCase()
        const fieldValue = fieldMatch[2].trim()
        
        if (fieldName === 'front' || fieldName === 'q') {
          // 保存上一张卡
          if (currentCard && currentCard.front) {
            cards.push(currentCard)
          }
          
          // 开始新卡片
          currentCard = {
            front: fieldValue,
            back: '',
            hint: '',
            tags: []
          }
        } else if (currentCard) {
          // 设置字段值
          if (fieldName === 'back' || fieldName === 'a') currentCard.back = fieldValue
          if (fieldName === 'hint') currentCard.hint = fieldValue
          if (fieldName === 'tag') currentCard.tags.push(fieldValue)
        }
        continue
      }
      
      // 如果不是字段行，可能是上一个字段的延续
      if (currentCard && line.length > 0) {
        // 简单处理：追加到back
        if (currentCard.back && !line.match(/^(front|back|hint|tag|Q|A)[：:]/i)) {
          currentCard.back += ' ' + line
        }
      }
    }
    
    // 保存最后一张卡
    if (currentCard && currentCard.front) {
      cards.push(currentCard)
    }
    
  } else if (format === 'compact') {
    // 格式2：紧凑格式（一行一张卡）
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 匹配模式：front || back 或 front \t back
      const compactMatch = line.match(/^(.+?)\s*(?:\|\||\t)\s*(.+)$/)
      if (compactMatch) {
        currentCard = {
          front: compactMatch[1].trim(),
          back: compactMatch[2].trim(),
          hint: '',
          tags: []
        }
        cards.push(currentCard)
        continue
      }
    }
    
  } else {
    // 格式3：问答格式或未知格式
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 检测Q/A格式
      const qMatch = line.match(/^(Q|Question|问题)[：:\s]*(.+)$/i)
      if (qMatch) {
        // 保存上一张卡
        if (currentCard && currentCard.front) {
          cards.push(currentCard)
        }
        
        currentCard = {
          front: qMatch[2].trim(),
          back: '',
          hint: '',
          tags: []
        }
        continue
      }
      
      const aMatch = line.match(/^(A|Answer|答案)[：:\s]*(.+)$/i)
      if (aMatch && currentCard) {
        currentCard.back = aMatch[2].trim()
        cards.push(currentCard)
        currentCard = null
        continue
      }
      
      // 如果当前有未完成的卡片，这一行可能是back的延续
      if (currentCard && !currentCard.back && line.length > 0) {
        // 可能是back的内容
        if (!line.match(/^(Q|Question|问题)/i)) {
          currentCard.back = line
        }
      }
    }
    
    // 保存最后一张卡
    if (currentCard && currentCard.front && currentCard.back) {
      cards.push(currentCard)
    }
  }
  
  return cards
}

/**
 * 检测闪卡文本格式
 */
function detectFlashcardFormat(lines) {
  // 检查是否有标准格式的字段标记
  const hasStandardFields = lines.some(line => 
    /^(front|back|hint|tag)[：:\s]/.test(line)
  )
  if (hasStandardFields) return 'standard'
  
  // 检查是否有紧凑格式（|| 或 \t）
  const hasCompactFormat = lines.some(line => 
    /^(.+?)\s*(?:\|\||\t)\s*(.+)$/.test(line)
  )
  if (hasCompactFormat) return 'compact'
  
  // 默认：问答格式
  return 'qa'
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
  parseFlashcard
}
