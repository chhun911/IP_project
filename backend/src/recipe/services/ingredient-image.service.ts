import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import {
  IngredientImageCache,
  UnsplashSearchResponse,
} from '../interfaces/ingredient-image.interface';
import { RecipeIngredient, IngredientAttribution } from '../dto/recipe.dto';

@Injectable()
export class IngredientImageService {
  private readonly logger = new Logger(IngredientImageService.name);
  private readonly unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  // Rate limiting: Unsplash free tier = 50 requests/hour
  private requestCount = 0;
  private requestWindowStart = Date.now();
  private readonly maxRequestsPerHour = 50;

  // Simple descriptors to remove from ingredient names for cleaner searches
  private readonly descriptorsToRemove = [
    'organic',
    'optional',
    'for garnish',
    'to taste',
    'as needed',
    'large',
    'medium',
    'small',
    'boneless',
    'skinless',
    'peeled',
    'finely',
    'coarsely',
    'roughly',
    'thinly',
    'thickly',
    'fresh',
    'dried',
    'chopped',
    'minced',
    'diced',
    'sliced',
  ];

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Clean and normalize ingredient name for caching and searching
   */
  private cleanIngredientName(name: string): string {
    let cleaned = name.toLowerCase().trim();
    
    // Remove parenthetical content
    cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
    
    // Remove descriptors
    for (const descriptor of this.descriptorsToRemove) {
      cleaned = cleaned.replace(new RegExp(`\\b${descriptor}\\b`, 'gi'), ' ');
    }
    
    // Clean up whitespace and special characters
    cleaned = cleaned
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  }

  /**
   * Extract the core ingredient name for simple Unsplash search
   * This extracts just the main ingredient word(s) for accurate image results
   */
  private getSearchQuery(ingredientName: string): string {
    const cleaned = this.cleanIngredientName(ingredientName);
    
    // Simple direct mappings for common ingredients to get exact food images
    const searchMappings: Record<string, string> = {
      'ground beef': 'raw ground beef meat',
      'beef': 'raw beef meat',
      'salt': 'salt seasoning',
      'black pepper': 'black pepper spice',
      'pepper': 'black pepper spice',
      'burger buns': 'hamburger buns bread',
      'buns': 'hamburger buns bread',
      'lettuce leaves': 'fresh lettuce leaves',
      'lettuce': 'fresh lettuce',
      'tomato slices': 'sliced tomatoes',
      'tomato': 'fresh tomatoes',
      'red onion slices': 'red onion slices',
      'red onion': 'red onion vegetable',
      'onion': 'onion vegetable',
      'pickle slices': 'pickle slices',
      'pickles': 'dill pickles',
      'american cheese slices': 'american cheese slices',
      'american cheese': 'american cheese',
      'cheese slices': 'cheese slices',
      'cheese': 'cheese',
      'mayonnaise': 'mayonnaise jar',
      'mayo': 'mayonnaise jar',
      'ketchup': 'ketchup bottle',
      'yellow mustard': 'yellow mustard bottle',
      'mustard': 'mustard bottle',
      'relish': 'pickle relish jar',
      'vegetable oil': 'vegetable oil bottle',
      'olive oil': 'olive oil bottle',
      'oil': 'cooking oil bottle',
      'garlic': 'fresh garlic',
      'ginger': 'fresh ginger root',
      'butter': 'butter block',
      'milk': 'glass of milk',
      'cream': 'heavy cream',
      'egg': 'chicken eggs',
      'eggs': 'chicken eggs',
      'flour': 'all purpose flour',
      'sugar': 'white sugar',
      'brown sugar': 'brown sugar',
      'honey': 'honey jar',
      'soy sauce': 'soy sauce bottle',
      'vinegar': 'vinegar bottle',
      'chicken': 'raw chicken meat',
      'pork': 'raw pork meat',
      'bacon': 'bacon strips',
      'rice': 'white rice grains',
      'pasta': 'dry pasta',
      'noodles': 'noodles',
      'carrot': 'fresh carrots',
      'carrots': 'fresh carrots',
      'potato': 'fresh potatoes',
      'potatoes': 'fresh potatoes',
      'celery': 'celery stalks',
      'broccoli': 'fresh broccoli',
      'spinach': 'fresh spinach',
      'mushroom': 'fresh mushrooms',
      'mushrooms': 'fresh mushrooms',
      'lemon': 'fresh lemons',
      'lime': 'fresh limes',
      'parsley': 'fresh parsley',
      'basil': 'fresh basil',
      'cilantro': 'fresh cilantro',
      'oregano': 'dried oregano',
      'thyme': 'fresh thyme',
      'rosemary': 'fresh rosemary',
      'cumin': 'cumin spice',
      'paprika': 'paprika spice',
      'cinnamon': 'cinnamon sticks',
      'vanilla': 'vanilla extract',
    };
    
    // Check if we have a direct mapping
    if (searchMappings[cleaned]) {
      return searchMappings[cleaned];
    }
    
    // Check for partial matches (e.g., "ground beef 80/20" should match "ground beef")
    for (const [key, value] of Object.entries(searchMappings)) {
      if (cleaned.includes(key)) {
        return value;
      }
    }
    
    // Default: use the cleaned ingredient name + "food ingredient" for better results
    return `${cleaned} food ingredient`;
  }

