<template>
  <div class="ai-chat-page">
    <!-- AI配置对话框 -->
    <el-dialog v-model="configVisible" title="AI配置" width="400px">
      <el-form label-width="80px">
        <el-form-item label="服务商">
          <el-select v-model="ai.config.provider">
            <el-option label="硅基流动(SiliconFlow)" value="siliconflow" />
            <el-option label="DeepSeek" value="deepseek" />
            <el-option label="智谱AI" value="zhipu" />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="ai.config.apiKey" type="password" show-password placeholder="输入API Key" />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="ai.config.model" placeholder="如 deepseek-ai/DeepSeek-V3" />
        </el-form-item>
        <el-form-item label="接口地址">
          <el-input v-model="ai.config.baseUrl" placeholder="如 https://api.siliconflow.cn/v1" />
        </el-form-item>
      </el-form>
      <button class="btn btn-primary btn-sm" @click="saveConfig">保存配置</button>
      <p style="margin-top:10px;color:#94a3b8;font-size:12px">推荐免费：硅基流动 cloud.siliconflow.cn 模型 deepseek-ai/DeepSeek-V3</p>
    </el-dialog>

    <!-- 主布局 -->
    <div class="chat-layout">
      <!-- 左侧：会话列表 -->
      <aside class="chat-sidebar" :class="{ 'mobile-show': showMobileSidebar }">
        <button class="new-chat-btn" @click="handleNewChat">＋ 新对话</button>
        <div class="conv-list">
          <!-- 今天 -->
          <template v-if="conversationsByDate.today.length">
            <div class="date-label">今天</div>
            <div v-for="conv in conversationsByDate.today" :key="conv.id"
                 :class="['conv-item', { active: currentConversationId === conv.id }]"
                 @click="switchConversation(conv.id)">
              <span class="ci-dot"></span>
              <span class="ci-text">{{ conv.title }}</span>
              <button class="ci-del" @click.stop="handleDeleteConversation(conv.id)">×</button>
            </div>
          </template>
          <!-- 昨天 -->
          <template v-if="conversationsByDate.yesterday.length">
            <div class="date-label">昨天</div>
            <div v-for="conv in conversationsByDate.yesterday" :key="conv.id"
                 :class="['conv-item', { active: currentConversationId === conv.id }]"
                 @click="switchConversation(conv.id)">
              <span class="ci-dot"></span>
              <span class="ci-text">{{ conv.title }}</span>
              <button class="ci-del" @click.stop="handleDeleteConversation(conv.id)">×</button>
            </div>
          </template>
          <!-- 最近7天 -->
          <template v-if="conversationsByDate.recent.length">
            <div class="date-label">最近7天</div>
            <div v-for="conv in conversationsByDate.recent" :key="conv.id"
                 :class="['conv-item', { active: currentConversationId === conv.id }]"
                 @click="switchConversation(conv.id)">
              <span class="ci-dot"></span>
              <span class="ci-text">{{ conv.title }}</span>
              <button class="ci-del" @click.stop="handleDeleteConversation(conv.id)">×</button>
            </div>
          </template>
          <div v-if="!conversationsByDate.today.length && !conversationsByDate.yesterday.length && !conversationsByDate.recent.length" class="empty-conv">
            暂无对话记录
          </div>
        </div>
      </aside>

      <!-- 右侧：聊天区 -->
      <main class="chat-main">
        <!-- 顶部工具栏 -->
        <div class="chat-toolbar">
          <button class="sidebar-toggle" @click="showMobileSidebar = !showMobileSidebar">☰</button>
          <div class="mode-switch">
            <button :class="['ms-btn', { active: chatMode === 'quick' }]" @click="chatMode='quick'">⚡ 快速模式</button>
            <button :class="['ms-btn', { active: chatMode === 'expert' }]" @click="chatMode='expert'">👨‍🏫 专家模式</button>
          </div>
          <button class="tb-settings" @click="configVisible=true">⚙</button>
        </div>

        <!-- 消息区域 -->
        <div class="messages-area" ref="messagesRef">
          <!-- 无消息时显示欢迎 -->
          <div v-if="currentMessages.length === 0 && !sending" class="welcome-area">
            <div class="wa-avatar">🤖</div>
            <p class="wa-greeting">你好！我是你的 AI 学习助手，我可以帮你解答题目、生成复习计划、解析错题、推荐学习路径。请告诉我你想学习什么？ 💡</p>
          </div>

          <!-- 消息列表 -->
          <template v-else>
            <div v-for="(msg, idx) in currentMessages" :key="idx" :class="['msg-row', msg.role==='user' ? 'msg-user' : 'msg-ai']">
              <!-- AI消息：头像+卡片 -->
              <template v-if="msg.role !== 'user'">
                <div class="msg-avatar">🤖</div>
                <div class="msg-bubble ai-bubble">
                  <div class="ab-sender">智能备考助手</div>
                  <div class="ab-body" v-html="formatMsg(msg.content)"></div>
                  <!-- 快捷操作按钮 -->
                  <div class="ab-actions">
                    <button class="qa-pill qa-primary">解题第一步</button>
                    <button class="qa-pill">深入推导</button>
                    <button class="qa-pill">相关例题</button>
                  </div>
                </div>
              </template>
              <!-- 用户消息 -->
              <template v-else>
                <div class="msg-bubble user-bubble">{{ msg.content }}</div>
              </template>
            </div>
            <!-- AI正在回复 -->
            <div v-if="sending" class="msg-row msg-ai">
              <div class="msg-avatar">🤖</div>
              <div class="msg-bubble ai-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </template>
        </div>

        <!-- 输入区 -->
        <div class="input-area">
          <div class="input-box">
            <textarea v-model="inputMessage" placeholder="输入你的问题（支持 \lim 公式）"
                      @keyup.enter.exact.prevent="sendMessage"
                      :disabled="sending" rows="1"></textarea>
            <button class="send-btn" @click="sendMessage" :disabled="!inputMessage.trim() || sending">发送</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useAiStore } from '../store/ai'
