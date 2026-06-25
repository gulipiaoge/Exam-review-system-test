/**
 * 层1：格式清洗层
 * 处理编码、BOM头、换行符统一
 * 这层永远不改，作为所有流量的稳定入口
 */

/**
 * 清洗文本内容
 * @param {string} text - 原始文本
 * @param {object} options - 清洗选项
 * @returns {string} 清洗后的文本
 */
export function cleanText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  let cleaned = text
  
  // 1. 移除BOM头（UTF-8 BOM: EF BB BF）
  cleaned = removeBOM(cleaned)
  
  // 2. 统一换行符为 \n
  cleaned = normalizeLineEndings(cleaned)
  
  // 3. 移除多余的空行（连续3个以上换行符缩减为2个）
  if (options.collapseEmptyLines !== false) {
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  }
  
  // 4. 移除行首行尾的空白字符
  if (options.trimLines !== false) {
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n')
  }
  
  // 5. 移除整个文本开头和结尾的空白
  cleaned = cleaned.trim()
  
  // 6. 统一引号（智能引号转为普通引号）
  if (options.normalizeQuotes !== false) {
    cleaned = normalizeQuotes(cleaned)
  }
  
  // 7. 统一连字符和破折号
  if (options.normalizeDashes !== false) {
    cleaned = normalizeDashes(cleaned)
  }
  
  // 8. 移除零宽度字符
  cleaned = removeZeroWidthChars(cleaned)
  
  // 9. 统一空格（多个空格合并为一个）
  if (options.collapseSpaces !== false) {
    cleaned = cleaned.replace(/[ \t]+/g, ' ')
  }
  
  return cleaned
}

/**
 * 移除BOM头
 */
function removeBOM(text) {
  // UTF-8 BOM
  text = text.replace(/^\uFEFF/, '')
  // UTF-16 BOM (LE)
  text = text.replace(/^\uFFFE/, '')
  // UTF-16 BOM (BE)
  text = text.replace(/^\uFFFF/, '')
  return text
}

/**
 * 统一换行符
 */
function normalizeLineEndings(text) {
  // Windows (\r\n) -> Unix (\n)
  text = text.replace(/\r\n/g, '\n')
  // Old Mac (\r) -> Unix (\n)
  text = text.replace(/\r/g, '\n')
  return text
}

/**
 * 统一引号
 */
function normalizeQuotes(text) {
  // 智能双引号
  text = text.replace(/[\u201C\u201D]/g, '"')
  // 智能单引号
  text = text.replace(/[\u2018\u2019]/g, "'")
  return text
}

/**
 * 统一连字符和破折号
 */
function normalizeDashes(text) {
  // 长破折号
  text = text.replace(/[\u2014\u2015]/g, '--')
  // 短破折号
  text = text.replace(/[\u2013]/g, '-')
  return text
}

/**
 * 移除零宽度字符
 */
function removeZeroWidthChars(text) {
  // 零宽度空格、零宽度连接符、零宽度非连接符、软连字符
  return text.replace(/[\u200B\u200C\u200D\u00AD]/g, '')
}

/**
 * 从File对象读取并清洗文本
 * @param {File} file - 文本文件
 * @returns {Promise<string>}
 */
export async function cleanFromFile(file) {
  try {
    const text = await file.text()
    return cleanText(text)
  } catch (e) {
    console.error('读取文件失败:', e)
    throw new Error('无法读取文件内容')
  }
}

/**
 * 批量清洗文本数组
 */
export function cleanBatch(texts) {
  return texts.map(text => cleanText(text))
}

export default {
  cleanText,
  cleanFromFile
}
