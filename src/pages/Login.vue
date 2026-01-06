<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  login: [userData: { name: string; email: string }]
  signup: []
}>()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Call login API
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const data = await response.json()
    emit('login', { name: data.name, email: email.value })
  } catch (err) {
    error.value = 'Invalid email or password'
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = () => {
  // Implement Google OAuth
  console.log('Google login clicked')
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo">
        <span class="logo-text">AI CookBook</span>
      </div>

      <h1>Log in</h1>

      <div class="form-group">
        <label>Email</label>
        <input 
          v-model="email" 
          type="email" 
          placeholder="Enter your email"
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input 
          v-model="password" 
          type="password" 
          placeholder="Enter your password"
          @keyup.enter="handleLogin"
        />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button class="btn-primary" @click="handleLogin" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>

      <div class="divider">Or</div>

      <button class="btn-google" @click="handleGoogleLogin">
        <span class="google-icon">G</span>
        Google
      </button>

      <div class="footer">
        <span>Do not have Login yet?</span>
        <a href="#" @click.prevent="$emit('signup')">Sign up</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #0f0f0f;
  padding: 20px;
}

.login-box {
  background: #1a1a1a;
  border-radius: 10px;
  padding: 40px;
  max-width: 400px;
  width: 100%;
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo-text {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  color: #ffffff;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #b0b0b0;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #ffffff;
  font-size: 14px;
  color: #000;
}

.form-group input:focus {
  outline: none;
  background: #f8f8f8;
}

.error-message {
  color: #ff4444;
  font-size: 14px;
  margin-bottom: 15px;
  text-align: center;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #ffffff;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  margin: 20px 0;
  color: #666;
  font-size: 14px;
}

.btn-google {
  width: 100%;
  padding: 12px;
  background: transparent;
  color: #ffffff;
  border: 1px solid #555;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: border-color 0.3s;
}

.btn-google:hover {
  border-color: #888;
}

.google-icon {
  font-weight: bold;
  font-size: 18px;
}

.footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #888;
}

.footer a {
  color: #ff4444;
  text-decoration: none;
  margin-left: 5px;
}

.footer a:hover {
  text-decoration: underline;
}
</style>
