<script setup lang="ts">
interface Ingredient {
  name: string
  quantity: string
  unit: string
}

interface Recipe {
  title: string
  servings: string
  ingredients: Ingredient[]
  instructions: string[]
  tips: string[]
  images?: string[]
}

defineProps<{
  recipe: Recipe
}>()
</script>

<template>
  <div class="recipe-display">
    <div class="recipe-header">
      <h2>{{ recipe.title }}</h2>
      <span class="servings">{{ recipe.servings }}</span>
    </div>

    <div class="recipe-content">
      <div class="ingredients-section">
        <h3>🥘 Main Ingredients (Sauce)</h3>
        <ul class="ingredients-list">
          <li v-for="(ing, idx) in recipe.ingredients.slice(0, 5)" :key="idx">
            <span class="ingredient-name">{{ ing.name }}</span>
            <span class="ingredient-amount">{{ ing.quantity }} {{ ing.unit }}</span>
          </li>
        </ul>
      </div>

      <div class="instructions-section">
        <h3>📝 Instructions</h3>
        <ol class="instructions-list">
          <li v-for="(instruction, idx) in recipe.instructions" :key="idx">
            <strong>Step {{ idx + 1 }}:</strong> {{ instruction }}
          </li>
        </ol>
      </div>

      <div class="tips-section" v-if="recipe.tips.length > 0">
        <h3>💡 Tips</h3>
        <ul class="tips-list">
          <li v-for="(tip, idx) in recipe.tips" :key="idx">
            {{ tip }}
          </li>
        </ul>
      </div>

      <div class="images-section" v-if="recipe.images && recipe.images.length > 0">
        <h3>📸 Images</h3>
        <div class="images-grid">
          <img 
            v-for="(img, idx) in recipe.images" 
            :key="idx" 
            :src="img" 
            :alt="`${recipe.title} step ${idx}`"
            class="recipe-image"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recipe-display {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #444;
  padding-bottom: 12px;
}

.recipe-header h2 {
  margin: 0;
  font-size: 18px;
  color: #ffffff;
}

.servings {
  background: #007bff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.recipe-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ingredients-section,
.instructions-section,
.tips-section,
.images-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #ffffff;
  font-weight: 600;
}

.ingredients-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ingredients-list li {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  background: rgba(0, 123, 255, 0.1);
  border-radius: 4px;
  font-size: 13px;
}

.ingredient-name {
  color: #ffffff;
}

.ingredient-amount {
  color: #007bff;
  font-weight: 600;
}

.instructions-list {
  padding-left: 20px;
  margin: 0;
}

.instructions-list li {
  margin-bottom: 8px;
  color: #d0d0d0;
  line-height: 1.6;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tips-list li {
  padding: 6px 8px;
  background: rgba(255, 193, 7, 0.1);
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  color: #d0d0d0;
  font-size: 13px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.recipe-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.3s;
}

.recipe-image:hover {
  transform: scale(1.05);
}
</style>
