<script setup lang="ts">
import { ref } from 'vue'
import Login from './pages/Login.vue'
import SignUp from './pages/SignUp.vue'
import Chat from './pages/Chat.vue'
import Settings from './pages/Settings.vue'
import RecipeGenerator from './pages/RecipeGenerator.vue'

type Page = 'login' | 'signup' | 'chat' | 'settings' | 'recipes'

const currentPage = ref<Page>('login')
const isAuthenticated = ref(false)
const user = ref<{ id: number; name: string; email: string } | null>(null)

const goToSignUp = () => currentPage.value = 'signup'
const goToLogin = () => currentPage.value = 'login'

// Reset CSS variables to dark defaults (for login/signup pages)
const resetThemeToDefaults = () => {
  const root = document.documentElement
  root.style.setProperty('--bg-primary', '#0f0f0f')
  root.style.setProperty('--bg-secondary', '#1a1a1a')
  root.style.setProperty('--bg-tertiary', '#2a2a2a')
  root.style.setProperty('--text-primary', '#ffffff')
  root.style.setProperty('--text-secondary', '#888888')
  root.style.setProperty('--border-color', '#333333')
  root.style.setProperty('--accent-color', '#ff6b6b')
}

const handleLoginSuccess = (userData: { id: number; name: string; email: string }) => {
  user.value = userData
  isAuthenticated.value = true
  currentPage.value = 'chat'
}

const handleSignUpSuccess = (userData: { id: number; name: string; email: string }) => {
  user.value = userData
  isAuthenticated.value = true
  currentPage.value = 'chat'
}

const handleLogout = () => {
  resetThemeToDefaults()
  isAuthenticated.value = false
  user.value = null
  currentPage.value = 'login'
}
</script>

<template>
  <div class="app">
    <template v-if="!isAuthenticated">
      <Login v-if="currentPage === 'login'" @signup="goToSignUp" @login="handleLoginSuccess" />
      <SignUp v-if="currentPage === 'signup'" @login="goToLogin" @signup="handleSignUpSuccess" />
    </template>

    <template v-else>
      <!-- Navigation -->
      <nav class="app-nav">
        <button 
          :class="['nav-btn', { active: currentPage === 'chat' }]"
          @click="currentPage = 'chat'"
        >
          💬 Chat
        </button>
        <button 
          :class="['nav-btn', { active: currentPage === 'recipes' }]"
          @click="currentPage = 'recipes'"
        >
          🍳 Recipe Generator
        </button>
        <button 
          :class="['nav-btn', { active: currentPage === 'settings' }]"
          @click="currentPage = 'settings'"
        >
          ⚙️ Settings
        </button>
        <button class="nav-btn logout" @click="handleLogout">
          🚪 Logout
        </button>
      </nav>

      <Chat 
        v-show="currentPage === 'chat'" 
        :user="user!" 
        @settings="currentPage = 'settings'"
        @logout="handleLogout"
      />
      <RecipeGenerator v-show="currentPage === 'recipes'" :user="user!" />
      <Settings 
        v-show="currentPage === 'settings'" 
        :user="user!" 
        :visible="currentPage === 'settings'"
        @back="currentPage = 'chat'"
        @logout="handleLogout"
      />
    </template>
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-nav {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.nav-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.nav-btn.active {
  border-color: var(--accent-color);
  background: rgba(255, 107, 107, 0.1);
  color: var(--text-primary);
}

.nav-btn.logout {
  margin-left: auto;
  border-color: #ff4444;
  color: #ff4444;
}

.nav-btn.logout:hover {
  background: rgba(255, 68, 68, 0.1);
}
</style>
