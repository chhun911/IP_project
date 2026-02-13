<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { API_BASE_URL } from '../config'

// Types
interface IngredientAttribution {
  text: string
  link: string
}

interface RecipeIngredient {
  name: string
  amount: string
  unit: string
  imageUrl: string
  imageSource: 'pixabay' | 'placeholder' | 'user_override'
  attribution: IngredientAttribution
}

interface GeneratedRecipe {
  title: string
  servings: number
  estimatedTimeMinutes: number
  ingredients: RecipeIngredient[]
  steps: string[]
  tips: string[]
  warnings: string[]
}

interface RecipeSession {
  id: string
  title: string
  mode: RecipeMode
  query: string // mealName or ingredients list
  recipe: GeneratedRecipe | null
  createdAt: Date
}

interface AlternativeImage {
  imageUrl: string
  previewUrl: string
  attributionText: string
  attributionLink: string
  score: number
  tags: string
  pixabayId: number
}

type RecipeMode = 'mealName' | 'fromIngredients'

const props = defineProps<{
  user: { id: number; name: string; email: string }
}>()

// Usage tracking
const imageUsageCount = ref(0)
const imageUsageLimit = ref(5)
const usageLimitReached = computed(() => imageUsageCount.value >= imageUsageLimit.value)

const fetchImageUsage = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/image-usage?userId=${props.user.id}`)
    if (response.ok) {
      const data = await response.json()
      imageUsageCount.value = data.data.used
      imageUsageLimit.value = data.data.limit
    }
  } catch (err) {
    console.error('Failed to fetch image usage:', err)
  }
}

// Sidebar state
const sidebarCollapsed = ref(false)
const recipeSessions = ref<RecipeSession[]>([])
const currentSessionId = ref<string | null>(null)

// State
const mode = ref<RecipeMode>('mealName')
const mealName = ref('')
const ingredientsText = ref('')
const recipe = ref<GeneratedRecipe | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Computed
const ingredientsList = computed(() => {
  return ingredientsText.value
    .split(/[,\n]/)
    .map(i => i.trim())
    .filter(i => i.length > 0)
})

const canSubmit = computed(() => {
  if (isLoading.value) return false
  if (usageLimitReached.value) return false
  if (mode.value === 'mealName') return mealName.value.trim().length > 0
  return ingredientsList.value.length > 0
})

const formattedTime = computed(() => {
  if (!recipe.value) return ''
  const mins = recipe.value.estimatedTimeMinutes
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainder = mins % 60
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`
})

const sortedSessions = computed(() => 
  [...recipeSessions.value].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
)

// Generate unique ID (unused, kept for reference)
// const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Create new recipe session
const createNewRecipe = () => {
  currentSessionId.value = null
  recipe.value = null
  error.value = null
  mealName.value = ''
  ingredientsText.value = ''
  mode.value = 'mealName'
}

// Select a recipe session
const selectRecipe = (sessionId: string) => {
  currentSessionId.value = sessionId
  const session = recipeSessions.value.find(s => s.id === sessionId)
  if (session) {
    recipe.value = session.recipe
    mode.value = session.mode
    if (session.mode === 'mealName') {
      mealName.value = session.query
      ingredientsText.value = ''
    } else {
      ingredientsText.value = session.query
      mealName.value = ''
    }
    error.value = null
  }
}

// Delete a recipe session — also delete from DB
const deleteRecipe = async (sessionId: string, event: Event) => {
  event.stopPropagation()
  // Delete from DB
  try {
    await fetch(`${API_BASE_URL}/api/recipes/history/${sessionId}?userId=${props.user.id}`, {
      method: 'DELETE',
    })
  } catch (err) {
    console.error('Failed to delete recipe from DB:', err)
  }
  const index = recipeSessions.value.findIndex(s => s.id === sessionId)
  if (index !== -1) {
    recipeSessions.value.splice(index, 1)
    if (currentSessionId.value === sessionId) {
      createNewRecipe()
    }
  }
}

