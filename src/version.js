export const SYSTEM_VERSION = 'V3.2'
export const VERSION_NAME = '测试修复版'
export const BUILD_DATE = '2026-06-25'

// 版本历史
export const VERSION_HISTORY = [
  {
    version: 'V3.2',
    date: '2026-06-25',
    name: '测试修复版',
    fixes: [
      '修复搜索功能完全失效',
      '修复分页total始终为0',
      '添加CSV编码自动检测支持（GBK）',
      '修复创建题目返回ID为None',
      '修复题目内容显示异常',
      '修复统计页面显示异常',
      '添加回归测试机制',
      '添加配置版本化管理'
    ]
  },
  {
    version: 'V3.1',
    date: '2026-06-24',
    name: '基础功能版',
    fixes: [
      '实现基础题目管理功能',
      '实现练习功能',
      '实现统计功能',
      '实现错题本功能',
      '实现AI助手功能'
    ]
  },
  {
    version: 'V3.0',
    date: '2026-06-23',
    name: '初始版本',
    fixes: [
      '项目初始化',
      '基础架构搭建'
    ]
  }
]

// 获取版本历史
export function getVersionHistory() {
  return VERSION_HISTORY
}
