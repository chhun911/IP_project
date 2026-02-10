<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  user: { name: string; email: string }
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
const archived = ref(0)
const showDeleteConfirm = ref(false)

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
          :class="{ active: activeTab === tab.toLowerCase().replace(' ', '-') }"
          @click="activeTab = tab.toLowerCase().replace(' ', '-')"
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

          <button class="btn-logout">Log out of this device</button>
          <button class="btn-logout-all">Log out of all devices</button>
        </div>

        <!-- Account Tab -->
        <div v-if="activeTab === 'account'" class="tab-content">
          <h2>Account</h2>
          <div class="account-info">
            <div class="account-header">
              <h3>AI CookBook</h3>
              <button class="btn-manage">Manage</button>
            </div>
            <p class="usage">1 out of 5 free use</p>
          </div>

          <div class="account-section">
            <h3>Payment</h3>
            <button class="btn-manage">Manage</button>
          </div>

          <button class="btn-delete-account">Delete account</button>

          <div class="user-info">
            <p><strong>Name</strong><br/>{{ user.name }}</p>
            <p><strong>Email</strong><br/>{{ user.email }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal">
        <p>Are you sure you want to delete all chats? This action cannot be undone.</p>
        <div class="modal-buttons">
          <button class="btn-cancel" @click="showDeleteConfirm = false">Cancel</button>
          <button class="btn-confirm" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  position: relative;
  height: 100vh;
  background: #0f0f0f;
  display: flex;
}

.btn-back {
  position: absolute;
  top: 20px;
  left: 20px;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
}

.settings-panel {
  display: flex;
  width: 100%;
  margin-top: 60px;
}

.settings-sidebar {
  width: 200px;
  background: #1a1a1a;
  padding: 20px;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tab-btn {
  background: none;
  border: none;
  color: #888;
  text-align: left;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.tab-btn:hover {
  background: #2a2a2a;
  color: #ffffff;
}

.tab-btn.active {
  background: #007bff;
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
  color: #ffffff;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  color: #d0d0d0;
  font-size: 14px;
  font-weight: 600;
}

.setting-group select {
  width: 100%;
  max-width: 400px;
  padding: 10px;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #ffffff;
  border-radius: 6px;
  font-size: 14px;
}

.control-item {
  padding: 15px;
  background: #1a1a1a;
  border-radius: 8px;
  margin-bottom: 12px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-header span {
  color: #d0d0d0;
}

.btn-manage,
.btn-action {
  background: #2a2a2a;
  border: 1px solid #444;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;
}

.btn-manage:hover,
.btn-action:hover {
  background: #3a3a3a;
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
  color: #ffffff;
  font-size: 16px;
}

.info-text {
  color: #888;
  font-size: 13px;
  margin: 0;
}

.btn-logout,
.btn-logout-all {
  background: #2a2a2a;
  border: 1px solid #444;
  color: #ffffff;
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
  background: #3a3a3a;
}

.account-info {
  padding: 15px;
  background: #1a1a1a;
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
  color: #ffffff;
}

.usage {
  color: #888;
  font-size: 13px;
  margin: 0;
}

.account-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #1a1a1a;
  border-radius: 8px;
  margin-bottom: 20px;
}

.account-section h3 {
  margin: 0;
  color: #ffffff;
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
  color: #888;
  font-size: 13px;
  line-height: 1.8;
}

.user-info p {
  margin: 10px 0;
}

.user-info strong {
  color: #d0d0d0;
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
  background: #1a1a1a;
  border-radius: 8px;
  padding: 30px;
  max-width: 400px;
  text-align: center;
}

.modal p {
  color: #d0d0d0;
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
  background: #2a2a2a;
  color: #ffffff;
}

.btn-cancel:hover {
  background: #3a3a3a;
}

.btn-confirm {
  background: #ff4444;
  color: #ffffff;
}

.btn-confirm:hover {
  background: #cc3333;
}
</style>
