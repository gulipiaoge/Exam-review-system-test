/**
 * 解析器配置 - 版本 1.1
 * 增强版本 - 添加True/False题型支持，增加更多列头变体
 */

export default {
  version: '1.1',
  description: '增强版本 - 添加判断题型支持，增加更多列头变体',
  createdAt: '2026-06-25',
  parentVersion: '1.0',
  changelog: {
    added: [
      '添加判断题（True/False）题型支持',
      '增加更多列头变体（英文标签）',
      '添加题型自动检测（根据答案格式）'
    ],
    changed: [],
    deprecated: []
  },
  
  fieldMappings: {
    '题库': {
      name: '题库',
      mappings: [
        { field: 'question', labels: ['题干', '题目', '问题', 'question', '题目内容', 'Q', 'Question'] },
        { field: 'optionA', labels: ['选项A', 'A', 'A.', '选项1', 'A选项', 'Option A'] },
        { field: 'optionB', labels: ['选项B', 'B', 'B.', '选项2', 'B选项', 'Option B'] },
        { field: 'optionC', labels: ['选项C', 'C', 'C.', '选项3', 'C选项', 'Option C'] },
        { field: 'optionD', labels: ['选项D', 'D', 'D.', '选项4', 'D选项', 'Option D'] },
        { field: 'answer', labels: ['正确答案', '答案', '正确选项', 'answer', '标准答案', 'Answer', 'Correct'] },
        { field: 'explanation', labels: ['解析', '解释', '说明', 'explanation', '答案解析', 'Explanation'] },
        { field: 'type', labels: ['题型', '题目类型', 'type', '分类', 'Type', 'Category'] },
        { field: 'difficulty', labels: ['难度', '困难程度', 'difficulty', '星级', 'Difficulty', 'Stars'] },
        { field: 'chapter', labels: ['章节', '章节名称', 'chapter', '所属章节', 'Chapter', 'Section'] },
        { field: 'subject', labels: ['科目', '学科', 'subject', '课程', 'Subject', 'Course'] }
      ],
      required: ['question', 'answer'],
      supportedTypes: ['单选', '多选', '判断', '填空', '简答']
    },
    
    '试卷': {
      name: '试卷',
      mappings: [
        { field: 'majorNumber', labels: ['大题号', '主序号', 'major_no', '大题', 'Major No.'] },
        { field: 'minorNumber', labels: ['小题号', '子序号', 'minor_no', '小题', 'Minor No.'] },
        { field: 'score', labels: ['分值', '分数', 'score', '分值分配', 'Score', 'Points'] },
        { field: 'type', labels: ['题型', '题目类型', '题型标识', 'type', 'Type', 'Category'] },
        { field: 'question', labels: ['题干', '题目', '问题', 'question', 'Question'] },
        { field: 'answer', labels: ['正确答案', '答案', '标准答案', 'answer', 'Answer', 'Correct Answer'] },
        { field: 'explanation', labels: ['解析', '解释', '说明', 'explanation', 'Explanation'] }
      ],
      required: ['question']
    },
    
    '单词': {
      name: '单词',
      mappings: [
        { field: 'word', labels: ['词头', '单词', 'word', '词汇', '英文', 'Word', 'Vocabulary'] },
        { field: 'partOfSpeech', labels: ['词性', 'pos', 'part_of_speech', 'Part of Speech'] },
        { field: 'meaning', labels: ['释义', '中文意思', 'meaning', '翻译', '中文', 'Meaning', 'Translation'] },
        { field: 'phonetic', labels: ['音标', '发音', 'phonetic', '音标符号', 'Phonetic'] },
        { field: 'example', labels: ['例句', '示例', 'example', '例句展示', 'Example'] }
      ],
      required: ['word', 'meaning']
    },
    
    '闪卡': {
      name: '闪卡',
      mappings: [
        { field: 'front', labels: ['正面内容', '正面', 'front', '问题面', '提问', 'Front', 'Question'] },
        { field: 'back', labels: ['反面内容', '反面', 'back', '答案面', '回答', 'Back', 'Answer'] },
        { field: 'hint', labels: ['提示', 'hint', '线索', '提醒', 'Hint', 'Clue'] },
        { field: 'tags', labels: ['标签', 'tags', '分类标签', 'keyword', 'Tags', 'Keywords'] }
      ],
      required: ['front', 'back']
    }
  },
  
  toleranceRules: {
    maxEmptyRows: 5,
    maxEmptyColumns: 3,
    ignoreSheets: ['Sheet1', '工作表1', 'Sheet'],
    autoTrim: true,
    caseInsensitive: true,
    ignoreHiddenRows: true,
    ignoreHiddenColumns: true
  },
  
  validationRules: {
    maxQuestionLength: 2000,
    maxOptionLength: 500,
    maxExplanationLength: 1000,
    allowEmptyOptions: true,
    requireAnswer: true,
    maxQuestionsPerFile: 1000,
    allowHtmlInContent: false
  },
  
  typeDetection: {
    enabled: true,
    rules: {
      '判断': {
        answerPatterns: ['对', '错', '正确', '错误', '√', '×', 'T', 'F', 'True', 'False', '是', '否'],
        confidence: 0.8
      },
      '多选': {
        answerPatterns: ['[A-D]{2,}', '^(A|B|C|D)+$'],
        confidence: 0.7
      }
    }
  }
}
