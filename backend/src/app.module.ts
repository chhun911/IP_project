import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { OrderModule } from './order/order.module';
import { RecipeModule } from './recipe/recipe.module';
import { MealPlanModule } from './meal-plan/meal-plan.module';

@Module({
  imports: [AuthModule, ChatModule, OrderModule, RecipeModule, MealPlanModule],
})
export class AppModule {}
