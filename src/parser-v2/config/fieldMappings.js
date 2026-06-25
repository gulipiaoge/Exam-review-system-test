/**
 * 配置层级1：字段映射配置
 * 定义每种内容类型的"源文件字段 → 系统内部字段"映射
 */

export const FIELD_MAPPINGS = {
  // 题库类型
  question_bank: {
    id: 'question_bank',
    name: '题库',
    description: '标准题库导入（单选题、多选题、判断题、简答题）',
    
    // 字段映射：支持多种源字段名映射到统一内部字段
    mappings: {
      questionText: {
        internal: 'questionText',
        aliases: ['题干', '题目', 'question', 'Question', '题目内容'],
        required: true,
        type: 'string'
      },
      type: {
        internal: 'type',
        aliases: ['题型', '类型', 'type', 'Type'],
        required: true,
        type: 'string',
        defaultValue: 'single'
      },
      optionA: {
        internal: 'optionA',
        aliases: ['A', '选项A', 'A.', '选项A：', '选项A:'],
        required: false,
        type: 'string'
      },
      optionB: {
        internal: 'optionB',
        aliases: ['B', '选项B', 'B.', '选项B：', '选项B:'],
        required: false,
        type: 'string'
      },
      optionC: {
        internal: 'optionC',
        aliases: ['C', '选项C', 'C.', '选项C：', '选项C:'],
        required: false,
        type: 'string'
      },
      optionD: {
        internal: 'optionD',
        aliases: ['D', '选项D', 'D.', '选项D：', '选项D:'],
        required: false,
        type: 'string'
      },
      answer: {
        internal: 'answer',
        aliases: ['答案', '正确答案', 'answer', 'Answer', '标准答案'],
        required: true,
        type: 'string'
      },
      explanation: {
        internal: 'explanation',
        aliases: ['解析', '解释', 'explanation', 'Explanation', '答案解析'],
        required: false,
        type: 'string'
      },
      chapter: {
        internal: 'chapter',
        aliases: ['章节', '章', 'chapter', 'Chapter', '所属章节'],
        required: false,
        type: 'string'
      },
      difficulty: {
        internal: 'difficulty',
        aliases: ['难度', 'difficulty', 'Difficulty'],
        required: false,
        type: 'string',
        defaultValue: 'medium'
      }
    },
    
    // 题型映射：将各种题型表示统一为内部类型
    typeMapping: {
      '单选题': 'single',
      '单项选择题': 'single',
      '单选': 'single',
      'single': 'single',
      '多选题': 'multi',
      '多项选择题': 'multi',
      '多选': 'multi',
      'multi': 'multi',
      '判断题': 'judge',
      '判断': 'judge',
      'judge': 'judge',
      '是非题': 'judge',
      '简答题': 'essay',
      '简答': 'essay',
      'essay': 'essay',
      '填空题': 'fill',
      '填空': 'fill',
      'fill': 'fill'
    }
  },
  
  // 试卷类型
  exam_paper: {
    id: 'exam_paper',
    name: '试卷',
    description: '完整试卷导入（包含大题、小题、分值）',
    
    mappings: {
      sectionTitle: {
        internal: 'sectionTitle',
        aliases: ['大题', '题型', 'section', 'Section'],
        required: false,
        type: 'string'
      },
      questionNumber: {
        internal: 'questionNumber',
        aliases: ['题号', '编号', 'number', 'Number'],
        required: true,
        type: 'string'
      },
      questionText: {
        internal: 'questionText',
        aliases: ['题干', '题目', 'question', 'Question'],
        required: true,
        type: 'string'
      },
      score: {
        internal: 'score',
        aliases: ['分值', '分数', 'score', 'Score'],
        required: false,
        type: 'number',
        defaultValue: 1
      },
      answer: {
        internal: 'answer',
        aliases: ['答案', 'answer', 'Answer'],
        required: false,
        type: 'string'
      },
      explanation: {
        internal: 'explanation',
        aliases: ['解析', 'explanation', 'Explanation'],
        required: false,
        type: 'string'
      }
    }
  },
  
  // 单词类型
  vocabulary: {
    id: 'vocabulary',
    name: '单词',
    description: '单词列表导入（词头、词性、释义、例句）',
    
    mappings: {
      word: {
        internal: 'word',
        aliases: ['词头', '单词', 'word', 'Word'],
        required: true,
        type: 'string'
      },
      phonetic: {
        internal: 'phonetic',
        aliases: ['音标', 'phonetic', 'Phonetic'],
        required: false,
        type: 'string'
      },
      pos: {
        internal: 'pos',
        aliases: ['词性', 'part of speech', 'pos', 'POS'],
        required: false,
        type: 'string'
      },
      definition: {
        internal: 'definition',
        aliases: ['释义', '定义', 'definition', 'Definition'],
        required: true,
        type: 'string'
      },
      example: {
        internal: 'example',
        aliases: ['例句', 'example', 'Example'],
        required: false,
        type: 'string'
      }
    }
  },
  
  // 闪卡类型
  flashcard: {
    id: 'flashcard',
    name: '闪卡',
    description: '闪卡导入（正面、反面、标签）',
    
    mappings: {
      front: {
        internal: 'front',
        aliases: ['正面', 'front', 'Front', '问题'],
        required: true,
        type: 'string'
      },
      back: {
        internal: 'back',
        aliases: ['反面', 'back', 'Back', '答案'],
        required: true,
        type: 'string'
      },
      tags: {
        internal: 'tags',
        aliases: ['标签', 'tags', 'Tags'],
        required: false,
        type: 'string'
      }
    }
  }
}

export default FIELD_MAPPINGS
