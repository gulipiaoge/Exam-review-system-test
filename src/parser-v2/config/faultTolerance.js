/**
 * 配置层级2：容错规则配置
 * 定义每种类型允许缺失哪些字段、缺失时的默认值
 */

export const FAULT_TOLERANCE = {
  // 题库容错规则
  question_bank: {
    id: 'question_bank',
    
    // 允许为空的字段（不会触发错误）
    nullableFields: ['explanation', 'chapter', 'optionC', 'optionD'],
    
    // 缺失时的默认值
    defaults: {
      difficulty: 'medium',
      type: 'single',
      explanation: '',
      chapter: '未分类'
    },
    
    // 字段依赖规则：某些字段依赖其他字段
    dependencies: {
      'optionC': {
        dependsOn: 'type',
        condition: (type) => ['multi', 'fill'].includes(type),
        message: '多选题/填空题需要选项C'
      },
      'optionD': {
        dependsOn: 'type',
        condition: (type) => ['multi', 'fill'].includes(type),
        message: '多选题/填空题需要选项D'
      }
    },
    
    // 自动修复规则
    autoFix: {
      type: (value) => {
        // 自动识别题型
        if (/单选|选择题/.test(value)) return 'single'
        if (/多选/.test(value)) return 'multi'
        if (/判断|是非/.test(value)) return 'judge'
        if (/简答/.test(value)) return 'essay'
        if (/填空/.test(value)) return 'fill'
        return value
      },
      answer: (value, record) => {
        // 根据题型自动格式化答案
        if (record.type === 'single') {
          // 单选题答案：提取A/B/C/D
          const match = value.match(/[A-D]/i)
          return match ? match[0].toUpperCase() : value
        }
        if (record.type === 'multi') {
          // 多选题答案：提取所有字母
          const matches = value.match(/[A-D]/gi)
          return matches ? matches.join('') : value
        }
        if (record.type === 'judge') {
          // 判断题答案：统一为"正确"/"错误"
          if (/对|正确|√|T|true/i.test(value)) return '正确'
          if (/错|错误|×|F|false/i.test(value)) return '错误'
          return value
        }
        return value
      }
    }
  },
  
  // 试卷容错规则
  exam_paper: {
    id: 'exam_paper',
    
    nullableFields: ['explanation', 'score'],
    
    defaults: {
      score: 1,
      explanation: ''
    },
    
    dependencies: {},
    
    autoFix: {}
  },
  
  // 单词容错规则
  vocabulary: {
    id: 'vocabulary',
    
    nullableFields: ['phonetic', 'pos', 'example'],
    
    defaults: {
      phonetic: '',
      pos: '',
      example: ''
    },
    
    dependencies: {},
    
    autoFix: {
      pos: (value) => {
        // 标准化词性
        const posMap = {
          'n': 'noun',
          'v': 'verb',
          'adj': 'adjective',
          'adv': 'adverb',
          '名词': 'noun',
          '动词': 'verb',
          '形容词': 'adjective',
          '副词': 'adverb'
        }
        return posMap[value] || value
      }
    }
  },
  
  // 闪卡容错规则
  flashcard: {
    id: 'flashcard',
    
    nullableFields: ['tags'],
    
    defaults: {
      tags: ''
    },
    
    dependencies: {},
    
    autoFix: {}
  }
}

export default FAULT_TOLERANCE
