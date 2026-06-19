import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateMealPlanDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  budget: number;

  @IsArray()
  @IsString({ each: true })
  ingredients: string[];

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(14)
  days: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  mealsPerDay: number;

  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  preference?: string;

  @IsOptional()
  @IsString()
  healthGoal?: string;
}

export interface MealPlanMeal {
  type: string;
  name: string;
  ingredients: string[];
  instructions: string;
  estimatedCost: number;
  missingIngredients: string[];
}

export interface MealPlanDay {
  day: number;
  meals: MealPlanMeal[];
  totalEstimatedCost: number;
}

export interface GenerateMealPlanResponse {
  success: true;
  mealPlan: MealPlanDay[];
}
