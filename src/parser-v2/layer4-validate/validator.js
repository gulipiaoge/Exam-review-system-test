/**
 * 层4：暂存校验层
 * 配置驱动的校验系统
 */

import { VALIDATION_RULES } from '@/parser-v2/config/validationRules'

/**
 * 校验解析结果
 * @param {Array} data - 解析后的数据
 * @param {string} typeId - 内容类型ID
 * @returns {{valid: boolean, errors: Array, warnings: Array, validData: Array}}
 */
export function validate(data, typeId) {
  const errors = []
  const warnings = []
  const validData = []
  
  const rules = VALIDATION_RULES[typeId]
  if (!rules) {
    warnings.push(`未找到类型"${typeId}"的校验规则`)
    return { valid: true, errors, warnings, validData: data }
  }
  
  // 逐条记录校验
  data.forEach((record, index) => {
    const rowErrors = []
    const rowWarnings = []
    
    // 字段级别校验
    Object.entries(rules.rules).forEach(([field, fieldRules]) => {
      fieldRules.forEach(rule => {
        const result = validateField(field, record[field], rule, record)
        if (!result.valid) {
          rowErrors.push({
            row: index + 1,
            field,
            message: result.message
          })
        }
      })
    })
    
    // 记录级别校验
    rules.recordValidators.forEach(validator => {
      const result = validator.validator(record)
      if (!result.valid) {
        rowErrors.push({
          row: index + 1,
          field: '_record',
          message: result.message
        })
      }
    })
    
    // 判断记录是否有效
    if (rowErrors.length === 0) {
      validData.push(record)
    } else {
      errors.push(...rowErrors)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validData,
    invalidCount: data.length - validData.length
  }
}

/**
 * 校验单个字段
 */
function validateField(fieldName, value, rule, record) {
  switch (rule.type) {
    case 'required':
      if (value === null || value === undefined || value === '') {
        return { valid: false, message: rule.message }
      }
      break
      
    case 'minLength':
      if (value && value.length < rule.value) {
        return { valid: false, message: rule.message }
      }
      break
      
    case 'maxLength':
      if (value && value.length > rule.value) {
        return { valid: false, message: rule.message }
      }
      break
      
    case 'enum':
      if (value && !rule.value.includes(value)) {
        return { valid: false, message: rule.message }
      }
      break
      
    case 'numeric':
      if (value && isNaN(Number(value))) {
        return { valid: false, message: rule.message }
      }
      break
      
    case 'range':
      if (value) {
        const num = Number(value)
        if (isNaN(num) || num < rule.min || num > rule.max) {
          return { valid: false, message: rule.message }
        }
      }
      break
      
    case 'regex':
      if (value && !rule.value.test(value)) {
        return { valid: false, message: rule.message }
      }
      break
      
    case 'custom':
      if (rule.validator && typeof rule.validator === 'function') {
        const result = rule.validator(value, record)
        if (result === false) {
          return { valid: false, message: rule.message }
        }
      }
      break
      
    case 'conditional_required':
      if (rule.condition && rule.condition(record)) {
        if (value === null || value === undefined || value === '') {
          return { valid: false, message: rule.message }
        }
      }
      break
  }
  
  return { valid: true }
}

/**
 * 批量校验（支持部分校验）
 * @param {Array} data - 数据
 * @param {string} typeId - 类型ID
 * @param {object} options - 选项
 * @returns {object} 校验结果
 */
export function validateBatch(data, typeId, options = {}) {
  const {
    stopOnFirstError = false,  // 遇到第一个错误就停止
    maxErrors = 100,            // 最多报告多少错误
    skipInvalid = true         // 跳过无效记录
  } = options
  
  const result = validate(data, typeId)
  
  // 限制错误数量
  if (result.errors.length > maxErrors) {
    result.errors = result.errors.slice(0, maxErrors)
    result.errors.push({
      row: -1,
      field: '_system',
      message: `还有${result.errors.length - maxErrors}个错误未显示...`
    })
  }
  
  return result
}

export default {
  validate,
  validateBatch
}
