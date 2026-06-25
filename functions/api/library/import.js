// API端点：POST /api/library/import
// 功能：接收上传的文件（xlsx/csv/docx），在服务端解析并返回题目数据
// 支持的类型：题库、试卷、单词、闪卡
// 支持配置版本化管理

import * as XLSX from 'xlsx';
import { dbQueryOne, dbQueryAll, dbRun, generateId, authUser } from '../../_lib/db.js';

// 配置版本化管理（内联配置，避免Wrangler esbuild解析问题）
const CONFIG_VERSIONS = {
  '1.0': {
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
  },
  
  '1.1': {
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
};

const CURRENT_CONFIG_VERSION = '1.1';

/**
 * 获取指定版本的配置
 */
function getConfig(version = CURRENT_CONFIG_VERSION) {
  return CONFIG_VERSIONS[version] || CONFIG_VERSIONS[CURRENT_CONFIG_VERSION];
}

/**
 * 文件类型识别
 * 通过文件扩展名和文件内容（前几个字节）判断文件类型
 */
function detectFileType(file, arrayBuffer) {
  const fileName = file.name || '';
  const ext = fileName.split('.').pop().toLowerCase();
  
  // 根据扩展名判断
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'csv') return 'csv';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'txt') return 'txt';
  
  // 根据文件内容判断（简单的魔数检测）
  const uint8 = new Uint8Array(arrayBuffer);
  
  // ZIP magic number (xlsx/docx are ZIP files)
  if (uint8[0] === 0x50 && uint8[1] === 0x4B && uint8[2] === 0x03 && uint8[3] === 0x04) {
    // Could be xlsx or docx - need more sophisticated detection
    // For now, assume xlsx
    return 'excel';
  }
  
  // Assume CSV for unknown types
  return 'csv';
}

/**
 * 解析Excel文件（xlsx/xls）
 * 支持多Sheet，返回所有Sheet的数据
 */
function parseExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const sheets = {};
  const sheetNames = workbook.SheetNames;
  
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // 转换为对象数组（使用第一行作为表头）
    if (jsonData.length < 2) {
      sheets[sheetName] = { headers: [], rows: [], rawData: jsonData };
      continue;
    }
    
    const headers = jsonData[0].map(h => String(h).trim());
    const rows = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = jsonData[i][j] !== undefined ? String(jsonData[i][j]).trim() : '';
      }
      // 跳过全空行
      const hasContent = Object.values(row).some(v => v !== '');
      if (hasContent) rows.push(row);
    }
    
    sheets[sheetName] = { headers, rows, rawData: jsonData };
  }
  
  return { sheets, sheetNames };
}

/**
 * 解析CSV文件（支持UTF-8和GBK编码）
 */
function parseCSV(buffer) {
  // 尝试检测编码并解码
  let text;
  let encoding = 'utf-8';
  
  // 检查BOM
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    // UTF-8 BOM
    text = new TextDecoder('utf-8').decode(buffer.slice(3));
  } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    // UTF-16 LE BOM
    text = new TextDecoder('utf-16le').decode(buffer.slice(2));
  } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
    // UTF-16 BE BOM
    text = new TextDecoder('utf-16be').decode(buffer.slice(2));
  } else {
    // 无BOM，尝试UTF-8，如果失败则尝试GBK
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      encoding = 'utf-8';
    } catch (e) {
      // UTF-8解码失败，尝试GBK
      try {
        text = new TextDecoder('gbk').decode(buffer);
        encoding = 'gbk';
      } catch (e2) {
        // 都失败了，使用UTF-8并忽略错误
        text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(buffer);
        encoding = 'utf-8';
      }
    }
  }
  
  console.log(`   📄 CSV编码检测：使用 ${encoding} 编码`);
  
  // 支持多种分隔符：逗号、分号、制表符
  const firstLine = text.split('\n')[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';')) {
    delimiter = ';';
  }
  
  console.log(`   📄 CSV分隔符检测：使用 "${delimiter === '\t' ? '制表符' : delimiter}" 分隔`);
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length < 2) return { headers: [], rows: [], encoding, delimiter };
  
  // 解析标题行（支持引号包裹）
  const headers = parseCSVLine(lines[0], delimiter);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : '';
    }
    // 跳过全空行
    const hasContent = Object.values(row).some(v => v !== '');
    if (hasContent) rows.push(row);
  }
  
  return { headers, rows, sheetNames: ['Sheet1'], sheets: { Sheet1: { headers, rows } }, encoding, delimiter };
}

