<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import RecipeDisplay from '../components/RecipeDisplay.vue'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  recipe?: any
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const props = defineProps<{
  user: { name: string; email: string }
}>()

const emit = defineEmits<{
  settings: []
  logout: []
}>()

// Sidebar state
const sidebarCollapsed = ref(false)
const chatSessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)

// Current chat state
const messages = ref<Message[]>([])
const inputMessage = ref('')
const loading = ref(false)
const messageId = ref(0)

// Computed
const chatMessages = computed(() => messages.value)

const sortedSessions = computed(() => 
  [...chatSessions.value].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
)

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Create new chat (clears the current chat without adding to history)
const createNewChat = () => {
  currentSessionId.value = null
  messages.value = []
}

// Select a chat session
const selectChat = (sessionId: string) => {
  currentSessionId.value = sessionId
  const session = chatSessions.value.find(s => s.id === sessionId)
  if (session) {
    messages.value = [...session.messages]
  }
}

// Delete a chat session
const deleteChat = (sessionId: string, event: Event) => {
  event.stopPropagation()
  const index = chatSessions.value.findIndex(s => s.id === sessionId)
  if (index !== -1) {
    chatSessions.value.splice(index, 1)
    if (currentSessionId.value === sessionId) {
      if (chatSessions.value.length > 0) {
        selectChat(chatSessions.value[0].id)
      } else {
        currentSessionId.value = null
        messages.value = []
      }
    }
  }
}

// Update session when messages change
watch(messages, (newMessages) => {
  if (currentSessionId.value) {
    const session = chatSessions.value.find(s => s.id === currentSessionId.value)
    if (session) {
      session.messages = [...newMessages]
      session.updatedAt = new Date()
      // Update title from first user message
      const firstUserMsg = newMessages.find(m => m.type === 'user')
      if (firstUserMsg) {
        session.title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
      }
    }
  }
}, { deep: true })

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return

  // Create session if none exists (only when user sends first message)
  if (!currentSessionId.value) {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    chatSessions.value.push(newSession)
    currentSessionId.value = newSession.id
  }

  // Add user message
  const userMsg: Message = {
    id: `msg-${messageId.value++}`,
    type: 'user',
    content: inputMessage.value,
    timestamp: new Date()
  }
  messages.value.push(userMsg)
  
  const query = inputMessage.value
  inputMessage.value = ''
  loading.value = true

  try {
    // Call chat API
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        userId: props.user.email
      })
    })

    if (!response.ok) throw new Error('Chat failed')

    const data = await response.json()
    
    // Add AI response
    const aiMsg: Message = {
      id: `msg-${messageId.value++}`,
      type: 'ai',
      content: data.response,
      recipe: data.recipe,
      timestamp: new Date()
    }
    messages.value.push(aiMsg)
  } catch (err) {
    const errorMsg: Message = {
      id: `msg-${messageId.value++}`,
      type: 'ai',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date()
    }
    messages.value.push(errorMsg)
  } finally {
    loading.value = false
  }
}

// Initialize with empty state
if (chatSessions.value.length === 0) {
  // Start fresh - user can create new chat when ready
}

// Collapse sidebar on mobile initially
onMounted(() => {
  if (window.innerWidth <= 768) {
    sidebarCollapsed.value = true
  }
})
</script>

