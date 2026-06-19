import { Module } from '@nestjs/common';
import { MealPlanController } from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MealPlanController],
  providers: [MealPlanService],
  exports: [MealPlanService],
})
export class MealPlanModule {}
