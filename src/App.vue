<script setup lang="ts">
import { ref } from 'vue'
import Login from './pages/Login.vue'
import SignUp from './pages/SignUp.vue'
import Chat from './pages/Chat.vue'
import Settings from './pages/Settings.vue'

type Page = 'login' | 'signup' | 'chat' | 'settings'

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
      <Chat 
        v-if="currentPage === 'chat'" 
        :user="user!" 
        @settings="currentPage = 'settings'"
        @logout="handleLogout"
      />
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
  height: 100vh;
  background: #0f0f0f;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
