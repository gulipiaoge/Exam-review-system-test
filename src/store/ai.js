import { ref } from 'vue'
import api from '../utils/api.js'

// 响应式状态
const conversations = ref([])
const currentConversation = ref(null)
const loading = ref(false)
const apiConfig = ref({
  provider: 'openai',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  endpoint: ''
})

// 初始化
function init() {
  const saved = localStorage.getItem('ai_conversations')
  if (saved) {
    try {
      conversations.value = JSON.parse(saved)
    } catch (e) {
      console.error('加载对话失败:', e)
    }
  }
  
  const savedConfig = localStorage.getItem('ai_config')
  if (savedConfig) {
    try {
      apiConfig.value = JSON.parse(savedConfig)
    } catch (e) {
      console.error('加载配置失败:', e)
    }
  }
}

// 从云端加载对话（兼容后端API）
async function loadFromCloud() {
  try {
    const res = await api.get('/ai/conversations')
    if (res.conversations && res.conversations.length > 0) {
      conversations.value = res.conversations.map(conv => ({
        ...conv,
        messages: conv.messages || []
      }))
      save() // 保存到localStorage
    }
  } catch (e) {
    console.log('从云端加载对话失败，使用本地数据:', e.message)
    // 如果失败，继续使用localStorage中的数据（init方法已经加载）
  }
}

// 保存对话到localStorage
function save() {
  try {
    localStorage.setItem('ai_conversations', JSON.stringify(conversations.value))
  } catch (e) {
    console.error('保存对话失败:', e)
  }
}

// 创建新对话
function createConversation(title = '新对话') {
  const conv = {
    id: `conv_${Date.now()}`,
    title,
    messages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  conversations.value.unshift(conv)
  currentConversation.value = conv
  save()
  return conv
}

// 发送消息（Bug #6修复：添加chat函数）
async function chat(message, conversationId = null) {
  return await sendMessage(message, conversationId)
}

// 发送消息
async function sendMessage(message, conversationId = null) {
  const convId = conversationId || currentConversation.value?.id
  if (!convId) {
    createConversation()
    return sendMessage(message)
  }
  
  const conv = conversations.value.find(c => c.id === convId)
  if (!conv) return
  
  // 添加用户消息
  const userMsg = {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  }
  conv.messages.push(userMsg)
  conv.updated_at = new Date().toISOString()
  
  loading.value = true
  
  try {
    // 调用真实API
    const res = await callRealAPI(conv.messages)
    
    // 添加AI回复
    const aiMsg = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: res.reply || '抱歉，我无法回答这个问题。',
      timestamp: new Date().toISOString()
    }
    conv.messages.push(aiMsg)
  } catch (err) {
    console.error('发送消息失败:', err)
    // 模拟AI回复
    const aiMsg = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: getMockReply(message),
      timestamp: new Date().toISOString()
    }
    conv.messages.push(aiMsg)
  }
  
  loading.value = false
  save()
}

// 调用真实API
async function callRealAPI(messages) {
  if (!apiConfig.value.apiKey) {
    throw new Error('未配置API Key')
  }
  
  const response = await api.post('/ai/chat', {
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    model: apiConfig.value.model,
    provider: apiConfig.value.provider
  })
  
  return response
}

// 模拟AI回复
function getMockReply(message) {
  const replies = [
    '这是一个很好的问题！让我思考一下...',
    '根据我的分析，这个问题的答案是...',
    '我可以帮您解答这个问题。首先，让我们理解一下问题的核心...',
    '这个问题涉及多个知识点，我来逐一解释...'
  ]
  return replies[Math.floor(Math.random() * replies.length)]
}

// 删除对话
function deleteConversation(conversationId) {
  conversations.value = conversations.value.filter(c => c.id !== conversationId)
  if (currentConversation.value?.id === conversationId) {
    currentConversation.value = null
  }
  save()
}

// 更新配置
function updateConfig(config) {
  apiConfig.value = { ...apiConfig.value, ...config }
  try {
    localStorage.setItem('ai_config', JSON.stringify(apiConfig.value))
  } catch (e) {
    console.error('保存配置失败:', e)
  }
}

// 导出store
export function useAiStore() {
  return {
    conversations,
    currentConversation,
    loading,
    apiConfig,
    init,
    loadFromCloud,
    createConversation,
    sendMessage,
    chat, // Bug #6修复：导出chat函数
    deleteConversation,
    updateConfig
  }
}
