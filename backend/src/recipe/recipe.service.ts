import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { OpenAIService } from './services/openai.service';
import { IngredientImageService } from './services/ingredient-image.service';
import { DatabaseService } from './services/database.service';
import { AiGenerationDatabaseService } from './services/ai-generation-database.service';
import { UserDatabaseService } from '../auth/services/user-database.service';
import { GenerateRecipeDto, GeneratedRecipe } from './dto/recipe.dto';
import { SearchAlternativesResult, IngredientImageCache } from './interfaces/ingredient-image.interface';

const MAX_IMAGE_GENERATIONS = 5;

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly ingredientImageService: IngredientImageService,
    private readonly databaseService: DatabaseService,
    private readonly aiGenerationDb: AiGenerationDatabaseService,
    private readonly userDatabaseService: UserDatabaseService,
  ) {}

  /**
   * Generate a complete recipe with ingredient images
   */
  async generateRecipe(dto: GenerateRecipeDto): Promise<GeneratedRecipe> {
    this.logger.log(`Generating recipe - Mode: ${dto.mode}`);

    // Enforce image generation limit if userId is provided
    if (dto.userId) {
      const currentCount = await this.userDatabaseService.getImageGenerationCount(dto.userId);
      if (currentCount >= MAX_IMAGE_GENERATIONS) {
        throw new ForbiddenException(
          `You have reached the maximum of ${MAX_IMAGE_GENERATIONS} free AI image generations. Upgrade your plan for unlimited access.`,
        );
      }
    }

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

    // Increment usage count after successful generation
    if (dto.userId) {
      const newCount = await this.userDatabaseService.incrementImageGenerationCount(dto.userId);
      this.logger.log(`User ${dto.userId} image generation count: ${newCount}/${MAX_IMAGE_GENERATIONS}`);
    }

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

    // Step 4: Save generation to DB
    const prompt = dto.mode === 'mealName' ? dto.mealName : (dto.ingredients || []).join(', ');
    const startTime = Date.now();
    try {
      await this.aiGenerationDb.recordGeneration({
        userId: dto.userId,
        generationType: 'recipe',
        prompt: prompt || '',
        result,
        model: process.env.OPENAI_MODEL || 'deepseek-chat',
        durationMs: Date.now() - startTime,
        status: 'success',
      });
    } catch (err) {
      this.logger.warn('Failed to save generation record', err);
    }

    this.logger.log(`Recipe complete with ${ingredients.length} ingredients`);
    return result;
  }

  /**
   * Get recipe generation history for a user
   */
  async getRecipeHistory(userId: number) {
    return this.aiGenerationDb.getGenerationsByUser(userId, 'recipe');
  }

  /**
   * Get a single recipe generation by ID
   */
  async getRecipeById(id: number, userId: number) {
    return this.aiGenerationDb.getGenerationById(id, userId);
  }

  /**
   * Delete a recipe generation record
   */
  async deleteRecipeHistory(id: number, userId: number) {
    return this.aiGenerationDb.deleteGeneration(id, userId);
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

  /**
   * Stream recipe generation via SSE.
   * Phase 1: Stream raw recipe JSON tokens for instant display.
   * Phase 2: Resolve ingredient images and send final enriched recipe.
   */
  async generateRecipeStream(dto: GenerateRecipeDto, res: Response): Promise<void> {
    this.logger.log(`Streaming recipe - Mode: ${dto.mode}`);

    // Enforce image generation limit
    if (dto.userId) {
      const currentCount = await this.userDatabaseService.getImageGenerationCount(dto.userId);
      if (currentCount >= MAX_IMAGE_GENERATIONS) {
        throw new ForbiddenException(
          `You have reached the maximum of ${MAX_IMAGE_GENERATIONS} free AI image generations.`,
        );
      }
    }

    // Phase 1: Stream recipe text from DeepSeek
    let fullJson = '';
    const startTime = Date.now();

    for await (const chunk of this.openAIService.generateRecipeStream(dto.mode, dto.mealName, dto.ingredients)) {
      fullJson += chunk;
      // Send progress events (not raw tokens) so frontend can show status
      res.write(`data: ${JSON.stringify({ type: 'progress', length: fullJson.length })}\n\n`);
    }

    // Phase 2: Strip markdown code fences if present, then parse JSON
    let cleanJson = fullJson.trim();
    // Remove ```json ... ``` wrapping
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Fetching ingredient images...' })}\n\n`);

    try {
      const recipeData = JSON.parse(cleanJson);
      const validated = {
        title: recipeData.title || 'Unnamed Recipe',
        servings: typeof recipeData.servings === 'number' ? recipeData.servings : 2,
        estimatedTimeMinutes: typeof recipeData.estimatedTimeMinutes === 'number' ? recipeData.estimatedTimeMinutes : 30,
        ingredients: Array.isArray(recipeData.ingredients)
          ? recipeData.ingredients.map((ing: any) => ({
              name: ing.name || 'Unknown ingredient',
              amount: String(ing.amount || ''),
              unit: ing.unit || '',
            }))
          : [],
        steps: Array.isArray(recipeData.steps) ? recipeData.steps : [],
        tips: Array.isArray(recipeData.tips) ? recipeData.tips : [],
        warnings: Array.isArray(recipeData.warnings) ? recipeData.warnings : [],
      };

      // Resolve images
      const { ingredients, warnings: imageWarnings } =
        await this.ingredientImageService.resolveIngredientImages(validated.ingredients);

      // Increment usage
      if (dto.userId) {
        await this.userDatabaseService.incrementImageGenerationCount(dto.userId);
      }

      const result: GeneratedRecipe = {
        title: validated.title,
        servings: validated.servings,
        estimatedTimeMinutes: validated.estimatedTimeMinutes,
        ingredients,
        steps: validated.steps,
        tips: validated.tips,
        warnings: [...validated.warnings, ...imageWarnings],
      };

      // Save to DB
      const prompt = dto.mode === 'mealName' ? dto.mealName : (dto.ingredients || []).join(', ');
      try {
        await this.aiGenerationDb.recordGeneration({
          userId: dto.userId,
          generationType: 'recipe',
          prompt: prompt || '',
          result,
          model: process.env.OPENAI_MODEL || 'deepseek-chat',
          durationMs: Date.now() - startTime,
          status: 'success',
        });
      } catch (err) {
        this.logger.warn('Failed to save generation record', err);
      }

      // Send final enriched recipe
      res.write(`data: ${JSON.stringify({ type: 'recipe', data: result })}\n\n`);
    } catch (parseErr) {
      this.logger.error('Failed to parse streamed recipe JSON', parseErr);
      throw new Error('Failed to parse recipe response from AI');
    }
  }
}
