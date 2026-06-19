import { API_BASE_URL } from '../config'

export interface GenerateMealPlanRequest {
  budget: number
  ingredients: string[]
  days: number
  mealsPerDay: number
  userId: number
  preference: string
  healthGoal: string
}

export interface MealPlanMeal {
  type: string
  name: string
  ingredients: string[]
  instructions: string
  estimatedCost: number
  missingIngredients: string[]
}

export interface MealPlanDay {
  day: number
  meals: MealPlanMeal[]
  totalEstimatedCost: number
}

interface GenerateMealPlanResponse {
  success: boolean
  mealPlan: MealPlanDay[]
  message?: string
}

export interface MealPlanUsage {
  subscriptionType: 'free' | 'premium'
  used: number
  limit: number | null
  remaining: number | null
}

export async function generateMealPlan(
  payload: GenerateMealPlanRequest,
): Promise<MealPlanDay[]> {
  const response = await fetch(`${API_BASE_URL}/api/meal-plans/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null) as GenerateMealPlanResponse | null

  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`)
  }

  if (!data?.success || !Array.isArray(data.mealPlan)) {
    throw new Error('Meal plan response was not valid.')
  }

  return data.mealPlan
}

export async function getMealPlanUsage(userId: number): Promise<MealPlanUsage> {
  const response = await fetch(`${API_BASE_URL}/api/auth/meal-plan-usage?userId=${userId}`)
  const data = await response.json().catch(() => null) as {
    success?: boolean
    data?: MealPlanUsage
    message?: string
  } | null

  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`)
  }

  if (!data?.success || !data.data) {
    throw new Error('Meal plan usage response was not valid.')
  }

  return data.data
}
