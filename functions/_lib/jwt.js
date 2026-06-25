// JWT工具库 - 使用Web Crypto API (Cloudflare Workers环境)
// 不使用Node.js crypto模块

export async function signJWT(payload, secret = 'exam-secret-2024') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSign(data, secret);
  return `${data}.${signature}`;
}

export async function verifyJWT(token, secret = 'exam-secret-2024') {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    
    // 验证签名
    const expectedSignature = await hmacSign(data, secret);
    if (signature !== expectedSignature) return null;
    
    // 解码payload
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    
    // 检查过期
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    
    return payload;
  } catch (error) {
    return null;
  }
}

function base64urlEncode(data) {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }
  // 使用Cloudflare Workers的btoa
  let binary = '';
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function hmacSign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  return base64urlEncode(signature);
}
