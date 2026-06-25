/**
 * 层0：预检层
 * 文件上传前的预检查：大小、格式、完整性
 */

import { ElMessage } from 'element-plus'

// 允许的文件类型
const ALLOWED_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip'
}

// 文件扩展名映射
const EXTENSION_MAP = {
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'doc': 'application/msword',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'xls': 'application/vnd.ms-excel',
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'zip': 'application/zip'
}

// 最大文件大小（字节）
const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50MB

/**
 * 预检文件
 * @param {File} file - 上传的文件
 * @returns {Promise<{valid: boolean, error?: string, fileInfo?: object}>}
 */
export async function precheck(file) {
  const errors = []
  const warnings = []
  
  // 1. 检查文件是否存在
  if (!file) {
    return { valid: false, error: '未检测到文件' }
  }
  
  // 2. 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`文件大小超过限制（最大${MAX_FILE_SIZE / 1024 / 1024}MB）`)
  }
  
  if (file.size === 0) {
    errors.push('文件为空')
  }
  
  // 3. 检查文件类型（通过MIME类型和扩展名双重验证）
  const ext = file.name.split('.').pop().toLowerCase()
  const mimeType = file.type || EXTENSION_MAP[ext]
  
  if (!mimeType || !ALLOWED_TYPES[mimeType]) {
    errors.push(`不支持的文件类型：${ext}`)
  }
  
  // 4. 检查文件扩展名与MIME类型是否匹配
  if (mimeType && EXTENSION_MAP[ext] && mimeType !== EXTENSION_MAP[ext]) {
    warnings.push('文件扩展名与文件类型不匹配，将尝试按扩展名解析')
  }
  
  // 5. 检查文件名（避免特殊字符）
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(file.name)) {
    errors.push('文件名包含非法字符')
  }
  
  // 6. ZIP文件特殊处理：检查是否是压缩包
  if (ext === 'zip') {
    try {
      const zipValid = await validateZip(file)
      if (!zipValid) {
        errors.push('ZIP文件已损坏')
      }
    } catch (e) {
      warnings.push('无法验证ZIP文件完整性')
    }
  }
  
  // 7. 检查文件可读性（尝试读取前几个字节）
  try {
    const slice = file.slice(0, 4)
    const buffer = await slice.arrayBuffer()
    const view = new Uint8Array(buffer)
    
    // 检查文件头魔术数字
    const magicNumbers = {
      'docx': [0x50, 0x4B, 0x03, 0x04],  // ZIP格式（docx本质上是zip）
      'xlsx': [0x50, 0x4B, 0x03, 0x04],
      'pdf': [0x25, 0x50, 0x44, 0x46]   // %PDF
    }
    
    if (magicNumbers[ext]) {
      const expected = magicNumbers[ext]
      const matches = expected.every((byte, i) => view[i] === byte)
      if (!matches) {
        warnings.push('文件头信息异常，可能不是有效的' + ext.toUpperCase() + '文件')
      }
    }
  } catch (e) {
    warnings.push('无法读取文件头信息')
  }
  
  // 返回结果
  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('；'),
      warnings
    }
  }
  
  return {
    valid: true,
    warnings,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: mimeType,
      extension: ext
    }
  }
}

/**
 * 验证ZIP文件完整性
 */
async function validateZip(file) {
  try {
    const slice = file.slice(0, 4)
    const buffer = await slice.arrayBuffer()
    const view = new Uint8Array(buffer)
    
    // ZIP文件魔术数字：PK\x03\x04
    return view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04
  } catch (e) {
    return false
  }
}

/**
 * 获取文件信息
 */
export function getFileInfo(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  return {
    name: file.name,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    type: file.type || EXTENSION_MAP[ext] || 'unknown',
    extension: ext,
    lastModified: new Date(file.lastModified)
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default {
  precheck,
  getFileInfo
}
