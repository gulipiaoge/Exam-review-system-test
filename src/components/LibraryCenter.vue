<template>
  <div class="library-center">
    <div class="header">
      <h2>题库中心</h2>
      <div class="actions">
        <input
          type="file"
          ref="fileInput"
          style="display: none"
          @change="handleFileUpload"
          accept=".pdf,.docx,.doc,.txt,.md"
        />
        <button @click="triggerFileUpload" class="btn-primary">
          上传文件
        </button>
      </div>
    </div>

    <div v-if="selectedFile" class="file-info">
      <p>已选择文件: {{ selectedFile.name }}</p>
      <button @click="startParsing" :disabled="isParsing" class="btn-primary">
        {{ isParsing ? '解析中...' : '开始解析' }}
      </button>
      <div v-if="isParsing" class="progress-bar">
        <div class="progress" :style="{ width: parseProgress + '%' }"></div>
        <span>{{ Math.round(parseProgress) }}%</span>
      </div>
    </div>

    <div v-if="parseResult" class="parse-result">
      <h3>解析结果</h3>
      <div class="result-info">
        <p>语言: {{ parseResult.language }}</p>
        <p>预处理文本长度: {{ parseResult.processedText.length }} 字符</p>
        <p v-if="parseResult.chunks">分片数: {{ parseResult.chunks.length }}</p>
      </div>
      <div class="preview">
        <h4>预处理后的文本预览:</h4>
        <pre>{{ parseResult.processedText.substring(0, 1000) }}{{ parseResult.processedText.length > 1000 ? '...' : '' }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parseFile } from '@/parser/engines/index.js'
import { preprocessText } from '@/parser/preprocessors/index.js'

const fileInput = ref(null)
const selectedFile = ref(null)
const isParsing = ref(false)
const parseProgress = ref(0)
const parseResult = ref(null)

function triggerFileUpload() {
  fileInput.value.click()
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    parseResult.value = null
  }
}

async function startParsing() {
  if (!selectedFile.value) return

  isParsing.value = true
  parseProgress.value = 0
  parseResult.value = null

  try {
    // Step 1: 调用文件解析引擎提取文本
    const result = await parseFile(selectedFile.value, (p) => {
      parseProgress.value = p * 50 // 前50%进度用于文件解析
    })

    if (!result.success) {
      throw new Error(result.error || '文件解析失败')
    }

    parseProgress.value = 50

    // Step 2: 对提取的文本进行预处理
    const preprocessed = preprocessText(result.text, {
      preserveFormulas: true,
      detectLang: true,
      enableChunking: result.text.length > 8000,
      maxCharsPerChunk: 8000
    })

    parseProgress.value = 80

    // Step 3: 如果需要分片，可以将分片传递给 AI 解析引擎
    if (preprocessed.chunks) {
      console.log(`文本已分为 ${preprocessed.chunks.length} 个分片`)
      // TODO: 将每个分片传递给 AI 解析引擎
    }

    // Step 4: 恢复公式（如果需要显示原始文本）
    let finalText = preprocessed.processedText
    if (preprocessed.mathMap) {
      // 可以选择在发送给 AI 之前恢复公式，或保持占位符
      // finalText = preprocessed.restoreFormulas(preprocessed.processedText)
    }

    parseProgress.value = 100

    parseResult.value = {
      processedText: finalText,
      language: preprocessed.language,
      chunks: preprocessed.chunks,
      mathMap: preprocessed.mathMap
    }

    console.log('预处理完成:', parseResult.value)
  } catch (error) {
    console.error('解析失败:', error)
    alert('解析失败: ' + error.message)
  } finally {
    isParsing.value = false
  }
}
</script>

<style scoped>
.library-center {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-primary {
  padding: 8px 16px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background-color: #66b1ff;
}

.btn-primary:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.file-info {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 20px;
}

.progress-bar {
  margin-top: 10px;
  height: 20px;
  background-color: #e4e7ed;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress {
  height: 100%;
  background-color: #409eff;
  transition: width 0.3s;
}

.progress-bar span {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-size: 12px;
}

.parse-result {
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.result-info {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.preview {
  max-height: 400px;
  overflow-y: auto;
  background-color: #fafafa;
  padding: 10px;
  border-radius: 4px;
}

.preview pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 12px;
  line-height: 1.6;
}
</style>
