// ============================================================
// 版本号规则（2026-07-08 约定）
// - 对外发布基线为 v1（对应「v1 测试报告」所覆盖的已发布版本）。
// - 仅「重大更新」（架构或核心功能重大变更）才进位主版本号，例如 v2、v3。
// - 其余按常规语义化版本迭代：
//     · 新增功能 / 较大改动  → MINOR 进位（v1.1.0）
//     · 缺陷修复 / 安全加固  → PATCH 进位（v1.0.1）
// 每次发布只需修改下方三个常量，并在 VERSION_HISTORY 追加一条记录。
// ============================================================

export const SYSTEM_VERSION = 'v1.0.6'
export const VERSION_NAME = '对齐稳定版'
export const BUILD_DATE = '2026-07-08'

// 版本历史（新的在上）
export const VERSION_HISTORY = [
  {
    version: 'v1.0.6',
    date: '2026-07-08',
    name: '对齐稳定版',
    fixes: [
      '【重大】恢复与最稳定版本 (602c899c) 完全一致的认证与路由行为',
      'auth.js: 恢复模块级 init()（页面加载即恢复登录态，消除登录页闪烁）',
      'auth.js: 恢复 mock 登录回退（API 失败时任意账号密码≥6位仍可登录，保证可用性）',
      'router/index.js: 恢复简单守卫 !!localStorage.getItem("auth_token")（任何 token 均可通过）',
      'api.js: 恢复原始请求逻辑（无 401 防抖，与稳定版一致）',
      'App.vue: 恢复原始布局（无 initialized 中间态），isAdmin 兼容 ksbg',
      'AppFooter.vue: 恢复原始版本（始终显示系统管理链接 + 版本号）',
      '保留既有改进：Login 防重复提交、Practice 每题状态隔离、Admin 健壮管理员判定',
      '实测后端数据接口（questions/records/conversations）持有效 JWT 均返回 200，功能完全正常'
    ]
  },
  {
    version: 'v1.0.5',
    date: '2026-07-08',
    name: '认证与权限修复版',
    fixes: [
      '【致命】删除 auth.js mock 登录回退：API 失败时不再允许任意账号伪造登录（此前任何密码≥6位都能绕过认证）',
      '【致命】路由守卫增强校验：isAuthenticated() 现在验证 JWT 三段式格式，mock_token / 旧格式 token 不再通过守卫',
      '【严重】App.vue 新增 initialized 初始化状态：auth.init() 完成前不渲染布局（消除登录页+侧边栏同时闪烁的竞态条件）',
      '【中等】AppFooter "系统管理"链接增加权限控制：仅管理员用户可见',
      '彻底修复未登录状态可访问全部功能页面的系统级漏洞'
    ]
  },
  {
    version: 'v1.0.4',
    date: '2026-07-08',
    name: '数据接口容错修复版',
    fixes: [
      '【核心】api.js 401 处理策略重构：仅 /auth/* 认证接口的 401 才触发登出；数据接口（/exam/*、/ai/*、/questions 等）返回 401 时不破坏已登录会话，仅打警告日志',
      'App.vue 数据加载隔离：每个 store.loadXxx() 加 .catch(() => {}) 防止单个接口失败阻断其他数据加载',
      '解决登录后页面反复闪回登录页的问题（根因：部分数据接口返回 401 导致整个会话被误杀）'
    ]
  },
  {
    version: 'v1.0.3',
    date: '2026-07-08',
    name: 'Token校验与API防抖修复版',
    fixes: [
      '修复 Token 无效/过期时多个 API 并发请求同时触发登出（401 防抖机制）',
      '加强 getTokenExp() 对非 JWT 格式 token 的识别（旧 mock_token 等残留直接清除）',
      '修复 <meta name="apple-mobile-web-app-capable"> 弃用警告（改用 mobile-web-app-capable）',
      '补充 PWA manifest 缺失的图标文件（icon-192/512.png）',
      'API 401 跳转改用 location.replace 避免浏览器历史堆积',
      '移除 api.js 中未使用的 getAuthStore 死代码'
    ]
  },
  {
    version: 'v1.0.2',
    date: '2026-07-08',
    name: '前端稳定性修复版',
    fixes: [
      '修复未登录时清除/过期 token 导致的界面闪退（系统管理链接闪现后消失）',
      '修复登出/会话失效时受保护视图在无布局下短暂闪现的问题',
      '修复登录页回车触发两次 /auth/login 请求及由此产生的 net::ERR_ABORTED',
      '增强暗色主题切换健壮性'
    ]
  },
  {
    version: 'v1.0.1',
    date: '2026-07-08',
    name: '安全加固与CI部署版',
    fixes: [
      '移除登录后门（admin/ksbg 硬编码密码），统一走数据库校验',
      '密码改为 PBKDF2 加盐哈希存储，登录成功后自动升级历史明文密码',
      'API 响应去除明文密码字段',
      '修复中文写入乱码（统一 UTF-8 解析与响应头）',
      '修复 /api/exam/submit 的 D1_TYPE_ERROR 500 错误',
      '新增安全响应头（HSTS / CSP / X-Frame-Options 等）与 CORS 白名单',
      '关闭公开注册（需环境变量 OPEN_REGISTER=1 才开启）',
      '接入 GitHub Actions 自动部署到 Cloudflare Pages',
      '页面底部展示版本号'
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-07-08',
    name: '初始发布版本',
    fixes: [
      'v1 测试报告对应版本基线（题目管理 / 练习 / 考试 / 错题本 / AI / 统计 / 管理）'
    ]
  }
]

// 获取版本历史
export function getVersionHistory() {
  return VERSION_HISTORY
}