import { ElMessage, ElMessageBox } from 'element-plus'
import { renderMath } from '../utils/katex'

const ai = useAiStore()
const configVisible = ref(false)
const showMobileSidebar = ref(false)
const inputMessage = ref('')
const sending = ref(false)
const messagesRef = ref(null)
const chatMode = ref('quick')

const conversationsByDate = computed(() => ai.conversationsByDate)
const currentMessages = computed(() => ai.currentMessages)
const currentConversationId = computed(() => ai.currentConversationId)

function handleNewChat() { ai.createConversation() }
function switchConversation(id) {
  ai.switchConversation(id)
  nextTick(() => { if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight })
}
async function handleDeleteConversation(id) {
  try { await ElMessageBox.confirm('确定删除该对话？', '提示'); ai.deleteConversation(id) } catch { /* 用户取消 */ }
}
function saveConfig() { ai.saveConfig(ai.config); ElMessage.success('配置已保存'); configVisible.value = false }

function formatMsg(text) {
  if (!text) return ''
  let result = String(text)
  const blocks = []
  let idx = 0
  const save = (h) => { const k = '\x00B' + (idx++) + '\x00'; blocks.push(h); return k }
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    save(`<pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;margin:8px 0"><code>${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
  )
  result = result.replace(/`([^`]+)`/g, (_, c) =>
    save(`<code style="background:#f0f0f0;color:#e74c3c;padding:1px 5px;border-radius:3px;font-size:0.9em">${c}</code>`)
  )
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, t) => save('<strong>' + t + '</strong>'))
  result = result.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
  for (let i = 0; i < blocks.length; i++) result = result.replace('\x00B' + i + '\x00', blocks[i])
  return renderMath(result)
}

async function sendMessage() {
  if (!inputMessage.value.trim()) return
  if (!ai.config.apiKey) { configVisible.value = true; return ElMessage.warning('请先配置API Key') }
  sending.value = true
  const msg = inputMessage.value; inputMessage.value = ''
  if (!currentConversationId.value) ai.createConversation()
  await ai.chat(msg, chatMode.value)
  sending.value = false
  await nextTick()
  if (messagesRef.value) setTimeout(() => { messagesRef.value.scrollTop = messagesRef.value.scrollHeight }, 50)
}

watch(currentMessages, () => {
  nextTick(() => { if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight })
}, { deep: true })

onMounted(() => {
  if (!ai.config.apiKey) configVisible.value = true
  if (!currentConversationId.value && conversationsByDate.value.today.length > 0) switchConversation(conversationsByDate.value.today[0].id)
})
</script>