// API call
async function generateRecipe() {
  if (!canSubmit.value) return

  isLoading.value = true
  error.value = null

  try {
    const payload = mode.value === 'mealName'
      ? { mode: 'mealName', mealName: mealName.value.trim(), userId: props.user.id }
      : { mode: 'fromIngredients', ingredients: ingredientsList.value, userId: props.user.id }

    const response = await fetch(`${API_BASE_URL}/api/recipes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message || `Request failed: ${response.status}`)
    }

    const generatedRecipe = await response.json()
    recipe.value = generatedRecipe

    // Refresh history from DB (the backend already saved it)
    await loadRecipeHistory()

    // Select the newest session
    if (recipeSessions.value.length > 0) {
      const newest = recipeSessions.value[0] // sorted newest first
      currentSessionId.value = newest.id
    }

    // Refresh usage count after successful generation
    await fetchImageUsage()

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate recipe'
  } finally {
    isLoading.value = false
  }
}

function clearRecipe() {
  recipe.value = null
  error.value = null
}

// ── Image override / alternatives state ──
const showImageModal = ref(false)
const imageModalIngredient = ref<string>('')
const imageModalIndex = ref<number>(-1)
const alternativeImages = ref<AlternativeImage[]>([])
const isLoadingAlternatives = ref(false)

async function openImageAlternatives(ingredientName: string, index: number) {
  imageModalIngredient.value = ingredientName
  imageModalIndex.value = index
  showImageModal.value = true
  isLoadingAlternatives.value = true
  alternativeImages.value = []

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/recipes/ingredient-alternatives?name=${encodeURIComponent(ingredientName)}`
    )
    if (!response.ok) throw new Error('Failed to fetch alternatives')
    const data = await response.json()
    alternativeImages.value = data.alternatives || []
  } catch (err) {
    console.error('Failed to load alternative images:', err)
  } finally {
    isLoadingAlternatives.value = false
  }
}

async function selectAlternativeImage(alt: AlternativeImage) {
  if (!recipe.value || imageModalIndex.value < 0) return

  try {
    // Save override to backend
    await fetch(`${API_BASE_URL}/api/recipes/ingredient-image`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientName: imageModalIngredient.value,
        imageUrl: alt.imageUrl,
        attributionText: alt.attributionText,
        attributionLink: alt.attributionLink,
      }),
    })

    // Update local recipe state
    const ing = recipe.value.ingredients[imageModalIndex.value]
    ing.imageUrl = alt.imageUrl
    ing.imageSource = 'user_override'
    ing.attribution = { text: alt.attributionText, link: alt.attributionLink }

    showImageModal.value = false
  } catch (err) {
    console.error('Failed to save image override:', err)
  }
}

function closeImageModal() {
  showImageModal.value = false
  alternativeImages.value = []
}

