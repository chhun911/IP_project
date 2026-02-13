import { Controller, Post, Delete, Get, Put, Body, Query, Param, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
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
   * POST /api/recipes/generate/stream
   * Stream recipe generation via SSE for real-time display
   */
  @Post('generate/stream')
  async generateRecipeStream(@Body() dto: GenerateRecipeDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      await this.recipeService.generateRecipeStream(dto, res);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  /**
   * DELETE /api/recipes/image-cache
   * Clear all cached ingredient images to force fresh fetches from Pixabay
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

  /**
   * GET /api/recipes/ingredient-alternatives?name=ketchup
   * Search alternative images for a specific ingredient (scored & ranked)
   */
  @Get('ingredient-alternatives')
  @HttpCode(HttpStatus.OK)
  async getIngredientAlternatives(
    @Query('name') ingredientName: string,
  ) {
    return this.recipeService.searchAlternativeImages(ingredientName);
  }

  /**
   * PUT /api/recipes/ingredient-image
   * User override: manually set the image for an ingredient
   */
  @Put('ingredient-image')
  @HttpCode(HttpStatus.OK)
  async overrideIngredientImage(
    @Body() body: {
      ingredientName: string;
      imageUrl: string;
      attributionText: string;
      attributionLink: string;
      generationId?: number;
      userId?: number;
    },
  ) {
    const result = await this.recipeService.overrideIngredientImage(
      body.ingredientName,
      body.imageUrl,
      body.attributionText,
      body.attributionLink,
      body.generationId,
      body.userId,
    );
    return { message: 'Image override saved', data: result };
  }

  /**
   * GET /api/recipes/history?userId=1
   * Get recipe generation history for a user
   */
  @Get('history')
  async getRecipeHistory(@Query('userId') userId: string) {
    const history = await this.recipeService.getRecipeHistory(Number(userId));
    return { success: true, history };
  }

  /**
   * GET /api/recipes/history/:id?userId=1
   * Get a single recipe generation
   */
  @Get('history/:id')
  async getRecipeById(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const record = await this.recipeService.getRecipeById(Number(id), Number(userId));
    if (!record) {
      return { success: false, message: 'Recipe not found' };
    }
    return { success: true, record };
  }

  /**
   * DELETE /api/recipes/history/:id?userId=1
   * Delete a recipe generation record
   */
  @Delete('history/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRecipeHistory(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const deleted = await this.recipeService.deleteRecipeHistory(Number(id), Number(userId));
    return { success: deleted };
  }
}
