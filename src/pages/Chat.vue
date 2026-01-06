<script setup lang="ts">
import { ref, computed } from 'vue'
import RecipeDisplay from '../components/RecipeDisplay.vue'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  recipe?: any
  timestamp: Date
}

const props = defineProps<{
  user: { name: string; email: string }
}>()

const emit = defineEmits<{
  settings: []
  logout: []
}>()

const messages = ref<Message[]>([])
const inputMessage = ref('')
const loading = ref(false)
const messageId = ref(0)

const chatMessages = computed(() => messages.value)

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return

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
    const response = await fetch('http://localhost:3000/api/chat', {
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
</script>

<template>
  <div class="chat-container">
    <header class="chat-header">
      <div class="header-left">
        <div class="logo">AI CookBook</div>
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
      <template v-for="msg in chatMessages" :key="msg.id">
        <div class="message" :class="msg.type">
          <div class="message-content">
            <p>{{ msg.content }}</p>
            <RecipeDisplay v-if="msg.recipe" :recipe="msg.recipe" />
          </div>
          <span class="message-time">{{ msg.timestamp.toLocaleTimeString() }}</span>
        </div>
      </template>

      <div v-if="loading" class="message ai">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <div class="input-wrapper">
        <input 
          v-model="inputMessage"
          type="text"
          placeholder="Enter Your Message ..."
          @keyup.enter="sendMessage"
          :disabled="loading"
        />
        <button class="btn-send" @click="sendMessage" :disabled="loading">
          ➤
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0f0f0f;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #007bff;
}

.header-right {
  display: flex;
  gap: 10px;
}

.btn-icon {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  transition: opacity 0.3s;
}

.btn-icon:hover {
  opacity: 0.7;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  align-self: flex-end;
}

.message.ai {
  align-self: flex-start;
}

.message-content {
  background: #1a1a1a;
  padding: 12px 16px;
  border-radius: 8px;
}

.message.user .message-content {
  background: #007bff;
}

.message-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.message-time {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  padding: 0 4px;
}

.message.user .message-time {
  align-self: flex-end;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
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

.chat-input-area {
  padding: 20px;
  background: #1a1a1a;
  border-top: 1px solid #333;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  background: #2a2a2a;
  border-radius: 30px;
  padding: 8px 8px 8px 16px;
}

.chat-input-area input {
  flex: 1;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 14px;
  outline: none;
}

.chat-input-area input::placeholder {
  color: #666;
}

.btn-send {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  padding: 8px 12px;
  transition: opacity 0.3s;
}

.btn-send:hover:not(:disabled) {
  opacity: 0.7;
}

.btn-send:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
