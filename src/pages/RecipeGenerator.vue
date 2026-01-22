<script setup lang="ts">
import { ref, computed } from 'vue'

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
  imageSource: 'unsplash' | 'placeholder'
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

type RecipeMode = 'mealName' | 'fromIngredients'

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

// API call
async function generateRecipe() {
  if (!canSubmit.value) return

  isLoading.value = true
  error.value = null
  recipe.value = null

  try {
    const payload = mode.value === 'mealName'
      ? { mode: 'mealName', mealName: mealName.value.trim() }
      : { mode: 'fromIngredients', ingredients: ingredientsList.value }

    const response = await fetch('http://localhost:3001/api/recipes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message || `Request failed: ${response.status}`)
    }

    recipe.value = await response.json()
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
</script>

<template>
  <div class="recipe-generator">
    <!-- Header -->
    <div class="header">
      <h1>🍳 AI Recipe Generator</h1>
      <p class="subtitle">Get delicious recipes with ingredient images</p>
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
            </div>
            <div class="ingredient-info">
              <span class="ingredient-name">{{ ing.name }}</span>
              <span class="ingredient-amount">
                {{ ing.amount }} {{ ing.unit }}
              </span>
            </div>
            <a
              v-if="ing.imageSource === 'unsplash'"
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
      <button class="new-recipe-btn" @click="clearRecipe">
        🔄 Generate Another Recipe
      </button>
    </div>
  </div>
</template>

<style scoped>
.recipe-generator {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  color: #ffffff;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 2rem;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #888;
  margin: 0;
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
  border: 2px solid #333;
  border-radius: 12px;
  background: #1a1a1a;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  border-color: #444;
  color: #fff;
}

.mode-btn.active {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(254, 202, 87, 0.1));
  color: #fff;
}

/* Input Section */
.input-section {
  background: #1a1a1a;
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
  border: 2px solid #333;
  border-radius: 12px;
  background: #0f0f0f;
  color: #fff;
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
  background: #1a1a1a;
  border-radius: 16px;
  padding: 24px;
}

.recipe-header {
  border-bottom: 1px solid #333;
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.recipe-header h2 {
  margin: 0 0 12px;
  font-size: 1.5rem;
  color: #fff;
}

.recipe-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  color: #888;
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
  color: #fff;
}

.ingredients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.ingredient-card {
  background: #0f0f0f;
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
  color: #fff;
  margin-bottom: 4px;
  font-size: 14px;
}

.ingredient-amount {
  display: block;
  color: #888;
  font-size: 13px;
}

.attribution {
  display: block;
  padding: 8px 12px;
  background: #1a1a1a;
  color: #666;
  font-size: 10px;
  text-decoration: none;
  border-top: 1px solid #222;
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
  background: #0f0f0f;
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

/* New Recipe Button */
.new-recipe-btn {
  width: 100%;
  padding: 14px;
  border: 2px solid #333;
  border-radius: 12px;
  background: transparent;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.new-recipe-btn:hover {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

/* Responsive */
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