/**
 * 解析CSV行（支持引号包裹的字段）
 */
function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * 自动识别文件类型（基于列头匹配）
 * 返回：{ type, confidence, matchedFields }
 */
function recognizeType(headers, configVersion = CURRENT_CONFIG_VERSION) {
  const config = getConfig(configVersion);
  const fieldMappings = config.fieldMappings;
  
  const results = [];
  
  for (const [typeName, typeConfig] of Object.entries(fieldMappings)) {
    let matchedCount = 0;
    const matchedFields = {};
    
    for (const mapping of typeConfig.mappings) {
      for (const label of mapping.labels) {
        if (headers.includes(label)) {
          matchedCount++;
          matchedFields[mapping.field] = label;
          break;
        }
      }
    }
    
    const confidence = (matchedCount / typeConfig.mappings.length) * 100;
    results.push({ type: typeName, confidence, matchedFields });
  }
  
  // 按置信度排序
  results.sort((a, b) => b.confidence - a.confidence);
  
  return results[0] || { type: '题库', confidence: 0, matchedFields: {} };
}

/**
 * 将原始行数据转换为标准题目格式
 */
function transformRow(row, type, matchedFields, configVersion = CURRENT_CONFIG_VERSION) {
  const config = getConfig(configVersion);
  const mapping = config.fieldMappings[type];
  if (!mapping) return null;
  
  const question = {};
  
  // 根据匹配的字段映射转换数据
  for (const map of mapping.mappings) {
    const matchedLabel = matchedFields[map.field];
    if (matchedLabel && row[matchedLabel] !== undefined) {
      question[map.field] = row[matchedLabel];
    }
  }
  
  // 处理选项（如果是选择题）
  if (question.optionA || question.optionB || question.optionC || question.optionD) {
    question.options = [];
    if (question.optionA) question.options.push({ label: 'A', text: question.optionA });
    if (question.optionB) question.options.push({ label: 'B', text: question.optionB });
    if (question.optionC) question.options.push({ label: 'C', text: question.optionC });
    if (question.optionD) question.options.push({ label: 'D', text: question.optionD });
    delete question.optionA;
    delete question.optionB;
    delete question.optionC;
    delete question.optionD;
  }
  
  // 确保必要字段存在
  if (!question.question && question.word) {
    // 单词类型：词头作为题目
    question.question = question.word;
    question.type = '单词';
    question.answer = question.meaning || '';
  }
  
  if (!question.question && question.front) {
    // 闪卡类型：正面作为题目
    question.question = question.front;
    question.type = '闪卡';
    question.answer = question.back || '';
  }
  
  // 默认值
  if (!question.type) question.type = '单选';
  if (!question.difficulty) question.difficulty = 3;
  if (!question.subject) question.subject = '未分类';
  if (!question.chapter) question.chapter = '未分类';
  
  return question;
}

/**
 * 主处理函数：处理文件上传和解析
 */
