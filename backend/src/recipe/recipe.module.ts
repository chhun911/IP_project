import { Module } from '@nestjs/common';
import { RecipeController } from './recipe.controller';
import { RecipeService } from './recipe.service';
import { OpenAIService } from './services/openai.service';
import { IngredientImageService } from './services/ingredient-image.service';
import { DatabaseService } from './services/database.service';
import { AiGenerationDatabaseService } from './services/ai-generation-database.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RecipeController],
  providers: [
    RecipeService,
    OpenAIService,
    IngredientImageService,
    DatabaseService,
    AiGenerationDatabaseService,
  ],
  exports: [RecipeService],
})
export class RecipeModule {}
