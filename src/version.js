// ============================================================
// 版本号规则（2026-07-08 约定）
// - 对外发布基线为 v1（对应「v1 测试报告」所覆盖的已发布版本）。
// - 仅「重大更新」（架构或核心功能重大变更）才进位主版本号，例如 v2、v3。
// - 其余按常规语义化版本迭代：
//     · 新增功能 / 较大改动  → MINOR 进位（v1.1.0）
//     · 缺陷修复 / 安全加固  → PATCH 进位（v1.0.1）
// 每次发布只需修改下方三个常量，并在 VERSION_HISTORY 追加一条记录。
// ============================================================

export const SYSTEM_VERSION = 'v1.0.2'
export const VERSION_NAME = '前端稳定性修复版'
export const BUILD_DATE = '2026-07-08'

// 版本历史（新的在上）
export const VERSION_HISTORY = [
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
