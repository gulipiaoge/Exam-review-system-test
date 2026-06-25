// API端点：POST /api/library/import/confirm
// 功能：确认导入，将预览的题目正式入库

import { dbQueryOne, dbQueryAll, dbRun, generateId, authUser } from '../../../_lib/db.js';

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
    const user = await authUser(env.DB, request);
    if (!user) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const body = await request.json();
    const { questions, selectedSheets } = body;
    
    if (!questions || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: '题目数据格式错误' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 批量插入数据库
    let successCount = 0;
    const errors = [];
    const importedIds = [];
    
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
        importedIds.push(questionId);
      } catch (err) {
        errors.push({ 
          question: (q.question || '').substring(0, 50), 
          error: err.message 
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      imported: successCount,
      total: questions.length,
      errors: errors.length > 0 ? errors : undefined,
      importedIds,
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
