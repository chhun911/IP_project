<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  generateMealPlan,
  getMealPlanUsage,
  type GenerateMealPlanRequest,
  type MealPlanDay,
  type MealPlanUsage,
} from '../services/mealPlanService'

const props = defineProps<{
  user: {
    id: number
    name: string
    email: string
    subscriptionType?: 'free' | 'premium'
    mealPlanGenerationsUsed?: number
  }
}>()

const budget = ref<number | null>(25)
const ingredientsText = ref('')
const days = ref(7)
const mealsPerDay = ref(3)
const preference = ref('')
const healthGoal = ref('')
const mealPlan = ref<MealPlanDay[]>([])
const isLoading = ref(false)
const isLoadingUsage = ref(false)
const error = ref<string | null>(null)
const limitReachedFromServer = ref(false)
const usage = ref<MealPlanUsage>({
  subscriptionType: props.user.subscriptionType || 'free',
  used: props.user.mealPlanGenerationsUsed ?? 0,
  limit: 2,
  remaining: Math.max(0, 2 - (props.user.mealPlanGenerationsUsed ?? 0)),
})

const ingredients = computed(() =>
  ingredientsText.value
    .split(/[,\n]/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean),
)

const totalCost = computed(() =>
  mealPlan.value.reduce((sum, day) => sum + day.totalEstimatedCost, 0),
)

const isPremium = computed(() => usage.value.subscriptionType === 'premium')
const limitReached = computed(() =>
  !isPremium.value &&
  usage.value.limit !== null &&
  usage.value.used >= usage.value.limit,
)
const showPremiumUpgrade = computed(() =>
  !isPremium.value && (limitReached.value || limitReachedFromServer.value),
)
const freeLimitMessage = computed(() => {
  const remaining = usage.value.remaining ?? 0

  if (showPremiumUpgrade.value) {
    return 'You have used your 2 free meal plan generations. Upgrade to Premium for unlimited meal planning.'
  }

  return `Free plan: You have ${remaining} meal plan ${remaining === 1 ? 'generation' : 'generations'} remaining.`
})
const canGenerate = computed(() =>
  !isLoading.value &&
  !isLoadingUsage.value &&
  !showPremiumUpgrade.value &&
  Number(budget.value) > 0 &&
  days.value > 0 &&
  mealsPerDay.value > 0,
)

function validateForm(): string | null {
  if (showPremiumUpgrade.value) {
    return 'You have used your 2 free meal plan generations. Upgrade to Premium for unlimited meal planning.'
  }
  if (!isPremium.value && days.value !== 7) {
    return 'Free users can generate 7-day meal plans only.'
  }
  if (!budget.value || budget.value <= 0) return 'Please enter a weekly food budget.'
  if (days.value < 1 || days.value > 14) return 'Number of days must be between 1 and 14.'
  if (mealsPerDay.value < 1 || mealsPerDay.value > 5) return 'Meals per day must be between 1 and 5.'
  return null
}

async function loadUsage() {
  isLoadingUsage.value = true
  try {
    usage.value = await getMealPlanUsage(props.user.id)
    limitReachedFromServer.value = false
    if (!isPremium.value) {
      days.value = 7
    }
  } catch (err) {
    console.error('Failed to load meal plan usage:', err)
  } finally {
    isLoadingUsage.value = false
  }
}

async function onGenerate() {
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
    return
  }

  isLoading.value = true
  error.value = null
  mealPlan.value = []

  const payload: GenerateMealPlanRequest = {
    budget: Number(budget.value),
    ingredients: ingredients.value,
    days: days.value,
    mealsPerDay: mealsPerDay.value,
    userId: props.user.id,
    preference: preference.value.trim(),
    healthGoal: healthGoal.value.trim(),
  }

  try {
    mealPlan.value = await generateMealPlan(payload)
    await loadUsage()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate meal plan.'
    if (message === 'Free meal plan limit reached.') {
      limitReachedFromServer.value = true
      error.value = 'You have used your 2 free meal plan generations. Upgrade to Premium for unlimited meal planning.'
    } else {
      error.value = message
    }
  } finally {
    isLoading.value = false
  }
}

function marketplaceLinks(ingredient: string) {
  return [
    { label: 'Google', href: `https://www.google.com/search?q=${encodeURIComponent(`${ingredient} grocery Cambodia`)}` },
    { label: 'GrabMart', href: `https://www.google.com/search?q=${encodeURIComponent(`${ingredient} GrabMart Cambodia`)}` },
    { label: 'Foodpanda', href: `https://www.google.com/search?q=${encodeURIComponent(`${ingredient} foodpanda grocery Cambodia`)}` },
    { label: 'AEON', href: `https://www.google.com/search?q=${encodeURIComponent(`${ingredient} AEON online Cambodia`)}` },
  ]
}

