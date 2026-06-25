/**
 * 解析器配置 - 版本 1.0
 * 初始版本 - 支持题库、试卷、单词、闪卡四种类型
 */

export default {
  version: '1.0',
  description: '初始版本 - 支持题库、试卷、单词、闪卡四种类型',
  createdAt: '2026-06-25',
  
  fieldMappings: {
    '题库': {
      name: '题库',
      mappings: [
        { field: 'question', labels: ['题干', '题目', '问题', 'question', '题目内容'] },
        { field: 'optionA', labels: ['选项A', 'A', 'A.', '选项1', 'A选项'] },
        { field: 'optionB', labels: ['选项B', 'B', 'B.', '选项2', 'B选项'] },
        { field: 'optionC', labels: ['选项C', 'C', 'C.', '选项3', 'C选项'] },
        { field: 'optionD', labels: ['选项D', 'D', 'D.', '选项4', 'D选项'] },
        { field: 'answer', labels: ['正确答案', '答案', '正确选项', 'answer', '标准答案'] },
        { field: 'explanation', labels: ['解析', '解释', '说明', 'explanation', '答案解析'] },
        { field: 'type', labels: ['题型', '题目类型', 'type', '分类'] },
        { field: 'difficulty', labels: ['难度', '困难程度', 'difficulty', '星级'] },
        { field: 'chapter', labels: ['章节', '章节名称', 'chapter', '所属章节'] },
        { field: 'subject', labels: ['科目', '学科', 'subject', '课程'] }
      ],
      required: ['question', 'answer']
    },
    
    '试卷': {
      name: '试卷',
      mappings: [
        { field: 'majorNumber', labels: ['大题号', '主序号', 'major_no', '大题'] },
        { field: 'minorNumber', labels: ['小题号', '子序号', 'minor_no', '小题'] },
        { field: 'score', labels: ['分值', '分数', 'score', '分值分配'] },
        { field: 'type', labels: ['题型', '题目类型', '题型标识', 'type'] },
        { field: 'question', labels: ['题干', '题目', '问题', 'question'] },
        { field: 'answer', labels: ['正确答案', '答案', '标准答案', 'answer'] },
        { field: 'explanation', labels: ['解析', '解释', '说明', 'explanation'] }
      ],
      required: ['question']
    },
    
    '单词': {
      name: '单词',
      mappings: [
        { field: 'word', labels: ['词头', '单词', 'word', '词汇', '英文'] },
        { field: 'partOfSpeech', labels: ['词性', 'pos', 'part_of_speech'] },
        { field: 'meaning', labels: ['释义', '中文意思', 'meaning', '翻译', '中文'] },
        { field: 'phonetic', labels: ['音标', '发音', 'phonetic', '音标符号'] },
        { field: 'example', labels: ['例句', '示例', 'example', '例句展示'] }
      ],
      required: ['word', 'meaning']
    },
    
    '闪卡': {
      name: '闪卡',
      mappings: [
        { field: 'front', labels: ['正面内容', '正面', 'front', '问题面', '提问'] },
        { field: 'back', labels: ['反面内容', '反面', 'back', '答案面', '回答'] },
        { field: 'hint', labels: ['提示', 'hint', '线索', '提醒'] },
        { field: 'tags', labels: ['标签', 'tags', '分类标签', 'keyword'] }
      ],
      required: ['front', 'back']
    }
  },
  
  toleranceRules: {
    maxEmptyRows: 5,
    maxEmptyColumns: 3,
    ignoreSheets: ['Sheet1', '工作表1'],
    autoTrim: true,
    caseInsensitive: true
  },
  
  validationRules: {
    maxQuestionLength: 2000,
    maxOptionLength: 500,
    maxExplanationLength: 1000,
    allowEmptyOptions: true,
    requireAnswer: true
  }
}
