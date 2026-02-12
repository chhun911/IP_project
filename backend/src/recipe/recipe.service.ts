import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './services/openai.service';
import { IngredientImageService } from './services/ingredient-image.service';
import { DatabaseService } from './services/database.service';
import { GenerateRecipeDto, GeneratedRecipe } from './dto/recipe.dto';
import { SearchAlternativesResult, IngredientImageCache } from './interfaces/ingredient-image.interface';

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly ingredientImageService: IngredientImageService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Generate a complete recipe with ingredient images
   */
  async generateRecipe(dto: GenerateRecipeDto): Promise<GeneratedRecipe> {
    this.logger.log(`Generating recipe - Mode: ${dto.mode}`);

    // Step 1: Generate recipe text using OpenAI
    const recipeData = await this.openAIService.generateRecipe(
      dto.mode,
      dto.mealName,
      dto.ingredients,
    );

    this.logger.log(`Recipe generated: ${recipeData.title}`);

    // Step 2: Resolve ingredient images with scoring + caching
    const { ingredients, warnings: imageWarnings } = 
      await this.ingredientImageService.resolveIngredientImages(recipeData.ingredients);

    // Step 3: Combine results
    const result: GeneratedRecipe = {
      title: recipeData.title,
      servings: recipeData.servings,
      estimatedTimeMinutes: recipeData.estimatedTimeMinutes,
      ingredients,
      steps: recipeData.steps,
      tips: recipeData.tips,
      warnings: [...recipeData.warnings, ...imageWarnings],
    };

    this.logger.log(`Recipe complete with ${ingredients.length} ingredients`);
    return result;
  }

  /**
   * Clear all cached ingredient images
   */
  async clearImageCache(): Promise<number> {
    this.logger.log('Clearing all cached ingredient images');
    return this.databaseService.clearAllIngredientImages();
  }

  /**
   * Search alternative images for a specific ingredient (scored & ranked)
   */
  async searchAlternativeImages(ingredientName: string): Promise<SearchAlternativesResult> {
    this.logger.log(`Searching alternatives for: ${ingredientName}`);
    return this.ingredientImageService.searchAlternativeImages(ingredientName);
  }

  /**
   * User override: manually set the image for an ingredient
   */
  async overrideIngredientImage(
    ingredientName: string,
    imageUrl: string,
    attributionText: string,
    attributionLink: string,
  ): Promise<IngredientImageCache> {
    this.logger.log(`Overriding image for: ${ingredientName}`);
    return this.ingredientImageService.overrideIngredientImage(
      ingredientName,
      imageUrl,
      attributionText,
      attributionLink,
    );
  }
}