// Load recipe history from Neon on mount
const loadRecipeHistory = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/recipes/history?userId=${props.user.id}`)
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.history) {
        recipeSessions.value = data.history.map((h: any) => ({
          id: String(h.id),
          title: h.result?.title || h.prompt?.slice(0, 30) || 'Untitled',
          mode: (h.prompt && h.prompt.includes(',')) ? 'fromIngredients' as RecipeMode : 'mealName' as RecipeMode,
          query: h.prompt || '',
          recipe: h.result as GeneratedRecipe | null,
          createdAt: new Date(h.created_at),
        }))
      }
    }
  } catch (err) {
    console.error('Failed to load recipe history:', err)
  }
}

// Collapse sidebar on mobile initially
onMounted(() => {
  if (window.innerWidth <= 768) {
    sidebarCollapsed.value = true
  }
  fetchImageUsage()
  loadRecipeHistory()
})
</script>

<template>
  <div class="recipe-layout">
    <!-- Overlay for mobile -->
    <div class="sidebar-overlay" :class="{ active: !sidebarCollapsed }" @click="sidebarCollapsed = true"></div>
    
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <button class="sidebar-logo" @click="sidebarCollapsed = !sidebarCollapsed">
          🍳
        </button>
        <button class="new-recipe-btn" @click="createNewRecipe" v-if="!sidebarCollapsed">
          <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span class="text">New recipe</span>
        </button>
        <button class="toggle-sidebar-btn" @click="sidebarCollapsed = !sidebarCollapsed" v-if="!sidebarCollapsed">
          <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </div>

      <div class="sidebar-content">
        <div class="recipe-list" v-if="!sidebarCollapsed">
          <div
            v-for="session in sortedSessions"
            :key="session.id"
            class="recipe-item"
            :class="{ active: session.id === currentSessionId }"
            @click="selectRecipe(session.id)"
          >
            <svg class="recipe-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>
            <div class="recipe-info">
              <span class="recipe-title">{{ session.title }}</span>
              <span class="recipe-mode">{{ session.mode === 'mealName' ? 'By Name' : 'From Ingredients' }}</span>
            </div>
            <button class="delete-btn" @click="deleteRecipe(session.id, $event)" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              </svg>
            </button>
          </div>
          <div v-if="recipeSessions.length === 0" class="no-history">
            No recipe history yet
          </div>
        </div>

        <!-- Collapsed Icons -->
        <div class="sidebar-icons" v-if="sidebarCollapsed">
          <button class="icon-btn" @click="createNewRecipe" title="New recipe">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <button 
            v-for="session in sortedSessions.slice(0, 5)"
            :key="session.id"
            class="icon-btn"
            :class="{ active: session.id === currentSessionId }"
            @click="selectRecipe(session.id)"
            :title="session.title"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="recipe-main">
      <div class="recipe-header">
        <button class="mobile-menu-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <h1 class="recipe-header-title">🍳 AI Recipe Generator</h1>
      </div>
      <div class="recipe-generator">
    <!-- Usage Banner -->
    <div class="usage-banner" :class="{ 'limit-reached': usageLimitReached }">
      <span v-if="usageLimitReached">You have used all {{ imageUsageLimit }} free AI image generations.</span>
      <span v-else>AI Image Generation: {{ imageUsageCount }} / {{ imageUsageLimit }} used</span>
    </div>

    <!-- Input Section -->
    <div class="input-section">
      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button
          :class="['mode-btn', { active: mode === 'mealName' }]"
          @click="mode = 'mealName'; clearRecipe()"
        >
          🍽️ By Meal Name
        </button>
        <button
          :class="['mode-btn', { active: mode === 'fromIngredients' }]"
          @click="mode = 'fromIngredients'; clearRecipe()"
        >
          🥕 From Ingredients
        </button>
      </div>

      <!-- Meal Name Input -->
      <div v-if="mode === 'mealName'" class="input-group">
        <label for="meal-input">What would you like to cook?</label>
        <input
          id="meal-input"
          v-model="mealName"
          type="text"
          placeholder="e.g., Chicken Parmesan, Beef Tacos, Vegetable Stir Fry..."
          @keyup.enter="generateRecipe"
        />
      </div>

      <!-- Ingredients Input -->
      <div v-else class="input-group">
        <label for="ingredients-input">
          What ingredients do you have? 
          <span class="hint">(comma or newline separated)</span>
        </label>
        <textarea
          id="ingredients-input"
          v-model="ingredientsText"
          placeholder="chicken breast&#10;garlic&#10;lemon&#10;olive oil&#10;rosemary"
          rows="5"
        />
        <div v-if="ingredientsList.length > 0" class="ingredient-tags">
          <span v-for="(ing, idx) in ingredientsList" :key="idx" class="tag">
            {{ ing }}
          </span>
        </div>
      </div>

      <!-- Submit Button -->
      <button
        class="submit-btn"
        :disabled="!canSubmit"
        @click="generateRecipe"
      >
        <span v-if="isLoading" class="loading-spinner"></span>
        <span v-else-if="usageLimitReached">Usage Limit Reached</span>
        <span v-else>✨ Generate Recipe</span>
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-message">
      <span class="error-icon">⚠️</span>
      {{ error }}
      <button class="retry-btn" @click="generateRecipe">Retry</button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-animation">
        <span>🍳</span>
        <span>🥘</span>
        <span>🍲</span>
      </div>
      <p>Generating your recipe...</p>
      <p class="loading-hint">This may take a few seconds</p>
    </div>

    <!-- Recipe Display -->
    <div v-if="recipe && !isLoading" class="recipe-result">
      <!-- Recipe Header -->
      <div class="recipe-header">
        <h2>{{ recipe.title }}</h2>
        <div class="recipe-meta">
          <span class="meta-item">👥 {{ recipe.servings }} servings</span>
          <span class="meta-item">⏱️ {{ formattedTime }}</span>
        </div>
      </div>

      <!-- Warnings -->
      <div v-if="recipe.warnings.length > 0" class="warnings-section">
        <div v-for="(warning, idx) in recipe.warnings" :key="idx" class="warning">
          ⚠️ {{ warning }}
        </div>
      </div>

      <!-- Ingredients Grid -->
      <div class="ingredients-section">
        <h3>🥗 Ingredients</h3>
        <div class="ingredients-grid">
          <div
            v-for="(ing, idx) in recipe.ingredients"
            :key="idx"
            class="ingredient-card"
          >
            <div class="ingredient-image-wrapper">
              <img
                v-if="ing.imageUrl"
                :src="ing.imageUrl"
                :alt="ing.name"
                class="ingredient-image"
                loading="lazy"
              />
              <div v-else class="ingredient-image-empty">No image</div>
              <!-- Change Image button overlay -->
              <button
                class="change-image-btn"
                @click="openImageAlternatives(ing.name, idx)"
                title="Change image"
              >
                🔄
              </button>
            </div>
            <div class="ingredient-info">
              <span class="ingredient-name">{{ ing.name }}</span>
              <span class="ingredient-amount">
                {{ ing.amount }} {{ ing.unit }}
              </span>
            </div>
            <a
              v-if="ing.imageSource === 'pixabay' || ing.imageSource === 'user_override'"
              :href="ing.attribution.link"
              target="_blank"
              rel="noopener noreferrer"
              class="attribution"
            >
              {{ ing.attribution.text }}
            </a>
          </div>
        </div>
      </div>

      <!-- Image Alternatives Modal -->
      <div v-if="showImageModal" class="image-modal-overlay" @click.self="closeImageModal">
        <div class="image-modal">
          <div class="image-modal-header">
            <h3>Choose image for "{{ imageModalIngredient }}"</h3>
            <button class="image-modal-close" @click="closeImageModal">✕</button>
          </div>
          <div v-if="isLoadingAlternatives" class="image-modal-loading">
            <div class="loading-spinner"></div>
            <p>Loading alternatives...</p>
          </div>
          <div v-else-if="alternativeImages.length === 0" class="image-modal-empty">
            No alternative images found
          </div>
          <div v-else class="image-modal-grid">
            <div
              v-for="(alt, idx) in alternativeImages"
              :key="idx"
              class="image-modal-item"
              @click="selectAlternativeImage(alt)"
            >
              <img :src="alt.previewUrl" :alt="alt.tags" loading="lazy" />
              <div class="image-modal-item-info">
                <span class="image-modal-score">Score: {{ alt.score }}</span>
                <span class="image-modal-tags">{{ alt.tags }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="steps-section">
        <h3>📝 Instructions</h3>
        <ol class="steps-list">
          <li v-for="(step, idx) in recipe.steps" :key="idx" class="step">
            <span class="step-number">{{ idx + 1 }}</span>
            <span class="step-text">{{ step }}</span>
          </li>
        </ol>
      </div>

      <!-- Tips -->
      <div v-if="recipe.tips.length > 0" class="tips-section">
        <h3>💡 Tips</h3>
        <ul class="tips-list">
          <li v-for="(tip, idx) in recipe.tips" :key="idx">{{ tip }}</li>
        </ul>
      </div>

      <!-- New Recipe Button -->
      <button class="generate-another-btn" @click="createNewRecipe">
        🔄 Generate Another Recipe
      </button>
    </div>
  </div>
    </div>
  </div>
</template>

<style scoped>
.usage-banner {
  padding: 10px 16px;
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid rgba(0, 123, 255, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  text-align: center;
  margin-bottom: 16px;
}

.usage-banner.limit-reached {
  background: rgba(255, 68, 68, 0.1);
  border-color: #ff4444;
  color: #ff4444;
  font-weight: 600;
}

.recipe-layout {
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

.new-recipe-btn {
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

.new-recipe-btn:hover {
  background: var(--bg-tertiary);
}

.new-recipe-btn .icon {
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

.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
}

.recipe-item {
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

.recipe-item:hover {
  background: var(--bg-tertiary);
}

.recipe-item.active {
  background: var(--bg-tertiary);
}

.recipe-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.recipe-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recipe-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recipe-mode {
  font-size: 11px;
  color: #666;
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

.recipe-item:hover .delete-btn {
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

/* Main Content */
.recipe-main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.recipe-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
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
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.mobile-menu-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.recipe-header-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.recipe-generator {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  color: var(--text-primary);
}

/* Mode Toggle */
.mode-toggle {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.mode-btn {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  border-color: var(--border-color);
  color: var(--text-primary);
}

.mode-btn.active {
  border-color: var(--accent-color);
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(254, 202, 87, 0.1));
  color: var(--text-primary);
}

/* Input Section */
.input-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #ccc;
}

.hint {
  font-weight: 400;
  color: #666;
  font-size: 12px;
}

.input-group input,
.input-group textarea {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input-group input:focus,
.input-group textarea:focus {
  outline: none;
  border-color: #ff6b6b;
}

.input-group textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

/* Ingredient Tags */
.ingredient-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.tag {
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(254, 202, 87, 0.2));
  border-radius: 20px;
  font-size: 13px;
  color: #feca57;
}

/* Submit Button */
.submit-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  color: #000;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading Spinner */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  color: #ff6b6b;
  margin-bottom: 24px;
}

.error-icon {
  font-size: 20px;
}

.retry-btn {
  margin-left: auto;
  padding: 8px 16px;
  border: 1px solid #ff6b6b;
  border-radius: 8px;
  background: transparent;
  color: #ff6b6b;
  cursor: pointer;
}

.retry-btn:hover {
  background: rgba(255, 107, 107, 0.2);
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 48px;
}

.loading-animation {
  font-size: 32px;
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.loading-animation span {
  animation: bounce 0.6s ease-in-out infinite;
}

.loading-animation span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-animation span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.loading-hint {
  color: #666;
  font-size: 13px;
}

/* Recipe Result */
.recipe-result {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
}

.recipe-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.recipe-header h2 {
  margin: 0 0 12px;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.recipe-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Warnings */
.warnings-section {
  margin-bottom: 24px;
}

.warning {
  padding: 12px 16px;
  background: rgba(254, 202, 87, 0.1);
  border-left: 4px solid #feca57;
  border-radius: 0 8px 8px 0;
  margin-bottom: 8px;
  font-size: 14px;
  color: #feca57;
}

/* Ingredients Grid */
.ingredients-section h3,
.steps-section h3,
.tips-section h3 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.ingredients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.ingredient-card {
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s;
}

.ingredient-card:hover {
  transform: translateY(-4px);
}

.ingredient-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #222;
}

.ingredient-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ingredient-image-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
  font-size: 12px;
}

.ingredient-info {
  padding: 12px;
}

.ingredient-name {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 14px;
}

.ingredient-amount {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
}

.attribution {
  display: block;
  padding: 8px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 10px;
  text-decoration: none;
  border-top: 1px solid var(--bg-tertiary);
}

.attribution:hover {
  color: #888;
}

/* Steps */
.steps-section {
  margin-bottom: 32px;
}

.steps-list {
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step;
}

.step {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-primary);
  border-radius: 12px;
  margin-bottom: 12px;
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  border-radius: 50%;
  font-weight: 600;
  color: #000;
  font-size: 14px;
}

.step-text {
  color: #ccc;
  line-height: 1.6;
}

/* Tips */
.tips-section {
  margin-bottom: 24px;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  padding: 12px 16px;
  background: rgba(107, 255, 160, 0.1);
  border-left: 4px solid #6bffa0;
  border-radius: 0 8px 8px 0;
  margin-bottom: 8px;
  color: #6bffa0;
  font-size: 14px;
}

/* Generate Another Button */
.generate-another-btn {
  width: 100%;
  padding: 14px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-another-btn:hover {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

/* ── Change Image Button ── */
.change-image-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.ingredient-card:hover .change-image-btn {
  opacity: 1;
}

.change-image-btn:hover {
  background: rgba(255, 107, 107, 0.85);
}

/* ── Image Alternatives Modal ── */
.image-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.image-modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.image-modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.image-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.image-modal-close:hover {
  background: #333;
  color: #fff;
}

.image-modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: #888;
}

.image-modal-empty {
  padding: 48px;
  text-align: center;
  color: #666;
}

.image-modal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
}

.image-modal-item {
  background: var(--bg-primary);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.image-modal-item:hover {
  border-color: #ff6b6b;
  transform: translateY(-2px);
}

.image-modal-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.image-modal-item-info {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.image-modal-score {
  font-size: 11px;
  font-weight: 600;
  color: #feca57;
}

.image-modal-tags {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

@media (max-width: 600px) {
  .recipe-generator {
    padding: 16px;
  }

  .mode-toggle {
    flex-direction: column;
  }

  .ingredients-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
