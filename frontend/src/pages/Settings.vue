<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  user: { id: number; name: string; email: string }
  visible: boolean
}>()

const emit = defineEmits<{
  back: []
  logout: []
}>()

const activeTab = ref('general')
const appearance = ref('System')
const accentColor = ref('Default')
const language = ref('Auto-detect')
const notifications = ref('push')
const showDeleteConfirm = ref(false)
const showDeleteAccountConfirm = ref(false)
const imageUsageCount = ref(0)
const imageUsageLimit = ref(5)

const fetchImageUsage = async () => {
  try {
    const response = await fetch(`http://localhost:3001/api/auth/image-usage?userId=${props.user.id}`)
    if (response.ok) {
      const data = await response.json()
      imageUsageCount.value = data.data.used
      imageUsageLimit.value = data.data.limit
    }
  } catch (err) {
    console.error('Failed to fetch image usage:', err)
  }
}

// Load settings from localStorage
onMounted(() => {
  const savedAppearance = localStorage.getItem('settings-appearance')
  const savedAccentColor = localStorage.getItem('settings-accentColor')
  const savedLanguage = localStorage.getItem('settings-language')
  const savedNotifications = localStorage.getItem('settings-notifications')
  
  if (savedAppearance) appearance.value = savedAppearance
  if (savedAccentColor) accentColor.value = savedAccentColor
  if (savedLanguage) language.value = savedLanguage
  if (savedNotifications) notifications.value = savedNotifications
  
  // Apply initial theme
  applyTheme(appearance.value)
  applyAccentColor(accentColor.value)
  
  // Fetch image usage count
  fetchImageUsage()
})

// Re-fetch usage whenever the settings page becomes visible
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    fetchImageUsage()
  }
})

// Watch for appearance changes
watch(appearance, (newValue) => {
  localStorage.setItem('settings-appearance', newValue)
  applyTheme(newValue)
})

// Watch for accent color changes
watch(accentColor, (newValue) => {
  localStorage.setItem('settings-accentColor', newValue)
  applyAccentColor(newValue)
})

// Watch for language changes
watch(language, (newValue) => {
  localStorage.setItem('settings-language', newValue)
})

// Watch for notifications changes
watch(notifications, (newValue) => {
  localStorage.setItem('settings-notifications', newValue)
})

// Apply theme to document
const applyTheme = (theme: string) => {
  const root = document.documentElement
  
  if (theme === 'Light') {
    root.style.setProperty('--bg-primary', '#ffffff')
    root.style.setProperty('--bg-secondary', '#f5f5f5')
    root.style.setProperty('--bg-tertiary', '#e0e0e0')
    root.style.setProperty('--text-primary', '#000000')
    root.style.setProperty('--text-secondary', '#666666')
    root.style.setProperty('--border-color', '#cccccc')
  } else if (theme === 'Dark') {
    root.style.setProperty('--bg-primary', '#0f0f0f')
    root.style.setProperty('--bg-secondary', '#1a1a1a')
    root.style.setProperty('--bg-tertiary', '#2a2a2a')
    root.style.setProperty('--text-primary', '#ffffff')
    root.style.setProperty('--text-secondary', '#888888')
    root.style.setProperty('--border-color', '#333333')
  } else {
    // System - detect preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'Dark' : 'Light')
  }
}

// Apply accent color
const applyAccentColor = (color: string) => {
  const root = document.documentElement
  
  switch (color) {
    case 'Blue':
      root.style.setProperty('--accent-color', '#007bff')
      break
    case 'Green':
      root.style.setProperty('--accent-color', '#28a745')
      break
    default:
      root.style.setProperty('--accent-color', '#ff6b6b')
  }
}

const handleArchiveAll = () => {
  console.log('Archive all chats')
}

const handleExport = () => {
  console.log('Export data')
}

const handleDeleteAll = () => {
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  console.log('Delete all chats')
  showDeleteConfirm.value = false
}

const handleDeleteAccount = () => {
  showDeleteAccountConfirm.value = true
}

const confirmDeleteAccount = () => {
  console.log('Delete account')
  showDeleteAccountConfirm.value = false
  emit('logout')
}

const handleLogout = () => {
  emit('logout')
}
</script>

