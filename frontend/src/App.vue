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
const user = ref<{ name: string; email: string } | null>(null)

const goToSignUp = () => currentPage.value = 'signup'
const goToLogin = () => currentPage.value = 'login'

const handleLoginSuccess = (userData: { name: string; email: string }) => {
  user.value = userData
  isAuthenticated.value = true
  currentPage.value = 'chat'
}

const handleSignUpSuccess = (userData: { name: string; email: string }) => {
  user.value = userData
  isAuthenticated.value = true
  currentPage.value = 'chat'
}

const handleLogout = () => {
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
        v-if="currentPage === 'chat'" 
        :user="user!" 
        @settings="currentPage = 'settings'"
        @logout="handleLogout"
      />
      <RecipeGenerator v-if="currentPage === 'recipes'" />
      <Settings 
        v-if="currentPage === 'settings'" 
        :user="user!" 
        @back="currentPage = 'chat'"
        @logout="handleLogout"
      />
    </template>
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
  background: #0f0f0f;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-nav {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  flex-wrap: wrap;
}

.nav-btn {
  padding: 8px 16px;
  border: 1px solid #333;
  border-radius: 8px;
  background: transparent;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  border-color: #555;
  color: #fff;
}

.nav-btn.active {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  color: #fff;
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
