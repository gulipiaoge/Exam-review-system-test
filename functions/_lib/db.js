// D1数据库辅助函数
// Cloudflare D1 API与SQLite不同

export async function dbQueryOne(db, sql, params = []) {
  if (!db) {
    console.warn('[DB] dbQueryOne: DB is undefined, returning null');
    return null;
  }
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).first();
  return result || null;
}

export async function dbQueryAll(db, sql, params = []) {
  if (!db) {
    console.warn('[DB] dbQueryAll: DB is undefined, returning empty array');
    return [];
  }
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).all();
  return result.results || [];
}

export async function dbRun(db, sql, params = []) {
  if (!db) {
    console.warn('[DB] dbRun: DB is undefined, returning mock result');
    return { success: true, meta: { last_row_id: Date.now() } };
  }
  const stmt = db.prepare(sql);
  const result = await stmt.bind(...params).run();
  return result;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// 认证中间件
export async function authUser(db, request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const { verifyJWT } = await import('../_lib/jwt.js');
  const payload = await verifyJWT(token);
  
  if (!payload) return null;
  
  // 如果数据库不可用，返回一个mock用户
  if (!db) {
    console.warn('[DB] authUser: DB is undefined, returning mock user');
    return { id: payload.userId || 'admin', username: payload.username || 'admin', role: 'admin' };
  }
  
  // 从数据库获取用户
  const user = await dbQueryOne(db, 'SELECT * FROM user WHERE id = ?', [payload.userId]);
  return user;
}

// 用户数据过滤 (ksbg账号可以看到所有题目，普通用户可看自己的+管理员的题库)
export function userFilter(user) {
  if (!user) return { clause: '', params: [] };
  if (user.username === 'ksbg') return { clause: '', params: [] };
  // 普通用户：自己的题目 + 管理员分享的题库
  return { 
    clause: ' AND (user_id = ? OR user_id = ?)', 
    params: [user.id, 'ksbg_default'] 
  };
}
