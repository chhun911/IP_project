import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { GenerateMealPlanDto, GenerateMealPlanResponse } from './dto/meal-plan.dto';
import { MealPlanService } from './meal-plan.service';

@Controller('meal-plans')
export class MealPlanController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateMealPlan(
    @Body() dto: GenerateMealPlanDto,
  ): Promise<GenerateMealPlanResponse> {
    const mealPlan = await this.mealPlanService.generateMealPlan(dto);
    return {
      success: true,
      mealPlan,
    };
  }
}
