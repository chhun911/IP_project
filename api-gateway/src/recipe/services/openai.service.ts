import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RecipeMode, OpenAIRecipeResponse } from '../dto/recipe.dto';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  private readonly model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat';
  private readonly apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.deepseek.com';

  /**
   * Generate recipe using AI API (DeepSeek/OpenAI compatible)
   */
  async generateRecipe(
    mode: RecipeMode,
    mealName?: string,
    ingredients?: string[]
  ): Promise<OpenAIRecipeResponse> {
    if (!this.apiKey) {
      throw new BadRequestException('AI API key not configured');
    }

    const prompt = this.buildPrompt(mode, mealName, ingredients);
    
    try {
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
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error(`AI API error: ${JSON.stringify(error)}`);
        throw new BadRequestException('Failed to generate recipe from AI');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new BadRequestException('Empty response from AI');
      }

      const parsed = JSON.parse(content) as OpenAIRecipeResponse;
      return this.validateAndSanitizeRecipe(parsed);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`AI API request failed: ${error}`);
      throw new BadRequestException('Failed to communicate with AI service');
    }
  }

  /**
   * Build the system prompt for recipe generation
   */
  private getSystemPrompt(): string {
    return `You are a professional chef and culinary expert. Generate detailed, safe, and delicious recipes.

IMPORTANT RULES:
1. Always respond with valid JSON matching the exact schema provided
2. Include common-sense food safety notes in warnings (e.g., "Cook chicken to internal temperature of 165°F/74°C")
3. Never make medical claims about food benefits
4. Provide realistic cooking times and serving sizes
5. Include helpful tips for beginners
6. If ingredients might be missing or hard to find, suggest substitutions in tips
7. Keep instructions clear and numbered
8. Use standard cooking measurements (cups, tablespoons, grams, etc.)

Response JSON Schema:
{
  "title": "string - creative recipe name",
  "servings": number,
  "estimatedTimeMinutes": number,
  "ingredients": [
    {
      "name": "string - ingredient name (include preparation like 'diced' if needed)",
      "amount": "string - numeric amount",
      "unit": "string - measurement unit"
    }
  ],
  "steps": ["string - detailed cooking instruction"],
  "tips": ["string - helpful cooking tip or substitution"],
  "warnings": ["string - food safety warning or allergy note"]
}`;
  }

  /**
   * Build user prompt based on mode
   */
  private buildPrompt(mode: RecipeMode, mealName?: string, ingredients?: string[]): string {
    if (mode === RecipeMode.MEAL_NAME) {
      if (!mealName) {
        throw new BadRequestException('Meal name is required for mealName mode');
      }
      return `Create a complete recipe for: "${mealName}"

Include all necessary ingredients with precise measurements, clear step-by-step instructions, helpful tips, and any relevant food safety warnings.`;
    }

    if (mode === RecipeMode.FROM_INGREDIENTS) {
      if (!ingredients || ingredients.length === 0) {
        throw new BadRequestException('Ingredients list is required for fromIngredients mode');
      }
      return `Create a delicious recipe using these main ingredients: ${ingredients.join(', ')}

You may add common pantry staples (salt, pepper, oil, garlic, onion, etc.) if needed.
Include precise measurements for all ingredients, clear step-by-step instructions, helpful tips, and any relevant food safety warnings.
Suggest a creative name for the dish.`;
    }

    throw new BadRequestException('Invalid recipe generation mode');
  }

  /**
   * Validate and sanitize the AI response
   */
  private validateAndSanitizeRecipe(recipe: OpenAIRecipeResponse): OpenAIRecipeResponse {
    // Ensure all required fields exist with defaults
    return {
      title: recipe.title || 'Unnamed Recipe',
      servings: typeof recipe.servings === 'number' ? recipe.servings : 2,
      estimatedTimeMinutes: typeof recipe.estimatedTimeMinutes === 'number' ? recipe.estimatedTimeMinutes : 30,
      ingredients: Array.isArray(recipe.ingredients) 
        ? recipe.ingredients.map(ing => ({
            name: ing.name || 'Unknown ingredient',
            amount: String(ing.amount || ''),
            unit: ing.unit || '',
          }))
        : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      tips: Array.isArray(recipe.tips) ? recipe.tips : [],
      warnings: Array.isArray(recipe.warnings) ? recipe.warnings : [],
    };
  }
}
