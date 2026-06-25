/**
 * 配置层级3：校验规则配置
 * 定义字段级别的校验规则
 */

export const VALIDATION_RULES = {
  // 题库校验规则
  question_bank: {
    id: 'question_bank',
    
    rules: {
      questionText: [
        {
          type: 'required',
          message: '题干不能为空'
        },
        {
          type: 'minLength',
          value: 2,
          message: '题干至少2个字符'
        },
        {
          type: 'maxLength',
          value: 2000,
          message: '题干不能超过2000个字符'
        }
      ],
      
      type: [
        {
          type: 'required',
          message: '题型不能为空'
        },
        {
          type: 'enum',
          value: ['single', 'multi', 'judge', 'essay', 'fill', 'comprehensive'],
          message: '题型必须是：单选题、多选题、判断题、简答题、填空题、综合题之一'
        }
      ],
      
      answer: [
        {
          type: 'required',
          message: '答案不能为空'
        },
        {
          type: 'custom',
          validator: (value, record) => {
            // 根据题型校验答案格式
            if (record.type === 'single') {
              return /^[A-D]$/.test(value.trim())
            }
            if (record.type === 'multi') {
              return /^[A-D]{2,}$/.test(value.trim())
            }
            if (record.type === 'judge') {
              return ['正确', '错误'].includes(value.trim())
            }
            return true
          },
          message: '答案格式不正确'
        }
      ],
      
      optionA: [
        {
          type: 'conditional_required',
          condition: (record) => ['single', 'multi'].includes(record.type),
          message: '单选题/多选题必须提供选项A'
        }
      ],
      
      optionB: [
        {
          type: 'conditional_required',
          condition: (record) => ['single', 'multi'].includes(record.type),
          message: '单选题/多选题必须提供选项B'
        }
      ],
      
      difficulty: [
        {
          type: 'enum',
          value: ['easy', 'medium', 'hard'],
          message: '难度必须是：简单、中等、困难之一'
        }
      ]
    },
    
    // 记录级别校验
    recordValidators: [
      {
        name: 'options_consistency',
        validator: (record) => {
          // 检查选项和答案的一致性
          if (record.type === 'single') {
            const answer = record.answer.trim()
            if (!['A', 'B', 'C', 'D'].includes(answer)) {
              return { valid: false, message: `答案"${answer}"不在选项范围内` }
            }
          }
          return { valid: true }
        }
      }
    ]
  },
  
  // 试卷校验规则
  exam_paper: {
    id: 'exam_paper',
    
    rules: {
      questionNumber: [
        {
          type: 'required',
          message: '题号不能为空'
        }
      ],
      
      questionText: [
        {
          type: 'required',
          message: '题干不能为空'
        },
        {
          type: 'minLength',
          value: 2,
          message: '题干至少2个字符'
        }
      ],
      
      score: [
        {
          type: 'numeric',
          message: '分值必须是数字'
        },
        {
          type: 'range',
          min: 0,
          max: 100,
          message: '分值必须在0-100之间'
        }
      ]
    },
    
    recordValidators: []
  },
  
  // 单词校验规则
  vocabulary: {
    id: 'vocabulary',
    
    rules: {
      word: [
        {
          type: 'required',
          message: '单词不能为空'
        },
        {
          type: 'minLength',
          value: 1,
          message: '单词至少1个字符'
        },
        {
          type: 'maxLength',
          value: 50,
          message: '单词不能超过50个字符'
        }
      ],
      
      definition: [
        {
          type: 'required',
          message: '释义不能为空'
        }
      ],
      
      pos: [
        {
          type: 'enum',
          value: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', ''],
          message: '词性必须是有效的词性缩写'
        }
      ]
    },
    
    recordValidators: []
  },
  
  // 闪卡校验规则
  flashcard: {
    id: 'flashcard',
    
    rules: {
      front: [
        {
          type: 'required',
          message: '正面内容不能为空'
        }
      ],
      
      back: [
        {
          type: 'required',
          message: '反面内容不能为空'
        }
      ]
    },
    
    recordValidators: []
  }
}

export default VALIDATION_RULES