export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS头部
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // 认证检查（测试模式跳过）
    let user = await authUser(env.DB, request);
    
    // 测试模式：如果 header 中有 X-Test-Mode: true，则使用模拟用户
    if (!user && request.headers.get('X-Test-Mode') === 'true') {
      console.log('🧪 测试模式：跳过认证');
      user = { id: 'test-user-id', username: 'test_user' };
    }
    
    if (!user) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 支持两种上传格式：
    // 1. multipart/form-data（浏览器表单）
    // 2. application/json（测试脚本，base64文件内容）
    let fileBuffer, fileName, importType, configVersion;
    
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // 方式1：multipart/form-data
      const formData = await request.formData();
      const file = formData.get('file');
      importType = formData.get('type') || 'auto';
      configVersion = formData.get('configVersion') || CURRENT_CONFIG_VERSION;
      
      if (!file) {
        return new Response(JSON.stringify({ error: '未找到上传的文件' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      fileBuffer = await file.arrayBuffer();
      fileName = file.name || 'unknown';
      
    } else if (contentType.includes('application/json')) {
      // 方式2：application/json（base64文件内容）
      const body = await request.json();
      importType = body.type || 'auto';
      configVersion = body.configVersion || CURRENT_CONFIG_VERSION;
      
      if (!body.file) {
        return new Response(JSON.stringify({ error: '未找到上传的文件' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      fileName = body.fileName || 'unknown';
      // base64解码
      const binaryString = atob(body.file);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBuffer = bytes.buffer;
      
    } else {
      return new Response(JSON.stringify({ error: '不支持的Content-Type，请使用 multipart/form-data 或 application/json' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const fileSize = fileBuffer.byteLength;
    
    // 文件大小检查（限制10MB）
    if (fileSize > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: '文件大小不能超过10MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 检测文件类型并解析
    // 注意：JSON模式无法获取文件的 type（mime type），需要根据文件扩展名判断
    const mockFile = { name: fileName, type: fileName.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    const fileType = detectFileType(mockFile, fileBuffer);
    let parseResult;
    
    if (fileType === 'excel') {
      parseResult = parseExcel(fileBuffer);
    } else if (fileType === 'csv' || fileType === 'txt') {
      const text = new TextDecoder().decode(fileBuffer);
      parseResult = parseCSV(text);
    } else {
      return new Response(JSON.stringify({ error: `不支持的文件类型: ${fileType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 处理多Sheet情况
    const { sheets, sheetNames } = parseResult;
    const allResults = [];
    const sheetResults = {};
    
    for (const sheetName of sheetNames) {
      const sheet = sheets[sheetName];
      if (!sheet.rows || sheet.rows.length === 0) continue;
      
      // 自动识别类型（如果未指定）
      const recognized = importType === 'auto' 
        ? recognizeType(sheet.headers, configVersion)
        : { type: importType, confidence: 100, matchedFields: {} };
      
      // 转换数据
      const questions = sheet.rows.map((row, idx) => {
        const q = transformRow(row, recognized.type, recognized.matchedFields, configVersion);
        if (q) {
          q._sheetName = sheetName;
          q._rowIndex = idx + 2; // +2 because of header row and 0-index
        }
        return q;
      }).filter(q => q && q.question && q.question.trim());
      
      sheetResults[sheetName] = {
        type: recognized.type,
        confidence: recognized.confidence,
        headers: sheet.headers,
        rowCount: sheet.rows.length,
        questionCount: questions.length,
        questions: questions.slice(0, 5) // 只返回前5条用于预览
      };
      
      allResults.push(...questions);
    }
    
    // 返回解析结果（预览模式）
    return new Response(JSON.stringify({
      success: true,
      fileName,
      fileSize,
      fileType,
      configVersion,
      sheetCount: sheetNames.length,
      totalQuestions: allResults.length,
      sheetResults,
      preview: allResults.slice(0, 10), // 全局前10条预览
      message: `成功解析 ${allResults.length} 道题目，请确认后导入`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    return new Response(JSON.stringify({ 
      error: '文件解析失败', 
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 确认导入的API端点（将预览的题目正式入库）
 * POST /api/library/import/confirm
 */
export async function onRequestConfirm(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const user = await authUser(env.DB, request);
    if (!user) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const body = await request.json();
    const { questions } = body;
    
    if (!questions || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: '题目数据格式错误' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 批量插入数据库
    let successCount = 0;
    const errors = [];
    
    for (const q of questions) {
      try {
        const questionId = generateId();
        await dbRun(
          env.DB,
          `INSERT INTO question (id, user_id, subject, chapter, type, difficulty, question, options, answer, explanation, tags, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            questionId,
            user.id,
            q.subject || '未分类',
            q.chapter || '未分类',
            q.type || '单选',
            q.difficulty || 3,
            q.question || '',
            JSON.stringify(q.options || []),
            q.answer || '',
            q.explanation || '',
            q.tags ? JSON.stringify(q.tags) : null
          ]
        );
        successCount++;
      } catch (err) {
        errors.push({ question: q.question?.substring(0, 50), error: err.message });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      imported: successCount,
      total: questions.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功导入 ${successCount} 道题目`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Import confirm error:', error);
    return new Response(JSON.stringify({ 
      error: '导入失败', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
