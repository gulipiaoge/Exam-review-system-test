# Git 使用指南 - 智能备考系统

## 📍 项目位置
```
C:\Users\36157\WorkBuddy\2026-06-22-14-58-55\exam-review-system\client-side
```

---

## 1️⃣ 查看提交历史

### 查看简洁版历史
```bash
cd C:\Users\36157\WorkBuddy\2026-06-22-14-58-55\exam-review-system\client-side
git log --oneline
```

**输出示例：**
```
e8c95db 初始提交：智能备考系统 V3.2.2
a1b2c3d 修复：新建题目无响应
d4e5f6g 修复：错题本无内容
```

### 查看详细历史
```bash
git log
```

**输出示例：**
```
commit e8c95db
Author: User <user@example.com>
Date:   2026-06-25

    初始提交：智能备考系统 V3.2.2
```

### 查看最近N个提交
```bash
git log --oneline -5    # 最近5个提交
```

---

## 2️⃣ 查看修改内容

### 查看未暂存的修改（工作区 vs 暂存区）
```bash
git diff
```

**输出示例：**
```diff
diff --git a/src/store/question.js b/src/store/question.js
index 1234567..abcdefg 100644
--- a/src/store/question.js
+++ b/src/store/question.js
@@ -50,6 +50,7 @@ function createQuestion(q) {
     const newQ = {
       id: Date.now(),
       ...q,
+      createdAt: new Date().toISOString()    // 新增行
     }
     allQuestions.value.push(newQ)
```

### 查看已暂存的修改（暂存区 vs 最后一次提交）
```bash
git diff --staged
```

### 查看某个文件的修改
```bash
git diff src/store/question.js
```

### 查看两个提交之间的修改
```bash
# 查看初始提交和当前版本的差异
git diff e8c95db HEAD

# 查看最近两个提交的差异
git diff HEAD~1 HEAD
```

### 查看某个提交引入的修改
```bash
git show e8c95db
```

---

## 3️⃣ 回退到某个版本

### 查看所有提交（找到要回退的版本号）
```bash
git log --oneline
```

### 软回退（保留修改，只移动HEAD）
```bash
# 回退到上一个提交
git reset --soft HEAD~1

# 回退到指定提交
git reset --soft e8c95db
```

### 硬回退（丢弃修改，完全回到某个版本）⚠️
```bash
# 回退到上一个提交（丢弃所有修改）
git reset --hard HEAD~1

# 回退到指定提交
git reset --hard e8c95db
```

### 撤销工作区的修改（还没add的修改）
```bash
# 撤销单个文件的修改
git restore src/store/question.js

# 撤销所有文件的修改
git restore .
```

### 撤销已暂存的修改（已经add，但还没commit）
```bash
git restore --staged src/store/question.js
```

---

## 4️⃣ 日常工作流程

### 修改代码后提交
```bash
# 1. 查看修改了哪些文件
git status

# 2. 查看具体修改内容
git diff

# 3. 添加修改到暂存区
git add .                        # 添加所有修改
git add src/store/question.js    # 添加指定文件

# 4. 提交
git commit -m "修复：新建题目无响应"

# 5. 查看提交历史
git log --oneline -3
```

### 查看当前状态
```bash
git status
```

**输出示例：**
```
On branch master
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/store/question.js
	modified:   src/views/LibraryCenter.vue

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	auto-commit.bat

no changes added to commit (use "git add" and/or "git commit -a")
```

---

## 5️⃣ 实用技巧

### 查看某个文件的提交历史
```bash
git log --oneline src/store/question.js
```

### 查看某个文件在指定提交中的内容
```bash
git show e8c95db:src/store/question.js
```

### 比较某个文件在两个提交中的差异
```bash
git diff e8c95db HEAD -- src/store/question.js
```

### 撤销上一次提交（但保留修改）
```bash
git reset --soft HEAD~1
```

### 修改上一次提交的说明
```bash
git commit --amend -m "新的提交说明"
```

---

## 🎯 常见场景

### 场景1：我想看看我改了什么
```bash
git status        # 看看改了哪些文件
git diff          # 看看具体改了什么内容
```

### 场景2：我想回到昨天的版本
```bash
git log --oneline              # 找到昨天的提交号
git reset --hard <提交号>     # 回退到那个版本
```

### 场景3：我改错了，想撤销
```bash
# 如果还没add
git restore .

# 如果已经add但还没commit
git restore --staged .
git restore .

# 如果已经commit了
git reset --hard HEAD~1       # 回退到上一个提交
```

### 场景4：我想看看某个文件的历史版本
```bash
git log --oneline src/store/question.js    # 查看该文件的提交历史
git show <提交号>:src/store/question.js   # 查看该文件在某个提交中的内容
```

---

## ⚠️ 注意事项

1. **`git reset --hard` 会丢弃所有修改**，使用前请确保已经提交或备份
2. **建议经常提交**，每次修改后都提交，方便回退
3. **提交说明要清晰**，说明这次提交做了什么修改
4. **重要修改前先提交**，避免改炸了无法回退

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看Git帮助：`git help <命令>`
2. 查看当前状态：`git status`
3. 询问AI助手（我）😊
