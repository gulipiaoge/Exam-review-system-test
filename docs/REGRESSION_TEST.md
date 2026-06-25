# 样本基线回归测试文档

## 📋 概述

基线回归测试用于确保解析器的修改不会意外破坏已有的解析功能。每次修改解析器代码后，应运行回归测试验证所有样本文件的解析结果无变化。

## 📂 目录结构

```
client-side/
├── __tests__/
│   ├── samples/              # 样本文件目录
│   │   ├── 题库样本.xlsx
│   │   ├── 试卷样本.xlsx
│   │   ├── 单词样本.xlsx
│   │   └── 闪卡样本.xlsx
│   └── baseline.json         # 基线快照文件
├── scripts/
│   └── regression-test.js   # 回归测试脚本
└── package.json
```

## 🚀 使用方法

### 1. 添加样本文件

将测试用的 Excel/CSV 文件放入 `__tests__/samples/` 目录，支持格式：
- `.xlsx` / `.xls` - Excel 文件
- `.csv` - CSV 文件
- `.docx` / `.doc` - Word 文件
- `.txt` - 文本文件

**建议的样本文件**：
- 题库样本（包含题干、选项、答案等字段）
- 试卷样本（包含大题号、小题号、分值等字段）
- 单词样本（包含词头、词性、释义等字段）
- 闪卡样本（包含正面、反面等字段）
- 多Sheet样本（包含多个Sheet，每个Sheet不同类型）
- 冲突样本（同时匹配多种类型，用于测试类型识别）

### 2. 创建基线快照（首次运行）

```bash
cd client-side
npm run test:regression:update
```

此命令会：
- 遍历 `__tests__/samples/` 下所有样本文件
- 调用 API 解析每个文件
- 将解析结果（题目数量、Sheet 数量等）保存到 `__tests__/baseline.json`

### 3. 运行回归测试

修改解析器代码后，运行：

```bash
cd client-side
npm run test:regression
```

此命令会：
- 重新解析所有样本文件
- 将结果与基线快照对比
- 如果有差异，报错并退出（exit code 1）
- 如果无差异，显示 "✅ 回归测试通过"

### 4. 在本地开发环境测试

如果你在本地运行 `wrangler dev`，可以使用：

```bash
npm run test:regression:local
```

这会调用 `http://localhost:8787` 而不是生产环境。

### 5. 指定配置版本

```bash
node scripts/regression-test.js --config-version=1.0
```

默认使用 `1.1` 版本配置。

### 6. 更新基线

当解析器配置变更（如新增字段映射、修改类型识别规则）时，需要更新基线：

```bash
npm run test:regression:update
```

**注意**：更新基线前，请确保解析结果符合预期！

## 📊 基线文件格式

`__tests__/baseline.json` 示例：

```json
{
  "version": "1.1",
  "createdAt": "2026-06-25T10:30:00.000Z",
  "results": {
    "题库样本.xlsx": {
      "success": true,
      "totalQuestions": 100,
      "sheetCount": 1,
      "sheetResults": [
        {
          "name": "Sheet1",
          "type": "题库",
          "questionCount": 100
        }
      ]
    },
    "多Sheet样本.xlsx": {
      "success": true,
      "totalQuestions": 150,
      "sheetCount": 3,
      "sheetResults": [
        {
          "name": "题库",
          "type": "题库",
          "questionCount": 50
        },
        {
          "name": "试卷",
          "type": "试卷",
          "questionCount": 50
        },
        {
          "name": "单词",
          "type": "单词",
          "questionCount": 50
        }
      ]
    }
  }
}
```

## 🔧 CI/CD 集成

### GitHub Actions 示例

创建 `.github/workflows/regression-test.yml`：

```yaml
name: Regression Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  regression-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: client-side/package-lock.json
    
    - name: Install dependencies
      run: cd client-side && npm ci
    
    - name: Deploy to Cloudflare Pages (preview)
      run: cd client-side && npx wrangler pages deploy dist --project-name=exam-review-system --branch=preview
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    
    - name: Run regression test
      run: cd client-side && npm run test:regression -- --api-url=https://preview.exam-review-system.pages.dev
```

## 🚨 故障排查

### 问题 1：样本文件未找到

**错误信息**：
```
⚠️  未找到样本文件，请先添加样本到 __tests__/samples/ 目录
```

**解决方法**：
- 确保样本文件已放入 `__tests__/samples/` 目录
- 确保文件格式支持（.xlsx, .xls, .csv, .docx, .txt）

### 问题 2：API 请求失败

**错误信息**：
```
❌ 请求失败：connect ECONNREFUSED 127.0.0.1:8787
```

**解决方法**：
- 如果测试本地环境，先运行 `npm run dev` 或 `wrangler dev`
- 如果测试生产环境，确保 `--api-url` 参数正确

### 问题 3：解析结果不匹配

**错误信息**：
```
❌ 回归测试失败：检测结果与基线不一致！
```

**解决方法**：
1. 检查解析器代码是否有意外修改
2. 如果修改是预期的，运行 `npm run test:regression:update` 更新基线
3. 提交新的 `baseline.json` 到版本控制

## 📝 最佳实践

1. **始终提交 baseline.json**：将基线文件纳入版本控制，方便团队协作
2. **样本文件要全面**：覆盖所有支持的类型和边界情况
3. **定期更新基线**：当解析器功能变更时，及时更新基线
4. **CI 中运行测试**：确保每次提交都不会破坏已有功能
5. **测试环境隔离**：使用单独的 API 端点进行回归测试，避免污染生产数据

## 📞 联系与支持

如有问题，请联系开发团队或提交 Issue。
