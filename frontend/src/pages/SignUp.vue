<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  signup: [userData: { name: string; email: string }]
  login: []
}>()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const agreeToTerms = ref(false)

const handleSignUp = async () => {
  if (!name.value || !email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  if (!agreeToTerms.value) {
    error.value = 'You must agree to terms of service'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        password: password.value
      })
    })

    if (!response.ok) {
      throw new Error('Sign up failed')
    }

    const data = await response.json()
    emit('signup', { name: name.value, email: email.value })
  } catch (err) {
    error.value = 'Failed to create account'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="signup-container">
    <div class="signup-box">
      <div class="logo">
        <span class="logo-text">AI CookBook</span>
      </div>

      <h1>Sign Up</h1>

      <div class="form-group">
        <label>Name</label>
        <input 
          v-model="name" 
          type="text" 
          placeholder="Enter your name"
          @keyup.enter="handleSignUp"
        />
      </div>

      <div class="form-group">
        <label>Email</label>
        <input 
          v-model="email" 
          type="email" 
          placeholder="Enter your email"
          @keyup.enter="handleSignUp"
        />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input 
          v-model="password" 
          type="password" 
          placeholder="Enter your password"
          @keyup.enter="handleSignUp"
        />
      </div>

      <div class="terms">
        <input 
          v-model="agreeToTerms" 
          type="checkbox" 
          id="terms"
        />
        <label for="terms">
          By confirming you agree to our
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
        </label>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button class="btn-primary" @click="handleSignUp" :disabled="loading">
        {{ loading ? 'Creating account...' : 'Sign Up' }}
      </button>

      <div class="footer">
        <span>Already have an account?</span>
        <a href="#" @click.prevent="$emit('login')">Log in</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.signup-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #0f0f0f;
  padding: 20px;
}

.signup-box {
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

.terms {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 15px;
  font-size: 12px;
  color: #888;
}

.terms input {
  margin-top: 3px;
  width: auto;
}

.terms a {
  color: #007bff;
  text-decoration: none;
}

.terms a:hover {
  text-decoration: underline;
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

.footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #888;
}

.footer a {
  color: #007bff;
  text-decoration: none;
  margin-left: 5px;
}

.footer a:hover {
  text-decoration: underline;
}
</style>