<template>
  <div class="settings-container">
    <button class="btn-back" @click="$emit('back')">
      ✕
    </button>

    <div class="settings-panel">
      <div class="settings-sidebar">
        <button 
          v-for="tab in ['General', 'Notifications', 'Data Controls', 'Security', 'Account']" 
          :key="tab"
          class="tab-btn"
          :class="{ active: activeTab === tab.toLowerCase().replace(/ /g, '-') }"
          @click="activeTab = tab.toLowerCase().replace(/ /g, '-')"
        >
          {{ tab }}
        </button>
      </div>

      <div class="settings-content">
        <!-- General Tab -->
        <div v-if="activeTab === 'general'" class="tab-content">
          <h2>General</h2>
          <div class="setting-group">
            <label>Appearance</label>
            <select v-model="appearance">
              <option>System</option>
              <option>Light</option>
              <option>Dark</option>
            </select>
          </div>

          <div class="setting-group">
            <label>Accent color</label>
            <select v-model="accentColor">
              <option>Default</option>
              <option>Blue</option>
              <option>Green</option>
            </select>
          </div>

          <div class="setting-group">
            <label>Language</label>
            <select v-model="language">
              <option>Auto-detect</option>
              <option>English</option>
              <option>Spanish</option>
            </select>
          </div>
        </div>

        <!-- Notifications Tab -->
        <div v-if="activeTab === 'notifications'" class="tab-content">
          <h2>Notifications</h2>
          <div class="setting-group">
            <label>Response</label>
            <select v-model="notifications">
              <option value="push">Push (Alerts whenever you respond to requests that take time, like message generation)</option>
              <option value="silent">Silent</option>
            </select>
          </div>
        </div>

        <!-- Data Controls Tab -->
        <div v-if="activeTab === 'data-controls'" class="tab-content">
          <h2>Data Controls</h2>
          <div class="control-item">
            <div class="control-header">
              <span>Archived chats</span>
              <button class="btn-manage">Manage</button>
            </div>
          </div>

          <div class="control-item">
            <div class="control-header">
              <span>Archived all chats</span>
              <button class="btn-action" @click="handleArchiveAll">Archive all</button>
            </div>
          </div>

          <div class="control-item">
            <div class="control-header">
              <span>Delete all chats</span>
              <button class="btn-danger" @click="handleDeleteAll">Delete all</button>
            </div>
          </div>

          <div class="control-item">
            <div class="control-header">
              <span>Export data</span>
              <button class="btn-action" @click="handleExport">Export</button>
            </div>
          </div>
        </div>

        <!-- Security Tab -->
        <div v-if="activeTab === 'security'" class="tab-content">
          <h2>Security</h2>
          <div class="security-section">
            <h3>Multi-factor authentication (MFA)</h3>
            <p class="info-text">Ensure your account is secure</p>
          </div>

          <div class="security-section">
            <h3>Trusted Devices</h3>
            <p class="info-text">When you add a trusted device, it will be added here and can automatically receive device prompts for signing in.</p>
          </div>

          <button class="btn-logout" @click="handleLogout">Log out of this device</button>
          <button class="btn-logout-all" @click="handleLogout">Log out of all devices</button>
        </div>

        <!-- Account Tab -->
        <div v-if="activeTab === 'account'" class="tab-content">
          <h2>Account</h2>
          <div class="account-info">
            <div class="account-header">
              <h3>AI CookBook</h3>
              <button class="btn-manage">Manage</button>
            </div>
            <p class="usage">{{ imageUsageCount }} out of {{ imageUsageLimit }} free use</p>
          </div>

          <div v-if="imageUsageCount >= imageUsageLimit" class="usage-warning">
            You have reached the maximum number of free AI image generations.
          </div>

          <div class="account-section">
            <h3>Payment</h3>
            <button class="btn-manage">Manage</button>
          </div>

          <button class="btn-delete-account" @click="handleDeleteAccount">Delete account</button>

          <div class="user-info">
            <p><strong>Name</strong><br/>{{ user.name }}</p>
            <p><strong>Email</strong><br/>{{ user.email }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Chats Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal">
        <p>Are you sure you want to delete all chats? This action cannot be undone.</p>
        <div class="modal-buttons">
          <button class="btn-cancel" @click="showDeleteConfirm = false">Cancel</button>
          <button class="btn-confirm" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </div>

    <!-- Delete Account Confirmation Modal -->
    <div v-if="showDeleteAccountConfirm" class="modal-overlay">
      <div class="modal">
        <p>Are you sure you want to delete your account? All your data will be permanently removed. This action cannot be undone.</p>
        <div class="modal-buttons">
          <button class="btn-cancel" @click="showDeleteAccountConfirm = false">Cancel</button>
          <button class="btn-confirm" @click="confirmDeleteAccount">Delete Account</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  position: relative;
  flex: 1;
  min-height: 0;
  background: var(--bg-primary);
  display: flex;
  overflow: hidden;
}

.btn-back {
  position: absolute;
  top: 20px;
  left: 20px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
}

.settings-panel {
  display: flex;
  width: 100%;
  flex: 1;
  margin-top: 60px;
  min-height: 0;
}

.settings-sidebar {
  width: 200px;
  background: var(--bg-secondary);
  padding: 20px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tab-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  text-align: left;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.tab-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--accent-color);
  color: #ffffff;
}

.settings-content {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}

.tab-content h2 {
  margin-top: 0;
  margin-bottom: 30px;
  color: var(--text-primary);
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.setting-group select {
  width: 100%;
  max-width: 400px;
  padding: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 6px;
  font-size: 14px;
}

.control-item {
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-header span {
  color: var(--text-primary);
}

.btn-manage,
.btn-action {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;
}

.btn-manage:hover,
.btn-action:hover {
  background: var(--border-color);
}

.btn-danger {
  background: transparent;
  border: 1px solid #ff4444;
  color: #ff4444;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;
}

.btn-danger:hover {
  background: rgba(255, 68, 68, 0.1);
}

.security-section {
  margin-bottom: 25px;
}

.security-section h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 16px;
}

.info-text {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}

.btn-logout,
.btn-logout-all {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 10px;
  width: 100%;
  transition: background 0.3s;
}

.btn-logout:hover,
.btn-logout-all:hover {
  background: var(--border-color);
}

.account-info {
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.account-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.usage {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}

.account-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.account-section h3 {
  margin: 0;
  color: var(--text-primary);
}

.btn-delete-account {
  background: transparent;
  border: 1px solid #ff4444;
  color: #ff4444;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 20px;
  width: 100%;
}

.btn-delete-account:hover {
  background: rgba(255, 68, 68, 0.1);
}

.user-info {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.8;
}

.user-info p {
  margin: 10px 0;
}

.user-info strong {
  color: var(--text-primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 30px;
  max-width: 400px;
  text-align: center;
}

.modal p {
  color: var(--text-primary);
  margin-bottom: 20px;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--border-color);
}

.btn-confirm {
  background: #ff4444;
  color: #ffffff;
}

.btn-confirm:hover {
  background: #cc3333;
}

.usage-warning {
  padding: 12px 16px;
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid #ff4444;
  border-radius: 8px;
  color: #ff4444;
  font-size: 13px;
  margin-bottom: 20px;
  text-align: center;
}
</style>
