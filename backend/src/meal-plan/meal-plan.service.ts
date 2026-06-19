import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { GenerateMealPlanDto, MealPlanDay, MealPlanMeal } from './dto/meal-plan.dto';
import { UserDatabaseService } from '../auth/services/user-database.service';

interface AiMealPlanResponse {
  mealPlan: MealPlanDay[];
}

@Injectable()
export class MealPlanService {
  private readonly logger = new Logger(MealPlanService.name);
  private readonly apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  private readonly model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat';
  private readonly apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.deepseek.com';
  private readonly freeGenerationLimit = 2;

  constructor(private readonly userDatabaseService: UserDatabaseService) {}

  async generateMealPlan(dto: GenerateMealPlanDto): Promise<MealPlanDay[]> {
    const request = this.normalizeRequest(dto);
    await this.enforceSubscriptionRules(request);

    let mealPlan: MealPlanDay[];
    if (!this.apiKey) {
      this.logger.warn('AI API key not configured; using fallback meal plan.');
      mealPlan = this.buildFallbackMealPlan(request);
    } else {
      try {
        const generated = await this.generateWithAi(request);
        mealPlan = this.validateMealPlan(generated.mealPlan, request);
      } catch (error) {
        this.logger.warn(`AI meal plan generation failed; using fallback. ${String(error)}`);
        mealPlan = this.buildFallbackMealPlan(request);
      }
    }

    await this.userDatabaseService.incrementMealPlanGenerationCount(request.userId);
    return mealPlan;
  }

  private normalizeRequest(dto: GenerateMealPlanDto): GenerateMealPlanDto {
    const ingredients = Array.isArray(dto.ingredients)
      ? dto.ingredients.map((ingredient) => ingredient.trim()).filter(Boolean)
      : [];

    if (dto.budget <= 0) {
      throw new BadRequestException('Budget must be greater than 0.');
    }

    if (dto.days < 1 || dto.days > 14) {
      throw new BadRequestException('Days must be between 1 and 14.');
    }

    if (dto.mealsPerDay < 1 || dto.mealsPerDay > 5) {
      throw new BadRequestException('Meals per day must be between 1 and 5.');
    }

    if (!dto.userId || Number.isNaN(Number(dto.userId))) {
      throw new BadRequestException('Valid userId is required.');
    }

    return {
      budget: Number(dto.budget),
      ingredients,
      days: Number(dto.days),
      mealsPerDay: Number(dto.mealsPerDay || 3),
      userId: Number(dto.userId),
      preference: dto.preference?.trim() || '',
      healthGoal: dto.healthGoal?.trim() || '',
    };
  }

  private async enforceSubscriptionRules(dto: GenerateMealPlanDto): Promise<void> {
    const usage = await this.userDatabaseService.getMealPlanUsage(dto.userId);

    if (usage.subscriptionType === 'premium') {
      return;
    }

    if (dto.days !== 7) {
      throw new ForbiddenException('Free users can generate 7-day meal plans only.');
    }

    if (usage.used >= this.freeGenerationLimit) {
      throw new ForbiddenException('Free meal plan limit reached.');
    }
  }

