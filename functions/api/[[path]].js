// Pages Functions - 主API路由处理器
// 文件路径: functions/api/[[path]].js
// 最后更新: 2026-07-03 修复admin登录硬编码逻辑

import { signJWT } from '../_lib/jwt.js';
import { dbQueryOne, dbQueryAll, dbRun, generateId, authUser, userFilter } from '../_lib/db.js';

/**
 * XSS 过滤函数 - 移除危险的 HTML 标签和属性
 * @param {string} input - 用户输入
 * @returns {string} - 过滤后的安全字符串
 */
function sanitizeXSS(input) {
  if (typeof input !== 'string') return input;
  
  // 移除 <script> 标签及其内容
  let cleaned = input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  
  // 移除其他危险的 HTML 标签
  cleaned = cleaned.replace(/<(iframe|object|embed|applet|meta|link|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<\/(iframe|object|embed|applet|meta|link|style)>/gi, '');
  cleaned = cleaned.replace(/<(iframe|object|embed|applet|meta|link|style)[\s\S]*?>/gi, '');
  
  // 移除 on* 事件处理器
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*["'][\s\S]*?["']/gi, '');
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*[^\s>]+/gi, '');
  
  // 移除 javascript: 协议
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  // 转义 < > & " ' 防止 HTML 注入
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return cleaned;
}

/**
 * 批量过滤对象中的字符串字段
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeXSS(sanitized[key]);
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  return sanitized;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '') || '/';
  
  // CORS头部
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    let response;
    
    // 路由分发
    if (path === '/auth/register' && request.method === 'POST') {
      response = await handleRegister(request, env);
    } else if (path === '/auth/login' && request.method === 'POST') {
      response = await handleLogin(request, env);
    } else if (path === '/auth/me' && request.method === 'GET') {
      response = await handleGetMe(request, env);
    } else if (path === '/questions' && request.method === 'GET') {
      response = await handleGetQuestions(request, env);
    } else if (path.startsWith('/questions/') && request.method === 'GET') {
      // 单条题目详情查询
      const id = path.split('/')[2];
      if (id && !id.includes('?')) {
        response = await handleGetQuestionById(request, env, id);
      } else {
        response = await handleGetQuestions(request, env);
      }
    } else if (path === '/questions' && request.method === 'POST') {
      response = await handleCreateQuestion(request, env);
    } else if (path.startsWith('/questions/') && request.method === 'PUT') {
      const id = path.split('/')[2];
      response = await handleUpdateQuestion(request, env, id);
    } else if (path.startsWith('/questions/') && request.method === 'DELETE') {
      const id = path.split('/')[2];
      response = await handleDeleteQuestion(request, env, id);
    } else if (path === '/questions/upload' && request.method === 'POST') {
      response = await handleUploadQuestions(request, env);
    } else if (path === '/questions/sync-to-admin' && request.method === 'POST') {
      response = await handleSyncToAdmin(request, env);
    } else if (path === '/exam/submit' && request.method === 'POST') {
      response = await handleSubmitExam(request, env);
    } else if (path === '/exam/records' && request.method === 'GET') {
      response = await handleGetExamRecords(request, env);
    } else if (path === '/admin/users' && request.method === 'GET') {
      response = await handleAdminGetUsers(request, env);
    } else if (path === '/admin/exam-records' && request.method === 'GET') {
      response = await handleAdminGetExamRecords(request, env);
    } else if (path === '/admin/practice-records' && request.method === 'GET') {
      response = await handleAdminGetPracticeRecords(request, env);
    } else if (path === '/admin/dashboard' && request.method === 'GET') {
      response = await handleAdminDashboard(request, env);
    } else if (path.startsWith('/admin/user/') && request.method === 'DELETE') {
      const userId = path.split('/').pop();
      response = await handleAdminDeleteUser(request, env, userId);
    } else if (path === '/wrong-questions' && request.method === 'GET') {
      response = await handleGetWrongQuestions(request, env);
    } else if (path === '/wrong-questions' && request.method === 'POST') {
      response = await handleAddWrongQuestion(request, env);
    } else if (path === '/wrong-questions/answer-result' && request.method === 'POST') {
      response = await handleWrongAnswerResult(request, env);
    } else if (path === '/wrong-questions/clear-all' && request.method === 'POST') {
      response = await handleClearAllWrongQuestions(request, env);
    } else if (path.startsWith('/wrong-questions/') && request.method === 'DELETE') {
      const id = path.split('/')[2];
      response = await handleDeleteWrongQuestion(request, env, id);
    } else if (path === '/stats' && request.method === 'GET') {
      response = await handleGetStats(request, env);
    } else if (path === '/practice/submit' && request.method === 'POST') {
      response = await handleSubmitPractice(request, env);
    } else if (path === '/practice/records' && request.method === 'GET') {
      response = await handleGetPracticeRecords(request, env);
    } else if (path === '/ai/conversations' && request.method === 'GET') {
      response = await handleGetAiConversations(request, env);
    } else if (path === '/ai/conversations' && request.method === 'POST') {
      response = await handleSyncAiConversations(request, env);
    } else if (path.startsWith('/ai/conversations/') && request.method === 'DELETE') {
      const convId = path.split('/').pop();
      response = await handleDeleteAiConversation(request, env, convId);
    } else if (path === '/resource/libraries' && request.method === 'GET') {
      response = await handleGetLibraries(request, env);
    } else if (path === '/resource/libraries' && request.method === 'POST') {
      response = await handleCreateLibrary(request, env);
    } else if (path.startsWith('/resource/libraries/') && request.method === 'DELETE') {
      const libId = path.split('/').pop();
      response = await handleDeleteLibrary(request, env, libId);
    } else if (path === '/resource/items' && request.method === 'GET') {
      response = await handleGetItems(request, env);
    } else if (path === '/resource/items' && request.method === 'POST') {
      response = await handleCreateItem(request, env);
    } else if (path.startsWith('/resource/items/') && request.method === 'DELETE') {
      const itemId = path.split('/').pop();
      response = await handleDeleteItem(request, env, itemId);
    } else if (path === '/resource/papers' && request.method === 'POST') {
      response = await handleCreatePaper(request, env);
    } else if (path === '/resource/papers/generate' && request.method === 'POST') {
      response = await handleGeneratePaper(request, env);
    } else if (path === '/ai/study-guide' && request.method === 'POST') {
      response = await handleGenerateStudyGuide(request, env);
    } else if (path === '/ai/parse-exam-request' && request.method === 'POST') {
      response = await handleParseExamRequest(request, env);
    } else {
      response = new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 添加CORS头部
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 注册
async function handleRegister(request, env) {
  const body = await request.json();
  const { username, password, name } = body;
  
  if (!username || !password) {
    return new Response(JSON.stringify({ error: '用户名和密码必填' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 检查用户是否存在
  const existing = await dbQueryOne(env.DB, 'SELECT * FROM user WHERE username = ?', [username]);
  if (existing) {
    return new Response(JSON.stringify({ error: '该账号ID已被注册，请换一个试试' }), { 
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 创建用户
  const userId = generateId();
  await dbRun(
    env.DB,
    'INSERT INTO user (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
    [userId, username, password, name || username, 'student']
  );
  
  const user = await dbQueryOne(env.DB, 'SELECT * FROM user WHERE id = ?', [userId]);
  
  return new Response(JSON.stringify({ user }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 登录
async function handleLogin(request, env) {
  const body = await request.json();
  const { username, password } = body;

  // 优先检查硬编码管理员账号 ksbg（无论数据库是否可用）
  if (username === 'ksbg' && password === 'ksbg') {
    console.log('[API] Login: Hardcoded admin login success');
    const user = { id: 'ksbg', username: 'ksbg', name: '管理员', role: 'admin' };
    const token = await signJWT({ userId: user.id, username: user.username });
    return new Response(JSON.stringify({ code: 200, user, token }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 非admin账号，尝试从数据库查询
  if (env.DB) {
    try {
      const user = await dbQueryOne(env.DB, 'SELECT * FROM user WHERE username = ? AND password = ?', [username, password]);
      if (user) {
        const token = await signJWT({ userId: user.id, username: user.username });
        return new Response(JSON.stringify({ code: 200, user, token }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (e) {
      console.warn('[API] Login: Database query failed', e);
    }
  }

  return new Response(JSON.stringify({ code: 401, error: '用户名或密码错误' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 获取当前用户
async function handleGetMe(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ user }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 获取题目列表（支持分页和搜索）
async function handleGetQuestions(request, env) {
  const user = await authUser(env.DB, request);
  const url = new URL(request.url);
  const subject = url.searchParams.get('subject');
  const chapter = url.searchParams.get('chapter');
  const type = url.searchParams.get('type');
  const keyword = url.searchParams.get('keyword');  // 添加关键词搜索
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('page_size') || url.searchParams.get('pageSize') || '20');
  
  // 构建基础SQL
  let sql = `SELECT q.*, u.username as imported_by_username, u.name as imported_by_name 
             FROM question q 
             LEFT JOIN user u ON q.user_id = u.id
             WHERE 1=1`;
  const params = [];
  
  // 用户过滤
  if (user) {
    const filter = userFilter(user);
    sql += filter.clause;
    params.push(...filter.params);
  }
  
  // 科目过滤
  if (subject) {
    sql += ' AND q.subject = ?';
    params.push(subject);
  }
  
  // 章节过滤
  if (chapter) {
    sql += ' AND q.chapter = ?';
    params.push(chapter);
  }
  
  // 题型过滤
  if (type) {
    sql += ' AND q.type = ?';
    params.push(type);
  }
  
  // 关键词搜索（搜索题干、解析、答案）
  if (keyword && keyword.trim()) {
    sql += ' AND (q.question LIKE ? OR q.answer LIKE ? OR q.explanation LIKE ?)';
    const keywordPattern = '%' + keyword.trim() + '%';
    params.push(keywordPattern, keywordPattern, keywordPattern);
  }
  
  // 计算总数（使用单独的COUNT查询）
  let countSql = `SELECT COUNT(*) as total FROM question q WHERE 1=1`;
  const countParams = [];
  
  // 用户过滤
  if (user) {
    const filter = userFilter(user);
    countSql += filter.clause.replace('q.user_id', 'q.user_id').replace('user_id', 'q.user_id');
    countParams.push(...filter.params);
  }
  
  // 科目过滤
  if (subject) {
    countSql += ' AND q.subject = ?';
    countParams.push(subject);
  }
  
  // 章节过滤
  if (chapter) {
    countSql += ' AND q.chapter = ?';
    countParams.push(chapter);
  }
  
  // 题型过滤
  if (type) {
    countSql += ' AND q.type = ?';
    countParams.push(type);
  }
  
  // 关键词搜索
  if (keyword && keyword.trim()) {
    countSql += ' AND (q.question LIKE ? OR q.answer LIKE ? OR q.explanation LIKE ?)';
    const keywordPattern = '%' + keyword.trim() + '%';
    countParams.push(keywordPattern, keywordPattern, keywordPattern);
  }
  
  const countResult = await dbQueryOne(env.DB, countSql, countParams);
  const total = countResult?.total || 0;
  
  // 分页
  const offset = (page - 1) * pageSize;
  sql += ' ORDER BY q.subject, q.chapter, q.type';
  sql += ' LIMIT ? OFFSET ?';
  const queryParams = [...params, pageSize, offset];
  
  const questions = await dbQueryAll(env.DB, sql, queryParams);
  
  return new Response(JSON.stringify({ 
    questions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 获取单条题目详情
async function handleGetQuestionById(request, env, id) {
  // 认证检查（测试模式跳过）
  let user = await authUser(env.DB, request);
  
  // 测试模式：如果 header 中有 X-Test-Mode: true，则使用模拟用户
  if (!user && request.headers.get('X-Test-Mode') === 'true') {
    console.log('🧪 测试模式：跳过认证（题目详情）');
    user = { id: 'test-user-id', username: 'test_user' };
  }
  
  try {
    const question = await dbQueryOne(env.DB, 'SELECT * FROM question WHERE id = ?', [id]);
    
    if (!question) {
      return new Response(JSON.stringify({ error: '题目不存在' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 解析 JSON 字段
    if (question.options && typeof question.options === 'string') {
      try { question.options = JSON.parse(question.options) } catch(e) { question.options = [] }
    }
    if (question.tags && typeof question.tags === 'string') {
      try { question.tags = JSON.parse(question.tags) } catch(e) { question.tags = [] }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      question: question 
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 创建题目（带参数校验和XSS过滤）
async function handleCreateQuestion(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  
  // 参数校验
  const { subject, chapter, type, difficulty, question, options, answer, explanation, tags } = body;
  
  if (!subject || !subject.trim()) {
    return new Response(JSON.stringify({ error: '科目不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (!chapter || !chapter.trim()) {
    return new Response(JSON.stringify({ error: '章节不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (!type || !type.trim()) {
    return new Response(JSON.stringify({ error: '题型不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (!question || !question.trim()) {
    return new Response(JSON.stringify({ error: '题目内容不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // XSS 过滤
  const sanitizedBody = sanitizeObject(body);
  
  const questionId = generateId();
  await dbRun(
    env.DB,
    `INSERT INTO question (id, user_id, subject, chapter, type, difficulty, question, options, answer, explanation, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [questionId, user.id, 
     sanitizedBody.subject || subject, 
     sanitizedBody.chapter || chapter, 
     sanitizedBody.type || type, 
     sanitizedBody.difficulty || difficulty || 3, 
     sanitizedBody.question || question, 
     JSON.stringify(sanitizedBody.options || options || []), 
     sanitizedBody.answer || answer || '', 
     sanitizedBody.explanation || explanation || '', 
     sanitizedBody.tags ? JSON.stringify(sanitizedBody.tags) : null]
  );
  
  const newQuestion = await dbQueryOne(env.DB, 'SELECT * FROM question WHERE id = ?', [questionId]);
  
  return new Response(JSON.stringify({ question: newQuestion }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 更新题目（带参数校验和XSS过滤）
async function handleUpdateQuestion(request, env, id) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  
  // 参数校验（只校验提供的字段）
  const { subject, chapter, type, difficulty, question, options, answer, explanation, tags } = body;
  
  if (subject !== undefined && (!subject || !subject.trim())) {
    return new Response(JSON.stringify({ error: '科目不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (chapter !== undefined && (!chapter || !chapter.trim())) {
    return new Response(JSON.stringify({ error: '章节不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (type !== undefined && (!type || !type.trim())) {
    return new Response(JSON.stringify({ error: '题型不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // XSS 过滤
  const sanitizedBody = sanitizeObject(body);
  
  // 构建动态更新 SQL
  const updates = [];
  const params = [];
  
  if (sanitizedBody.subject !== undefined) { updates.push('subject = ?'); params.push(sanitizedBody.subject); }
  if (sanitizedBody.chapter !== undefined) { updates.push('chapter = ?'); params.push(sanitizedBody.chapter); }
  if (sanitizedBody.type !== undefined) { updates.push('type = ?'); params.push(sanitizedBody.type); }
  if (sanitizedBody.difficulty !== undefined) { updates.push('difficulty = ?'); params.push(sanitizedBody.difficulty); }
  if (sanitizedBody.question !== undefined) { updates.push('question = ?'); params.push(sanitizedBody.question); }
  if (sanitizedBody.options !== undefined) { updates.push('options = ?'); params.push(JSON.stringify(sanitizedBody.options)); }
  if (sanitizedBody.answer !== undefined) { updates.push('answer = ?'); params.push(sanitizedBody.answer); }
  if (sanitizedBody.explanation !== undefined) { updates.push('explanation = ?'); params.push(sanitizedBody.explanation); }
  if (sanitizedBody.tags !== undefined) { updates.push('tags = ?'); params.push(sanitizedBody.tags ? JSON.stringify(sanitizedBody.tags) : null); }
  
  updates.push("updated_at = datetime('now')");
  
  if (updates.length > 0) {
    params.push(id, user.id, user.username);
    await dbRun(
      env.DB,
      `UPDATE question SET ${updates.join(', ')} WHERE id = ? AND (user_id = ? OR ? = 'ksbg')`,
      params
    );
  }
  
  const updatedQuestion = await dbQueryOne(env.DB, 'SELECT * FROM question WHERE id = ?', [id]);
  
  return new Response(JSON.stringify({ question: updatedQuestion }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 删除题目
async function handleDeleteQuestion(request, env, id) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  await dbRun(
    env.DB,
    'DELETE FROM question WHERE id = ? AND (user_id = ? OR ? = \'ksbg\')',
    [id, user.id, user.username]
  );
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 上传题目 (简化版，完整版需要解析Word文档)
async function handleUploadQuestions(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 这里需要解析上传的文件，暂时返回提示
  return new Response(JSON.stringify({ 
    error: '文件上传功能正在开发中，请使用API逐个添加题目' 
  }), { 
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 提交考试
async function handleSubmitExam(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const { subject, chapter, answers, startTime } = body;
  
  const recordId = generateId();
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000 / 60); // 分钟
  
  // 获取题目并计算分数
  let correctCount = 0;
  const totalCount = answers.length;
  const details = [];
  
  for (const ans of answers) {
    const question = await dbQueryOne(env.DB, 'SELECT * FROM question WHERE id = ?', [ans.questionId]);
    if (question) {
      const isCorrect = checkAnswer(question, ans.answer);
      if (isCorrect) correctCount++;
      details.push({
        questionId: ans.questionId,
        userAnswer: ans.answer,
        correctAnswer: question.answer,
        isCorrect
      });
    }
  }
  
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  
  await dbRun(
    env.DB,
    `INSERT INTO exam_record (id, user_id, subject, chapter, total_count, correct_count, score, duration, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [recordId, user.id, subject, chapter || '', totalCount, correctCount, score, duration, JSON.stringify(details)]
  );
  
  const record = await dbQueryOne(env.DB, 'SELECT * FROM exam_record WHERE id = ?', [recordId]);
  
  return new Response(JSON.stringify({ record }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 检查答案是否正确
function checkAnswer(question, userAnswer) {
  if (!question.answer || !userAnswer) return false;
  
  const correctAnswer = question.answer.trim().toLowerCase();
  const userAns = String(userAnswer).trim().toLowerCase();
  
  // 单选/判断：直接比较
  if (question.type === '单选' || question.type === '判断') {
    return correctAnswer === userAns;
  }
  
  // 多选：排序后比较
  if (question.type === '多选') {
    const correctSorted = correctAnswer.split('').sort().join('');
    const userSorted = userAns.split('').sort().join('');
    return correctSorted === userSorted;
  }
  
  // 其他题型：包含即认为正确
  return correctAnswer.includes(userAns) || userAns.includes(correctAnswer);
}

// 获取考试记录
async function handleGetExamRecords(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const records = await dbQueryAll(env.DB, 'SELECT * FROM exam_record WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  
  return new Response(JSON.stringify({ records }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 获取错题（按三级结构：科目→章节→题目）
async function handleGetWrongQuestions(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // JOIN question 表获取完整的题目信息
  const wrongQuestions = await dbQueryAll(env.DB, 
    `SELECT wq.*, q.subject, q.chapter, q.type, q.question, q.options, q.answer, q.explanation, q.difficulty
     FROM wrong_question wq 
     LEFT JOIN question q ON wq.question_id = q.id 
     WHERE wq.user_id = ? 
     ORDER BY q.subject ASC, q.chapter ASC, wq.count DESC, wq.created_at DESC`, 
    [user.id]
  );
  
  return new Response(JSON.stringify({ wrongQuestions }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 添加错题（upsert：已存在则增加错误次数，重置正确计数）（带XSS过滤）
async function handleAddWrongQuestion(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  
  // XSS 过滤
  const sanitizedBody = sanitizeObject(body);
  
  const { questionId, userAnswer } = sanitizedBody;
  
  if (!questionId) {
    return new Response(JSON.stringify({ error: '题目ID不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取题目信息（科目、章节）
  const question = await dbQueryOne(env.DB, 'SELECT subject, chapter FROM question WHERE id = ?', [questionId]);
  const subject = question?.subject || '';
  const chapter = question?.chapter || '';
  
  // 检查是否已存在该错题
  const existing = await dbQueryOne(env.DB, 'SELECT * FROM wrong_question WHERE user_id = ? AND question_id = ?', [user.id, questionId]);
  
  if (existing) {
    // 已存在：增加错误次数，重置正确计数，更新答案
    await dbRun(env.DB, 
      `UPDATE wrong_question SET count = count + 1, correct_count = 0, user_answer = ?, 
       subject = ?, chapter = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      [userAnswer || '', subject, chapter, existing.id]
    );
  } else {
    // 新建：插入错题记录
    const wrongId = generateId();
    await dbRun(
      env.DB,
      `INSERT INTO wrong_question (id, user_id, question_id, user_answer, subject, chapter, count, correct_count, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))`,
      [wrongId, user.id, questionId, userAnswer || '', subject, chapter]
    );
  }
  
  const updated = await dbQueryOne(env.DB, 'SELECT * FROM wrong_question WHERE user_id = ? AND question_id = ?', [user.id, questionId]);
  
  return new Response(JSON.stringify({ success: true, wrongQuestion: updated }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 记录错题答题结果（练习模式中答对/答错后调用）
// 答对：correct_count+1；答对3次自动删除
// 答错：count+1，correct_count重置为0
async function handleWrongAnswerResult(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const { questionId, isCorrect } = body;
  
  if (!questionId) {
    return new Response(JSON.stringify({ error: '题目ID不能为空' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const existing = await dbQueryOne(env.DB, 'SELECT * FROM wrong_question WHERE user_id = ? AND question_id = ?', [user.id, questionId]);
  
  if (!existing) {
    // 不在错题本中，如果是正确答案，不需要处理
    // 如果是错误答案，自动添加到错题本
    if (!isCorrect) {
      const question = await dbQueryOne(env.DB, 'SELECT subject, chapter FROM question WHERE id = ?', [questionId]);
      const wrongId = generateId();
      await dbRun(
        env.DB,
        `INSERT INTO wrong_question (id, user_id, question_id, subject, chapter, count, correct_count, created_at) 
         VALUES (?, ?, ?, ?, ?, 1, 0, datetime('now'))`,
        [wrongId, user.id, questionId, question?.subject || '', question?.chapter || '']
      );
      return new Response(JSON.stringify({ success: true, action: 'added', removed: false }), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: true, action: 'none' }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (isCorrect) {
    // 答对：增加正确计数
    const newCorrectCount = (existing.correct_count || 0) + 1;
    
    if (newCorrectCount >= 3) {
      // 答对3次，自动删除
      await dbRun(env.DB, 'DELETE FROM wrong_question WHERE id = ?', [existing.id]);
      return new Response(JSON.stringify({ success: true, action: 'removed', correctCount: newCorrectCount, removed: true }), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await dbRun(env.DB, 
      'UPDATE wrong_question SET correct_count = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [newCorrectCount, existing.id]
    );
    return new Response(JSON.stringify({ success: true, action: 'correct', correctCount: newCorrectCount, removed: false }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    // 答错：增加错误次数，重置正确计数
    await dbRun(env.DB, 
      'UPDATE wrong_question SET count = count + 1, correct_count = 0, updated_at = datetime(\'now\') WHERE id = ?',
      [existing.id]
    );
    return new Response(JSON.stringify({ success: true, action: 'wrong', correctCount: 0, removed: false }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 删除单个错题
async function handleDeleteWrongQuestion(request, env, questionId) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  await dbRun(env.DB, 'DELETE FROM wrong_question WHERE user_id = ? AND question_id = ?', [user.id, questionId]);
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 清空当前用户所有错题
async function handleClearAllWrongQuestions(request, env) {
  const user = await authUser(env.DB, request);

  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await dbRun(env.DB, 'DELETE FROM wrong_question WHERE user_id = ?', [user.id]);

  return new Response(JSON.stringify({ success: true, cleared: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// 获取统计
async function handleGetStats(request, env) {
  const user = await authUser(env.DB, request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取用户题目统计
  const filter = userFilter(user);
  const questionCount = await dbQueryOne(
    env.DB,
    `SELECT COUNT(*) as count FROM question WHERE 1=1 ${filter.clause}`,
    filter.params
  );
  
  const examCount = await dbQueryOne(
    env.DB,
    'SELECT COUNT(*) as count FROM exam_record WHERE user_id = ?',
    [user.id]
  );
  
  const wrongCount = await dbQueryOne(
    env.DB,
    'SELECT COUNT(*) as count FROM wrong_question WHERE user_id = ?',
    [user.id]
  );
  
  return new Response(JSON.stringify({
    questionCount: questionCount?.count || 0,
    examCount: examCount?.count || 0,
    wrongCount: wrongCount?.count || 0
  }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// ==================== 在线练习记录 ====================

// 提交练习记录
async function handleSubmitPractice(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const { subject, chapter, totalCount, correctCount, wrongCount, correctRate, questionIds, details } = body;
  
  const id = generateId();
  await dbRun(
    env.DB,
    `INSERT INTO practice_record (id, user_id, subject, chapter, total_count, correct_count, wrong_count, correct_rate, question_ids, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, user.id, subject || '', chapter || '', totalCount || 0, correctCount || 0, wrongCount || 0, 
     correctRate || 0, JSON.stringify(questionIds || []), JSON.stringify(details || [])]
  );
  
  const record = await dbQueryOne(env.DB, 'SELECT * FROM practice_record WHERE id = ?', [id]);
  return new Response(JSON.stringify({ record }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 获取练习记录
async function handleGetPracticeRecords(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const records = await dbQueryAll(env.DB, 
    'SELECT * FROM practice_record WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', 
    [user.id]
  );
  
  return new Response(JSON.stringify({ records }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// ==================== AI 对话记录 ====================

// 获取AI对话列表（含消息）
async function handleGetAiConversations(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const conversations = await dbQueryAll(env.DB, 
    'SELECT * FROM ai_conversation WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30', 
    [user.id]
  );
  
  // 为每个对话加载消息
  for (const conv of conversations) {
    const messages = await dbQueryAll(env.DB, 
      'SELECT id, role, content, created_at FROM ai_message WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 100',
      [conv.id]
    );
    conv.messages = messages.map(m => ({
      role: m.role,
      content: m.content,
      time: m.created_at
    }));
  }
  
  return new Response(JSON.stringify({ conversations }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 同步AI对话（创建或更新）
async function handleSyncAiConversations(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  const { conversations: clientConvs } = body;
  
  if (!Array.isArray(clientConvs)) {
    return new Response(JSON.stringify({ error: '数据格式错误' }), { 
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 先获取服务端的对话ID列表，用于清理已删除的对话
  const serverConvs = await dbQueryAll(env.DB, 
    'SELECT id FROM ai_conversation WHERE user_id = ?', [user.id]
  );
  const serverIds = new Set(serverConvs.map(c => c.id));
  
  for (const conv of clientConvs) {
    serverIds.delete(conv.id);  // 客户端有的，不删除
    
    const existing = await dbQueryOne(env.DB, 'SELECT id FROM ai_conversation WHERE id = ? AND user_id = ?', [conv.id, user.id]);
    
    if (existing) {
      // 更新
      await dbRun(env.DB, 
        'UPDATE ai_conversation SET title = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?',
        [conv.title || '新对话', conv.id, user.id]
      );
      // 删除旧消息，插入新消息（全量替换，简化实现）
      await dbRun(env.DB, 'DELETE FROM ai_message WHERE conversation_id = ?', [conv.id]);
    } else {
      // 创建
      await dbRun(env.DB,
        'INSERT INTO ai_conversation (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
        [conv.id, user.id, conv.title || '新对话']
      );
    }
    
    // 插入消息（最多保留最近50条）
    const messages = (conv.messages || []).slice(-50);
    for (const msg of messages) {
      const msgId = generateId();
      await dbRun(env.DB,
        'INSERT INTO ai_message (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [msgId, conv.id, msg.role, msg.content, msg.time || new Date().toISOString()]
      );
    }
  }
  
  // 删除服务端有但客户端没有的对话
  for (const delId of serverIds) {
    await dbRun(env.DB, 'DELETE FROM ai_message WHERE conversation_id = ?', [delId]);
    await dbRun(env.DB, 'DELETE FROM ai_conversation WHERE id = ? AND user_id = ?', [delId, user.id]);
  }
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 删除AI对话
async function handleDeleteAiConversation(request, env, convId) {
  const user = await authUser(env.DB, request);
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  await dbRun(env.DB, 'DELETE FROM ai_message WHERE conversation_id = ?', [convId]);
  await dbRun(env.DB, 'DELETE FROM ai_conversation WHERE id = ? AND user_id = ?', [convId, user.id]);
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// ==================== 管理员接口 ====================

// 同步用户题库到管理员（复制题目到管理员账号下）
async function handleSyncToAdmin(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), { 
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取用户的所有题目
  const questions = await dbQueryAll(env.DB, 'SELECT * FROM question WHERE user_id = ?', [user.id]);
  
  if (!questions || questions.length === 0) {
    return new Response(JSON.stringify({ message: '没有需要同步的题目', count: 0 }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 复制题目到管理员账号下（避免重复：先检查是否已同步）
  let syncCount = 0;
  for (const q of questions) {
    // 检查是否已存在（按题目内容去重）
    const existing = await dbQueryOne(env.DB, 
      'SELECT id FROM question WHERE user_id = ? AND question = ? LIMIT 1',
      ['ksbg_default', q.question]
    );
    if (!existing) {
      const newId = generateId();
      await dbRun(
        env.DB,
        `INSERT INTO question (id, user_id, subject, chapter, type, difficulty, question, options, answer, explanation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [newId, 'ksbg_default', q.subject, q.chapter, q.type, q.difficulty, 
         q.question, q.options, q.answer, q.explanation]
      );
      syncCount++;
    }
  }
  
  return new Response(JSON.stringify({ 
    message: `成功同步 ${syncCount} 道题目到管理员题库`, 
    count: syncCount 
  }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 管理员：获取所有用户列表
async function handleAdminGetUsers(request, env) {
  const user = await authUser(env.DB, request);
  if (!user || user.username !== 'ksbg') {
    return new Response(JSON.stringify({ error: '无权限' }), { 
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const users = await dbQueryAll(env.DB, 
    `SELECT id, username, name, role, 
       (SELECT COUNT(*) FROM exam_record WHERE user_id = user.id) as exam_count,
       (SELECT MAX(created_at) FROM exam_record WHERE user_id = user.id) as last_exam,
       (SELECT COUNT(*) FROM practice_record WHERE user_id = user.id) as practice_count
     FROM user ORDER BY created_at DESC`
  );
  
  return new Response(JSON.stringify({ users }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 管理员：获取所有用户的考试记录
async function handleAdminGetExamRecords(request, env) {
  const user = await authUser(env.DB, request);
  if (!user || user.username !== 'ksbg') {
    return new Response(JSON.stringify({ error: '无权限' }), { 
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const url = new URL(request.url);
  const targetUserId = url.searchParams.get('user_id');
  
  let sql = `SELECT er.*, u.username, u.name 
             FROM exam_record er 
             LEFT JOIN user u ON er.user_id = u.id`;
  const params = [];
  
  if (targetUserId) {
    sql += ' WHERE er.user_id = ?';
    params.push(targetUserId);
  }
  
  sql += ' ORDER BY er.created_at DESC';
  
  const records = await dbQueryAll(env.DB, sql, params);
  
  return new Response(JSON.stringify({ records }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 管理员：获取所有用户的练习记录
async function handleAdminGetPracticeRecords(request, env) {
  const user = await authUser(env.DB, request);
  if (!user || user.username !== 'ksbg') {
    return new Response(JSON.stringify({ error: '无权限' }), { 
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const url = new URL(request.url);
  const targetUserId = url.searchParams.get('user_id');
  
  let sql = `SELECT pr.*, u.username, u.name 
             FROM practice_record pr 
             LEFT JOIN user u ON pr.user_id = u.id`;
  const params = [];
  
  if (targetUserId) {
    sql += ' WHERE pr.user_id = ?';
    params.push(targetUserId);
  }
  
  sql += ' ORDER BY pr.created_at DESC';
  
  const records = await dbQueryAll(env.DB, sql, params);
  
  return new Response(JSON.stringify({ records }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 管理员：删除用户所有数据（考试记录、错题、导入的题目，保留初始题库）
async function handleAdminDeleteUser(request, env, userId) {
  const user = await authUser(env.DB, request);
  if (!user || user.username !== 'ksbg') {
    return new Response(JSON.stringify({ error: '无权限' }), { 
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  // 不允许删除管理员自己
  if (userId === user.id) {
    return new Response(JSON.stringify({ error: '不能删除管理员账号' }), { 
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // 获取目标用户信息
  const targetUser = await dbQueryOne(env.DB, 'SELECT * FROM user WHERE id = ?', [userId]);
  if (!targetUser) {
    return new Response(JSON.stringify({ error: '用户不存在' }), { 
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  // 统计将要删除的数据
  const examRecords = await dbQueryOne(env.DB, 'SELECT COUNT(*) as count FROM exam_record WHERE user_id = ?', [userId]);
  const wrongQuestions = await dbQueryOne(env.DB, 'SELECT COUNT(*) as count FROM wrong_question WHERE user_id = ?', [userId]);
  // 只删除用户自己导入的题目（user_id匹配，且不是管理员的初始题库）
  const importedQuestions = await dbQueryOne(env.DB, "SELECT COUNT(*) as count FROM question WHERE user_id = ? AND user_id != 'ksbg_default'", [userId]);

  // 执行删除（按顺序：错题 → 考试记录 → 用户导入的题目 → 用户账号）
  await dbRun(env.DB, 'DELETE FROM wrong_question WHERE user_id = ?', [userId]);
  await dbRun(env.DB, 'DELETE FROM exam_record WHERE user_id = ?', [userId]);
  await dbRun(env.DB, "DELETE FROM question WHERE user_id = ? AND user_id != 'ksbg_default'", [userId]);
  await dbRun(env.DB, 'DELETE FROM user WHERE id = ?', [userId]);

  return new Response(JSON.stringify({ 
    success: true,
    message: `已删除用户 ${targetUser.username || targetUser.name} 的所有数据`,
    deleted: {
      examRecords: examRecords?.count || 0,
      wrongQuestions: wrongQuestions?.count || 0,
      importedQuestions: importedQuestions?.count || 0
    }
  }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// 管理员 Dashboard 统计
async function handleAdminDashboard(request, env) {
  const user = await authUser(env.DB, request);
  if (!user || user.username !== 'ksbg') {
    return new Response(JSON.stringify({ error: '无权限' }), { 
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  const userCount = await dbQueryOne(env.DB, 'SELECT COUNT(*) as count FROM user');
  const questionCount = await dbQueryOne(env.DB, 'SELECT COUNT(*) as count FROM question');
  const practiceCount = await dbQueryOne(env.DB, 'SELECT COUNT(*) as count FROM practice_record');
  const examCount = await dbQueryOne(env.DB, 'SELECT COUNT(*) as count FROM exam_record');

  return new Response(JSON.stringify({
    totalUsers: userCount?.count || 0,
    totalQuestions: questionCount?.count || 0,
    totalPractices: practiceCount?.count || 0,
    totalExams: examCount?.count || 0
  }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// ===== 资源库 CRUD =====

// 获取库列表
async function handleGetLibraries(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || '';
  const publicOnly = url.searchParams.get('public') === '1';
  
  let sql, params;
  if (publicOnly) {
    sql = 'SELECT * FROM resource_library WHERE is_public = 1 ORDER BY updated_at DESC';
    params = [];
  } else if (type) {
    sql = 'SELECT * FROM resource_library WHERE (user_id = ? OR is_public = 1) AND type = ? ORDER BY updated_at DESC';
    params = [user.id, type];
  } else {
    sql = 'SELECT * FROM resource_library WHERE user_id = ? OR is_public = 1 ORDER BY updated_at DESC';
    params = [user.id];
  }
  const libraries = await dbQueryAll(env.DB, sql, params);
  return new Response(JSON.stringify({ libraries }), { headers: { 'Content-Type': 'application/json' } });
}

// 创建库（带XSS过滤）
async function handleCreateLibrary(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json();
  
  // XSS 过滤
  const sanitizedBody = sanitizeObject(body);
  
  const { name, type, description, is_public } = sanitizedBody;
  if (!name || !type) return new Response(JSON.stringify({ error: '名称和类型不能为空' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const id = generateId();
  await dbRun(env.DB, 'INSERT INTO resource_library (id, user_id, name, type, description, is_public) VALUES (?, ?, ?, ?, ?, ?)',
    [id, user.id, name, type, description || '', is_public ? 1 : 0]);
  const lib = await dbQueryOne(env.DB, 'SELECT * FROM resource_library WHERE id = ?', [id]);
  return new Response(JSON.stringify({ library: lib }), { headers: { 'Content-Type': 'application/json' } });
}

// 删除库
async function handleDeleteLibrary(request, env, libId) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const lib = await dbQueryOne(env.DB, 'SELECT * FROM resource_library WHERE id = ?', [libId]);
  if (!lib) return new Response(JSON.stringify({ error: '库不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (lib.user_id !== user.id && user.username !== 'ksbg') {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  await dbRun(env.DB, 'DELETE FROM resource_item WHERE library_id = ?', [libId]);
  await dbRun(env.DB, 'DELETE FROM resource_library WHERE id = ?', [libId]);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

// 获取条目列表
async function handleGetItems(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const url = new URL(request.url);
  const libraryId = url.searchParams.get('library_id') || '';
  if (!libraryId) return new Response(JSON.stringify({ error: '缺少library_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const items = await dbQueryAll(env.DB,
    `SELECT ri.*, rl.name as library_name, rl.type as library_type FROM resource_item ri
     JOIN resource_library rl ON ri.library_id = rl.id
     WHERE ri.library_id = ? AND (rl.user_id = ? OR rl.is_public = 1 OR ? = 'ksbg')
     ORDER BY ri.created_at DESC`,
    [libraryId, user.id, user.username]);
  return new Response(JSON.stringify({ items }), { headers: { 'Content-Type': 'application/json' } });
}

// 创建条目（带XSS过滤）
async function handleCreateItem(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json();
  
  // XSS 过滤
  const sanitizedBody = sanitizeObject(body);
  
  const { library_id, title, content_type, content, summary, tags } = sanitizedBody;
  if (!library_id || !title || !content_type || !content) {
    return new Response(JSON.stringify({ error: '缺少必要字段' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const id = generateId();
  await dbRun(env.DB,
    'INSERT INTO resource_item (id, library_id, user_id, title, content_type, content, summary, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, library_id, user.id, title, content_type, content, summary || '', JSON.stringify(tags || [])]);
  const item = await dbQueryOne(env.DB, 'SELECT * FROM resource_item WHERE id = ?', [id]);
  return new Response(JSON.stringify({ item }), { headers: { 'Content-Type': 'application/json' } });
}

// 删除条目
async function handleDeleteItem(request, env, itemId) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const item = await dbQueryOne(env.DB, 'SELECT * FROM resource_item WHERE id = ?', [itemId]);
  if (!item) return new Response(JSON.stringify({ error: '条目不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (item.user_id !== user.id && user.username !== 'ksbg') {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  await dbRun(env.DB, 'DELETE FROM exam_paper_question WHERE paper_item_id = ?', [itemId]);
  await dbRun(env.DB, 'DELETE FROM resource_item WHERE id = ?', [itemId]);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

// 创建试卷（带题目关联）
async function handleCreatePaper(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json();
  const { library_id, title, question_ids, scores, summary } = body;
  if (!library_id || !title || !question_ids) {
    return new Response(JSON.stringify({ error: '缺少必要字段' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const itemId = generateId();
  await dbRun(env.DB,
    'INSERT INTO resource_item (id, library_id, user_id, title, content_type, content, summary) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [itemId, library_id, user.id, title, 'question_refs', JSON.stringify({ count: question_ids.length }), summary || '']);
  for (let i = 0; i < question_ids.length; i++) {
    await dbRun(env.DB, 'INSERT INTO exam_paper_question (id, paper_item_id, question_id, sort_order, score) VALUES (?, ?, ?, ?, ?)',
      [generateId(), itemId, question_ids[i], i, (scores && scores[i]) || 1]);
  }
  const item = await dbQueryOne(env.DB, 'SELECT * FROM resource_item WHERE id = ?', [itemId]);
  return new Response(JSON.stringify({ item, questionIds: question_ids }), { headers: { 'Content-Type': 'application/json' } });
}

// AI 生成试卷
async function handleGeneratePaper(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json();
  const { subject, chapter, type_counts, difficulty, prefer_wrong, exclude_recent_correct } = body;
  let pool = await dbQueryAll(env.DB, 'SELECT * FROM question WHERE subject = ?', [subject || '']);
  if (pool.length === 0) {
    return new Response(JSON.stringify({ error: '题库中没有符合条件的题目' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // 难度过滤
  let diffFilter = null;
  if (difficulty === 'easy') diffFilter = [1, 2];
  else if (difficulty === 'medium') diffFilter = [2, 3, 4];
  else if (difficulty === 'hard') diffFilter = [4, 5];

  if (diffFilter) pool = pool.filter(q => diffFilter.includes(q.difficulty));

  const byType = {};
  pool.forEach(q => { if (!byType[q.type]) byType[q.type] = []; byType[q.type].push(q); });
  const selected = [];
  for (const [type, count] of Object.entries(type_counts || {})) {
    const available = byType[type] || [];
    let shuffled;
    if (difficulty === 'default') {
      // 先易后难：按难度升序排列，同难度内随机
      const sorted = [...available].sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
      // 同难度的分组再各自打乱
      const byDiff = {};
      sorted.forEach(q => { const d = q.difficulty || 3; if (!byDiff[d]) byDiff[d] = []; byDiff[d].push(q); });
      Object.values(byDiff).forEach(arr => { arr.sort(() => Math.random() - 0.5); });
      shuffled = Object.values(byDiff).flat();
    } else {
      shuffled = [...available].sort(() => Math.random() - 0.5);
    }
    selected.push(...shuffled.slice(0, count));
  }
  return new Response(JSON.stringify({ questions: selected, totalCount: selected.length, params: { subject, chapter, type_counts, difficulty } }),
    { headers: { 'Content-Type': 'application/json' } });
}

// AI 生成复习指导
async function handleGenerateStudyGuide(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({
    template: true, guide: {
      overview: '# 知识体系概览\n\n请等待 AI 生成...',
      corePoints: '## 核心考点分级\n\n### 必会\n\n### 重点\n\n### 了解',
      mistakes: '## 常见易错点',
      schedule: '## 分阶段复习建议',
      checklist: '## 考前速记清单'
    }
  }), { headers: { 'Content-Type': 'application/json' } });
}

// AI 解析组卷请求
async function handleParseExamRequest(request, env) {
  const user = await authUser(env.DB, request);
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ parsed: true, type_counts: { '单选': 10, '多选': 5 }, difficulty: 'medium' }),
    { headers: { 'Content-Type': 'application/json' } });
}