function formatCurrency(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`
}

onMounted(loadUsage)
</script>

<template>
  <div class="meal-planning-layout">
    <div class="meal-main">
      <div class="recipe-header">
        <h1 class="recipe-header-title">Meal Planning</h1>
      </div>

      <div class="recipe-generator">
        <div v-if="!isPremium" class="usage-banner" :class="{ 'limit-reached': showPremiumUpgrade }">
          <span>{{ freeLimitMessage }}</span>
        </div>

        <div class="input-section">
          <div class="form-grid">
            <div class="input-group">
              <label for="budget-input">Weekly food budget</label>
              <input
                id="budget-input"
                v-model.number="budget"
                type="number"
                min="1"
                step="0.5"
                placeholder="25"
              />
            </div>

            <div class="input-group">
              <label for="days-input">Number of days</label>
              <input
                id="days-input"
                v-model.number="days"
                type="number"
                min="1"
                max="14"
                :disabled="!isPremium"
              />
              <span v-if="!isPremium" class="hint">Free plan supports 7-day meal plans only.</span>
            </div>

            <div class="input-group">
              <label for="meals-input">Meals per day</label>
              <input id="meals-input" v-model.number="mealsPerDay" type="number" min="1" max="5" />
            </div>

            <div class="input-group">
              <label for="preference-input">Food preference</label>
              <input
                id="preference-input"
                v-model="preference"
                type="text"
                placeholder="e.g., Khmer food, vegetarian"
              />
            </div>

            <div class="input-group">
              <label for="health-goal-input">Health goal</label>
              <input
                id="health-goal-input"
                v-model="healthGoal"
                type="text"
                placeholder="e.g., more protein, lighter meals"
              />
            </div>

            <div class="input-group full-width">
              <label for="ingredients-input">
                Available ingredients
                <span class="hint">(comma or newline separated)</span>
              </label>
              <textarea
                id="ingredients-input"
                v-model="ingredientsText"
                rows="5"
                placeholder="rice&#10;eggs&#10;garlic&#10;morning glory"
              />
              <div v-if="ingredients.length > 0" class="ingredient-tags">
                <span v-for="ingredient in ingredients" :key="ingredient" class="tag">
                  {{ ingredient }}
                </span>
              </div>
            </div>
          </div>

          <button class="submit-btn" :disabled="!canGenerate" @click="onGenerate">
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else-if="showPremiumUpgrade">Free Limit Reached</span>
            <span v-else>Generate Meal Plan</span>
          </button>
        </div>

        <div v-if="showPremiumUpgrade" class="premium-card">
          <div>
            <h2>Premium</h2>
            <p class="premium-price">$1.99/month</p>
          </div>
          <ul>
            <li>Unlimited meal plans</li>
            <li>Unlimited regenerations</li>
            <li>Advanced meal planning</li>
            <li>Future premium features</li>
          </ul>
          <button class="upgrade-btn" type="button">Upgrade to Premium</button>
        </div>

        <div v-if="error" class="error-message">
          <span class="error-icon">!</span>
          {{ error }}
          <button class="retry-btn" :disabled="isLoading" @click="onGenerate">Retry</button>
        </div>

        <div v-if="isLoading" class="loading-state">
          <div class="loading-animation">
            <span>Meal</span>
            <span>Plan</span>
            <span>Cost</span>
          </div>
          <p>Building a Cambodian-friendly meal plan...</p>
          <p class="loading-hint">This may take a few seconds</p>
        </div>

        <div v-if="mealPlan.length && !isLoading" class="recipe-result">
          <div class="result-header">
            <div>
              <h2>Your Meal Plan</h2>
              <div class="recipe-meta">
                <span class="meta-item">{{ mealPlan.length }} days</span>
                <span class="meta-item">{{ mealsPerDay }} meals per day</span>
                <span class="meta-item">{{ formatCurrency(totalCost) }} estimated</span>
              </div>
            </div>
          </div>

          <div class="days-list">
            <div v-for="day in mealPlan" :key="day.day" class="day-card">
              <div class="day-header">
                <h3>Day {{ day.day }}</h3>
                <span>{{ formatCurrency(day.totalEstimatedCost) }}</span>
              </div>

              <div class="meal-list">
                <div v-for="meal in day.meals" :key="`${day.day}-${meal.type}-${meal.name}`" class="meal-card">
                  <div class="meal-card-header">
                    <span class="meal-type">{{ meal.type }}</span>
                    <span class="meal-cost">{{ formatCurrency(meal.estimatedCost) }}</span>
                  </div>
                  <h4>{{ meal.name }}</h4>

                  <div class="meal-block">
                    <strong>Ingredients</strong>
                    <div class="compact-tags">
                      <span v-for="ingredient in meal.ingredients" :key="ingredient">
                        {{ ingredient }}
                      </span>
                    </div>
                  </div>

                  <div class="meal-block">
                    <strong>Missing ingredients</strong>
                    <div v-if="meal.missingIngredients.length" class="missing-list">
                      <div
                        v-for="ingredient in meal.missingIngredients"
                        :key="ingredient"
                        class="missing-item"
                      >
                        <span>{{ ingredient }}</span>
                        <div class="market-links">
                          <a
                            v-for="link in marketplaceLinks(ingredient)"
                            :key="link.label"
                            :href="link.href"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {{ link.label }}
                          </a>
                        </div>
                      </div>
                    </div>
                    <p v-else class="nothing-missing">You already have the main ingredients.</p>
                  </div>

                  <div class="meal-block">
                    <strong>Instructions</strong>
                    <p>{{ meal.instructions }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!isLoading && !mealPlan.length" class="empty-state">
          <h2>Plan meals around your budget and pantry.</h2>
          <p>Enter your budget, ingredients, and schedule to generate a local student-friendly plan.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meal-planning-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.meal-main {
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
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  color: var(--text-primary);
}

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

.input-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 16px;
}

.input-group {
  margin-bottom: 20px;
  min-width: 0;
}

.input-group.full-width {
  grid-column: 1 / -1;
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
  max-width: 100%;
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

.input-group input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.input-group textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.ingredient-tags,
.compact-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ingredient-tags {
  margin-top: 12px;
}

.tag,
.compact-tags span {
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(254, 202, 87, 0.2));
  border-radius: 20px;
  font-size: 13px;
  color: #feca57;
  max-width: 100%;
  overflow-wrap: anywhere;
}

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

.premium-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.premium-card h2 {
  margin: 0 0 6px;
  color: var(--text-primary);
  font-size: 1.3rem;
}

.premium-price {
  margin: 0;
  color: #feca57;
  font-size: 18px;
  font-weight: 600;
}

.premium-card ul {
  list-style: none;
  padding: 0;
  margin: 18px 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.premium-card li {
  color: #ccc;
  font-size: 14px;
  line-height: 1.5;
}

.premium-card li::before {
  content: "✓";
  color: #6bffa0;
  margin-right: 8px;
}

.upgrade-btn {
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

.upgrade-btn:hover {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

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
  font-weight: 700;
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

.loading-state {
  text-align: center;
  padding: 48px;
}

.loading-animation {
  font-size: 20px;
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
  color: #feca57;
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

.recipe-result,
.empty-state {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
}

.empty-state h2 {
  margin: 0 0 12px;
  font-size: 1.3rem;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  line-height: 1.6;
}

.result-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.result-header h2 {
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

.days-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.day-card {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 16px;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.day-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.day-header span {
  color: #feca57;
  font-size: 14px;
  font-weight: 600;
}

.meal-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.meal-card {
  min-width: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 12px;
  padding: 16px;
}

.meal-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.meal-type {
  color: #feca57;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.meal-cost {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.meal-card h4 {
  margin: 0 0 16px;
  color: var(--text-primary);
  font-size: 1rem;
}

.meal-block {
  margin-top: 16px;
}

.meal-block strong {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
  font-size: 13px;
}

.meal-block p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.missing-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.missing-item {
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--bg-tertiary);
}

.missing-item > span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.market-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.market-links a {
  padding: 6px 10px;
  border: 1px solid rgba(254, 202, 87, 0.35);
  border-radius: 8px;
  color: #feca57;
  font-size: 12px;
  text-decoration: none;
}

.market-links a:hover {
  background: rgba(254, 202, 87, 0.1);
}

.nothing-missing {
  color: #6bffa0;
  font-size: 13px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .recipe-generator {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .input-section,
  .recipe-result,
  .empty-state,
  .premium-card {
    padding: 20px;
  }

  .premium-card ul {
    grid-template-columns: 1fr;
  }

  .recipe-meta,
  .meal-card-header,
  .day-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .meal-list {
    grid-template-columns: 1fr;
  }
}
</style>