  private async generateWithAi(dto: GenerateMealPlanDto): Promise<AiMealPlanResponse> {
    const response = await fetch(`${this.apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: this.buildUserPrompt(dto),
          },
        ],
        temperature: 0.45,
        max_tokens: 3500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI API error ${response.status}: ${body}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Empty AI response.');
    }

    return JSON.parse(this.stripCodeFence(content)) as AiMealPlanResponse;
  }

  private getSystemPrompt(): string {
    return `You are a Cambodian meal planning assistant for students on a budget.

Return only valid JSON with this exact shape:
{
  "mealPlan": [
    {
      "day": 1,
      "meals": [
        {
          "type": "Breakfast",
          "name": "Meal name",
          "ingredients": ["ingredient"],
          "instructions": "Short practical cooking instructions.",
          "estimatedCost": 1.5,
          "missingIngredients": ["ingredient user needs to buy"]
        }
      ],
      "totalEstimatedCost": 4.5
    }
  ]
}

Rules:
- Use Cambodian or locally realistic foods and ingredients where possible.
- Keep meals affordable, student-friendly, healthy, and balanced.
- Respect the provided budget across the whole plan.
- Prefer ingredients the user already has and list only missing ingredients that need shopping.
- Use USD numbers for estimatedCost and totalEstimatedCost.
- Never include markdown or commentary outside the JSON.`;
  }

  private buildUserPrompt(dto: GenerateMealPlanDto): string {
    return `Create a meal plan using these inputs:
- Weekly or total budget: ${dto.budget}
- Available ingredients: ${dto.ingredients.length ? dto.ingredients.join(', ') : 'none listed'}
- Number of days: ${dto.days}
- Meals per day: ${dto.mealsPerDay}
- Food preference: ${dto.preference || 'none'}
- Health goal: ${dto.healthGoal || 'none'}

Use meal types in this order when possible: Breakfast, Lunch, Dinner, Snack, Extra.
Return exactly ${dto.days} days and exactly ${dto.mealsPerDay} meals for each day.`;
  }

  private validateMealPlan(mealPlan: MealPlanDay[] | undefined, dto: GenerateMealPlanDto): MealPlanDay[] {
    if (!Array.isArray(mealPlan) || mealPlan.length === 0) {
      throw new Error('AI response did not include a mealPlan array.');
    }

    return mealPlan.slice(0, dto.days).map((day, dayIndex) => {
      const meals = Array.isArray(day.meals) ? day.meals : [];
      const sanitizedMeals = meals.slice(0, dto.mealsPerDay).map((meal, mealIndex) =>
        this.sanitizeMeal(meal, mealIndex),
      );

      while (sanitizedMeals.length < dto.mealsPerDay) {
        sanitizedMeals.push(this.getFallbackMeal(dayIndex, sanitizedMeals.length, dto));
      }

      const totalEstimatedCost = sanitizedMeals.reduce(
        (sum, meal) => sum + meal.estimatedCost,
        0,
      );

      return {
        day: typeof day.day === 'number' ? day.day : dayIndex + 1,
        meals: sanitizedMeals,
        totalEstimatedCost: this.roundMoney(totalEstimatedCost),
      };
    });
  }

  private sanitizeMeal(meal: Partial<MealPlanMeal>, mealIndex: number): MealPlanMeal {
    return {
      type: meal.type || this.getMealType(mealIndex),
      name: meal.name || 'Simple Local Meal',
      ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.map(String) : [],
      instructions: meal.instructions || 'Cook ingredients together until hot and safe to eat.',
      estimatedCost: this.roundMoney(Number(meal.estimatedCost) || 0),
      missingIngredients: Array.isArray(meal.missingIngredients)
        ? meal.missingIngredients.map(String)
        : [],
    };
  }

  private buildFallbackMealPlan(dto: GenerateMealPlanDto): MealPlanDay[] {
    const plan: MealPlanDay[] = [];

    for (let dayIndex = 0; dayIndex < dto.days; dayIndex += 1) {
      const meals: MealPlanMeal[] = [];
      for (let mealIndex = 0; mealIndex < dto.mealsPerDay; mealIndex += 1) {
        meals.push(this.getFallbackMeal(dayIndex, mealIndex, dto));
      }

      plan.push({
        day: dayIndex + 1,
        meals,
        totalEstimatedCost: this.roundMoney(
          meals.reduce((sum, meal) => sum + meal.estimatedCost, 0),
        ),
      });
    }

    return plan;
  }

  private getFallbackMeal(dayIndex: number, mealIndex: number, dto: GenerateMealPlanDto): MealPlanMeal {
    const available = new Set(dto.ingredients.map((ingredient) => ingredient.toLowerCase()));
    const dailyBudget = Math.max(dto.budget / dto.days, 1);
    const mealBudget = this.roundMoney(Math.max(dailyBudget / dto.mealsPerDay, 0.5));
    const templates = this.getFallbackTemplates();
    const template = templates[(dayIndex * dto.mealsPerDay + mealIndex) % templates.length];
    const missingIngredients = template.ingredients.filter(
      (ingredient) => !available.has(ingredient.toLowerCase()),
    );

    return {
      type: this.getMealType(mealIndex),
      name: template.name,
      ingredients: template.ingredients,
      instructions: template.instructions,
      estimatedCost: mealBudget,
      missingIngredients,
    };
  }

  private getFallbackTemplates(): Array<Omit<MealPlanMeal, 'type' | 'estimatedCost' | 'missingIngredients'>> {
    return [
      {
        name: 'Rice Porridge with Egg',
        ingredients: ['rice', 'egg', 'spring onion', 'garlic', 'soy sauce'],
        instructions: 'Simmer rice with extra water until soft. Stir in garlic, top with egg and spring onion, then season lightly.',
      },
      {
        name: 'Bai Sach Chrouk Style Rice Bowl',
        ingredients: ['rice', 'pork', 'cucumber', 'pickled carrot', 'soy sauce'],
        instructions: 'Pan cook thin pork with soy sauce. Serve over rice with cucumber and pickled carrot.',
      },
      {
        name: 'Vegetable Fried Rice',
        ingredients: ['rice', 'egg', 'mixed vegetables', 'garlic', 'soy sauce'],
        instructions: 'Stir fry garlic, vegetables, egg, and cooked rice. Season with soy sauce and serve hot.',
      },
      {
        name: 'Nom Banh Chok Inspired Noodles',
        ingredients: ['rice noodles', 'fish', 'lemongrass', 'cucumber', 'greens'],
        instructions: 'Cook noodles and serve with a light fish and lemongrass broth plus fresh cucumber and greens.',
      },
      {
        name: 'Chicken Ginger Soup with Rice',
        ingredients: ['rice', 'chicken', 'ginger', 'morning glory', 'garlic'],
        instructions: 'Boil chicken with ginger and garlic. Add greens near the end and serve with rice.',
      },
      {
        name: 'Tofu Morning Glory Stir Fry',
        ingredients: ['rice', 'tofu', 'morning glory', 'garlic', 'oyster sauce'],
        instructions: 'Stir fry garlic, tofu, and morning glory quickly. Serve with steamed rice.',
      },
    ];
  }

  private getMealType(index: number): string {
    return ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Extra'][index] || `Meal ${index + 1}`;
  }

  private stripCodeFence(content: string): string {
    return content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