<template>
  <div class="chat-layout">
    <!-- Overlay for mobile -->
    <div class="sidebar-overlay" :class="{ active: !sidebarCollapsed }" @click="sidebarCollapsed = true"></div>
    
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <button class="sidebar-logo" @click="sidebarCollapsed = !sidebarCollapsed">
          🍳
        </button>
        <button class="new-chat-btn" @click="createNewChat" v-if="!sidebarCollapsed">
          <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span class="text">New chat</span>
        </button>
        <button class="toggle-sidebar-btn" @click="sidebarCollapsed = !sidebarCollapsed" v-if="!sidebarCollapsed">
          <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </div>

      <div class="sidebar-content">
        <div class="chat-list" v-if="!sidebarCollapsed">
          <div
            v-for="session in sortedSessions"
            :key="session.id"
            class="chat-item"
            :class="{ active: session.id === currentSessionId }"
            @click="selectChat(session.id)"
          >
            <svg class="chat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="chat-title">{{ session.title }}</span>
            <button class="delete-btn" @click="deleteChat(session.id, $event)" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              </svg>
            </button>
          </div>
          <div v-if="chatSessions.length === 0" class="no-history">
            No chat history yet
          </div>
        </div>

        <!-- Collapsed Icons -->
        <div class="sidebar-icons" v-if="sidebarCollapsed">
          <button class="icon-btn" @click="createNewChat" title="New chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <button 
            v-for="session in sortedSessions.slice(0, 5)"
            :key="session.id"
            class="icon-btn"
            :class="{ active: session.id === currentSessionId }"
            @click="selectChat(session.id)"
            :title="session.title"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="user-info" v-if="!sidebarCollapsed">
          <span class="user-avatar">👤</span>
          <span class="user-name">{{ user.name }}</span>
        </div>
        <button class="icon-btn" v-if="sidebarCollapsed" :title="user.name">
          <span class="user-avatar-small">👤</span>
        </button>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <div class="chat-main">
      <header class="chat-header">
        <div class="header-left">
          <button class="mobile-menu-btn" @click="sidebarCollapsed = !sidebarCollapsed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          <div class="logo">🍳 AI CookBook Chat</div>
        </div>
        <div class="header-right">
          <button class="btn-icon" @click="$emit('settings')" title="Settings">
            ⚙️
          </button>
          <button class="btn-icon" @click="$emit('logout')" title="Logout">
            ↪️
          </button>
        </div>
      </header>

      <div class="chat-messages">
        <!-- Empty state -->
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">🍳</div>
          <h2>AI CookBook Assistant</h2>
          <p>Ask me anything about cooking, recipes, or ingredients!</p>
          <div class="suggestions">
            <button @click="inputMessage = 'What can I make with chicken and rice?'; sendMessage()">
              🍗 What can I make with chicken and rice?
            </button>
            <button @click="inputMessage = 'How do I make pasta carbonara?'; sendMessage()">
              🍝 How do I make pasta carbonara?
            </button>
            <button @click="inputMessage = 'Give me a healthy breakfast idea'; sendMessage()">
              🥗 Give me a healthy breakfast idea
            </button>
          </div>
        </div>

        <template v-for="msg in chatMessages" :key="msg.id">
          <div class="message" :class="msg.type">
            <div class="message-avatar">
              <span v-if="msg.type === 'user'">👤</span>
              <span v-else>🤖</span>
            </div>
            <div class="message-body">
              <div class="message-content">
                <p>{{ msg.content }}</p>
                <RecipeDisplay v-if="msg.recipe" :recipe="msg.recipe" />
              </div>
              <span class="message-time">{{ msg.timestamp.toLocaleTimeString() }}</span>
            </div>
          </div>
        </template>

        <div v-if="loading" class="message ai">
          <div class="message-avatar">
            <span>🤖</span>
          </div>
          <div class="message-body">
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div class="input-wrapper">
          <input 
            v-model="inputMessage"
            type="text"
            placeholder="Ask me about recipes, cooking tips, ingredients..."
            @keyup.enter="sendMessage"
            :disabled="loading"
          />
          <button class="btn-send" @click="sendMessage" :disabled="loading">
            ➤
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

/* Sidebar Overlay */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  opacity: 0;
  transition: opacity 0.2s;
}

/* Sidebar Styles */
.sidebar {
  width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--bg-tertiary);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.sidebar-logo:hover {
  background: var(--bg-tertiary);
}

.new-chat-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.new-chat-btn:hover {
  background: var(--bg-tertiary);
}

.new-chat-btn .icon {
  flex-shrink: 0;
}

.toggle-sidebar-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toggle-sidebar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px;
}

.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  color: var(--text-primary);
}

.chat-item:hover {
  background: var(--bg-tertiary);
}

.chat-item.active {
  background: var(--bg-tertiary);
}

.chat-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.chat-title {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.delete-btn {
  opacity: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  color: var(--text-secondary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--border-color);
  color: #ff6b6b;
}

.no-history {
  color: #555;
  font-size: 12px;
  text-align: center;
  padding: 20px 10px;
}

/* Collapsed Sidebar Icons */
.sidebar-icons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
}

.icon-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.icon-btn.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--bg-tertiary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-info:hover {
  background: var(--bg-tertiary);
}

.user-avatar {
  font-size: 16px;
}

.user-avatar-small {
  font-size: 18px;
}

.user-name {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Main Chat Area */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-menu-btn {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.mobile-menu-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h2 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 24px;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0 0 32px;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.suggestions button {
  padding: 14px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.suggestions button:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message {
  display: flex;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.message.user .message-avatar {
  background: #2563eb;
}

.message.ai .message-avatar {
  background: #059669;
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-content {
  background: var(--bg-secondary);
  padding: 14px 18px;
  border-radius: 12px;
}

.message.user .message-content {
  background: #1e40af;
}

.message-content p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.message-time {
  display: block;
  font-size: 11px;
  color: #555;
  margin-top: 6px;
  padding-left: 4px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: pulse 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

/* Input Area */
.chat-input-area {
  position: sticky;
  bottom: 0;
  padding: 20px;
  background: linear-gradient(transparent, var(--bg-primary) 20%);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 8px 8px 8px 20px;
  max-width: 800px;
  margin: 0 auto;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #4a4a4a;
}

.chat-input-area input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
}

.chat-input-area input::placeholder {
  color: var(--text-secondary);
}

.btn-send {
  background: #2563eb;
  border: none;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 10px;
  transition: all 0.2s;
}

.btn-send:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-send:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar-overlay.active {
    display: block;
    opacity: 1;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(0);
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
  }

  .mobile-menu-btn {
    display: flex;
  }
}
</style>
