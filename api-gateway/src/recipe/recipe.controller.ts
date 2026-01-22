import { Controller, Post, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { GenerateRecipeDto, GeneratedRecipe } from './dto/recipe.dto';

@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  /**
   * POST /api/recipes/generate
   * Generate a recipe with ingredient images
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateRecipe(@Body() dto: GenerateRecipeDto): Promise<GeneratedRecipe> {
    return this.recipeService.generateRecipe(dto);
  }

  /**
   * DELETE /api/recipes/image-cache
   * Clear all cached ingredient images to force fresh fetches from Unsplash
   */
  @Delete('image-cache')
  @HttpCode(HttpStatus.OK)
  async clearImageCache(): Promise<{ message: string; clearedCount: number }> {
    const clearedCount = await this.recipeService.clearImageCache();
    return {
      message: `Cleared ${clearedCount} cached ingredient images`,
      clearedCount,
    };
  }
}