  /**
   * Normalize ingredient name for caching (consistent key)
   */
  normalizeIngredientName(name: string): string {
    return this.cleanIngredientName(name);
  }

  /**
   * Check if we're within rate limits
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    if (now - this.requestWindowStart > hourInMs) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }
    
    return this.requestCount < this.maxRequestsPerHour;
  }

  /**
   * Check if cached entry is valid
   */
  private isValidUnsplashCache(cached: IngredientImageCache): boolean {
    return cached.source === 'unsplash' && Boolean(cached.image_url);
  }

  /**
   * Fetch image from Unsplash API - SIMPLE approach: just search by ingredient name
   * and take the first relevant result
   */
  private async fetchFromUnsplash(originalName: string, normalizedName: string): Promise<IngredientImageCache | null> {
    if (!this.unsplashAccessKey) {
      this.logger.warn('Unsplash API key not configured');
      return null;
    }

    if (!this.canMakeRequest()) {
      this.logger.warn('Unsplash rate limit reached');
      return null;
    }

    try {
      // Get a clean, simple search query based on the ingredient name
      const searchQuery = this.getSearchQuery(originalName);
      this.logger.debug(`Searching Unsplash for "${originalName}" with query: "${searchQuery}"`);
      
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=5&content_filter=high`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${this.unsplashAccessKey}`,
        },
      });

      this.requestCount++;

      if (!response.ok) {
        this.logger.error(`Unsplash API error: ${response.status}`);
        return null;
      }

      const data: UnsplashSearchResponse = await response.json();

      if (data.results.length === 0) {
        this.logger.debug(`No Unsplash results for: ${originalName}`);
        return null;
      }

      // Simply take the first result - Unsplash's search is good enough
      // when we provide a clear ingredient-focused query
      const bestPhoto = data.results[0];
      
      return {
        ingredient_name_normalized: normalizedName,
        image_url: bestPhoto.urls.small,
        attribution_text: `Photo by ${bestPhoto.user.name} on Unsplash`,
        attribution_link: `${bestPhoto.user.links.html}?utm_source=aicookbook&utm_medium=referral`,
        source: 'unsplash',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch from Unsplash: ${error}`);
      return null;
    }
  }

  /**
   * Resolve image for a single ingredient (Unsplash only)
   */
  async resolveIngredientImage(
    ingredientName: string
  ): Promise<{ imageUrl: string; attribution: IngredientAttribution; source: 'unsplash' | 'placeholder' }> {
    const normalizedName = this.normalizeIngredientName(ingredientName);

    // Check cache first
    const cached = await this.databaseService.getIngredientImage(normalizedName);
    if (cached && this.isValidUnsplashCache(cached)) {
      this.logger.debug(`Cache hit for: ${normalizedName}`);
      return {
        imageUrl: cached.image_url,
        attribution: {
          text: cached.attribution_text,
          link: cached.attribution_link,
        },
        source: cached.source as 'unsplash' | 'placeholder',
      };
    }
    if (cached) {
      await this.databaseService.deleteIngredientImage(normalizedName);
    }

    // Fetch from Unsplash - use ORIGINAL name for better pattern matching
    const unsplashResult = await this.fetchFromUnsplash(ingredientName, normalizedName);
    
    if (unsplashResult) {
      // Save to cache
      await this.databaseService.saveIngredientImage(unsplashResult);
      return {
        imageUrl: unsplashResult.image_url,
        attribution: {
          text: unsplashResult.attribution_text,
          link: unsplashResult.attribution_link,
        },
        source: 'unsplash',
      };
    }

    // No match found; return empty image so UI can show "No image"
    return {
      imageUrl: '',
      attribution: {
        text: 'No image available',
        link: '#',
      },
      source: 'placeholder',
    };
  }

  /**
   * Resolve images for multiple ingredients in batch (optimized)
   */
  async resolveIngredientImages(
    ingredients: Array<{ name: string; amount: string; unit: string }>
  ): Promise<{ ingredients: RecipeIngredient[]; warnings: string[] }> {
    const warnings: string[] = [];
    const normalizedNames = ingredients.map((ing) =>
      this.normalizeIngredientName(ing.name)
    );

    // Batch fetch from cache
    const cachedImages = await this.databaseService.getMultipleIngredientImages(normalizedNames);

    const results: RecipeIngredient[] = [];

    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i];
      const normalizedName = normalizedNames[i];
      const cached = cachedImages.get(normalizedName);

      if (cached && this.isValidUnsplashCache(cached)) {
        results.push({
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          imageUrl: cached.image_url,
          imageSource: cached.source as 'unsplash' | 'placeholder',
          attribution: {
            text: cached.attribution_text,
            link: cached.attribution_link,
          },
        });
      } else {
        if (cached) {
          await this.databaseService.deleteIngredientImage(normalizedName);
        }
        // Need to fetch from Unsplash
        const resolved = await this.resolveIngredientImage(ingredient.name);
        
        if (resolved.source === 'placeholder') {
          warnings.push(`Could not find image for "${ingredient.name}"`);
        }

        results.push({
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          imageUrl: resolved.imageUrl,
          imageSource: resolved.source,
          attribution: resolved.attribution,
        });
      }
    }

    return { ingredients: results, warnings };
  }
}
