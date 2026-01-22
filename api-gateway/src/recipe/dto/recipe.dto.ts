import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export enum RecipeMode {
  MEAL_NAME = 'mealName',
  FROM_INGREDIENTS = 'fromIngredients',
}

export class GenerateRecipeDto {
  @IsEnum(RecipeMode)
  mode: RecipeMode;

  @IsOptional()
  @IsString()
  mealName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];
}

export interface IngredientAttribution {
  text: string;
  link: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  imageUrl: string;
  imageSource: 'unsplash' | 'placeholder';
  attribution: IngredientAttribution;
}

export interface GeneratedRecipe {
  title: string;
  servings: number;
  estimatedTimeMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tips: string[];
  warnings: string[];
}

// OpenAI response schema (before images are added)
export interface OpenAIRecipeResponse {
  title: string;
  servings: number;
  estimatedTimeMinutes: number;
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  steps: string[];
  tips: string[];
  warnings: string[];
}