<style scoped>
.ai-chat-page { height: calc(100vh - var(--topbar-height) - 32px); display: flex; flex-direction: column; }
.chat-layout { display: flex; flex: 1; overflow: hidden; border-radius: 14px; border: 1px solid var(--gray-200); background: #fff; }

/* ===== 左侧边栏 ===== */
.chat-sidebar { width: 240px; min-width: 200px; background: #fafafa; border-right: 1px solid var(--gray-200); display: flex; flex-direction: column; overflow: hidden; }
.new-chat-btn {
  margin: 16px; padding: 10px 18px; border: none; border-radius: 10px;
  background: #059669; color: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; text-align: center; transition: all 0.2s;
}
.new-chat-btn:hover { background: #047857; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(5,150,105,0.3); }
.conv-list { flex: 1; overflow-y: auto; padding: 0 8px 16px; }
.date-label { padding: 16px 12px 6px; font-size: 12px; font-weight: 600; color: var(--gray-400); }
.conv-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  transition: all 0.15s; margin-bottom: 2px;
}
.conv-item:hover { background: #f0f0f0; }
.conv-item.active { background: #ecfdf5; }
.ci-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
.ci-text { flex: 1; font-size: 13px; color: var(--gray-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-del { opacity: 0; font-size: 16px; color: var(--gray-400); background: none; border: none; cursor: pointer; padding: 0 4px; line-height: 1; transition: opacity 0.15s; }
.conv-item:hover .ci-del { opacity: 1; }
.empty-conv { text-align: center; padding: 40px 20px; color: var(--gray-400); font-size: 13px; }

/* ===== 右侧聊天区 ===== */
.chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; position: relative; }

/* 顶栏 */
.chat-toolbar { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-bottom: 1px solid var(--gray-100); }
.sidebar-toggle { display: none; background: none; border: none; font-size: 18px; cursor: pointer; color: var(--gray-600); padding: 4px; }
.mode-switch { display: flex; gap: 4px; margin-left: auto; }
.ms-btn {
  padding: 5px 14px; border: 1px solid var(--gray-200); border-radius: 16px;
  background: transparent; font-size: 12px; cursor: pointer; transition: all 0.15s; color: var(--gray-600);
}
.ms-btn.active { background: #ecfdf5; color: #059669; border-color: #a7f3d0; font-weight: 600; }
.tb-settings { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--gray-400); padding: 4px; }

/* 消息区 */
.messages-area { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }

/* 欢迎 */
.welcome-area { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; max-width: 75%; }
.wa-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.wa-greeting { font-size: 14px; color: var(--gray-700); line-height: 1.7; background: #f8fafc; padding: 16px 20px; border-radius: 0 16px 16px 16px; border: 1px solid var(--gray-100); }

/* 消息行 */
.msg-row { display: flex; gap: 10px; max-width: 85%; animation: fadeInUp 0.25s ease; }
.msg-user { align-self: flex-end; flex-direction: row-reverse; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* 头像 */
.msg-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}

/* 气泡 */
.msg-bubble { padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.7; word-break: break-word; }
.user-bubble { background: #059669; color: #fff; border-radius: 16px 16px 4px 16px; max-width: 100%; }
.ai-bubble { background: #f8fafc; border: 1px solid var(--gray-100); border-radius: 4px 16px 16px 16px; width: 100%; }
.ab-sender { font-size: 12px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; }
.ab-body { color: var(--gray-700); }
.ab-body :deep(pre) { margin: 8px 0; }
.ab-body :deep(code) { font-size: 13px; }

/* 快捷操作按钮 */
.ab-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.qa-pill {
  padding: 5px 14px; border: 1px solid var(--gray-200); border-radius: 16px;
  background: #fff; font-size: 12px; cursor: pointer; transition: all 0.15s; color: var(--gray-600);
}
.qa-pill:hover { border-color: #10b981; color: #059669; }
.qa-qprimary, .qa-primary { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }

/* 打字动画 */
.typing { display: flex; gap: 4px; padding: 16px !important; }
.typing span { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; animation: bounce 1.4s infinite both; }
.typing span:nth-child(1) { animation-delay: -0.32s; }
.typing span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

/* 输入区 */
.input-area { padding: 14px 20px; border-top: 1px solid var(--gray-100); }
.input-box { display: flex; align-items: flex-end; gap: 10px; background: #f8fafc; border: 1px solid var(--gray-200); border-radius: 12px; padding: 8px 12px; transition: border-color 0.2s; }
.input-box:focus-within { border-color: #10b981; box-shadow: 0 0 0 3px #ecfdf5; }
.input-box textarea {
  flex: 1; border: none; outline: none; resize: none; background: transparent;
  font-size: 14px; font-family: var(--font-sans); line-height: 1.5; color: var(--gray-800); max-height: 100px; min-height: 22px;
}
.input-box textarea::placeholder { color: var(--gray-400); }
.send-btn {
  padding: 7px 18px; border: none; border-radius: 8px;
  background: #059669; color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
}
.send-btn:hover:not(:disabled) { background: #047857; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 响应式 */
@media (max-width: 768px) {
  .chat-sidebar { display: none; }
  .chat-sidebar.mobile-show { display: flex; position: fixed; left: 0; top: var(--topbar-height); width: 280px; height: calc(100vh - var(--topbar-height)); z-index: 200; background: #fafafa; box-shadow: 4px 0 20px rgba(0,0,0,0.1); }
  .sidebar-toggle { display: block; }
  .messages-area { padding: 16px; }
  .chat-toolbar { padding: 10px 14px; }
  .input-area { padding: 10px 14px; }
}
</style>
