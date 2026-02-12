import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import {
  IngredientImageCache,
  PixabayHit,
  PixabaySearchResponse,
  ScoredPixabayHit,
  SearchAlternativesResult,
} from '../interfaces/ingredient-image.interface';
import { RecipeIngredient, IngredientAttribution } from '../dto/recipe.dto';

@Injectable()
export class IngredientImageService {
  private readonly logger = new Logger(IngredientImageService.name);
  private readonly pixabayApiKey = process.env.PIXABAY_API_KEY;
  
  // Rate limiting
  private requestCount = 0;
  private requestWindowStart = Date.now();
  private readonly maxRequestsPerHour = 4000;

  // ─── Descriptors to remove for normalization ─────────────────────────
  private readonly descriptorsToRemove = [
    'organic', 'optional', 'for garnish', 'to taste', 'as needed',
    'large', 'medium', 'small', 'boneless', 'skinless', 'peeled',
    'finely', 'coarsely', 'roughly', 'thinly', 'thickly',
    'chopped', 'minced', 'diced', 'sliced',
    'washed', 'rinsed', 'trimmed', 'crushed', 'grated', 'shredded',
    'lean', 'fat', 'ratio',
  ];

  // ─── Simple synonym map for common abbreviations ──────────────────
  private readonly synonymDictionary: Record<string, string> = {
    'mayo': 'mayonnaise',
    'catsup': 'ketchup',
    'bbq sauce': 'barbecue sauce',
    'scallion': 'green onion',
    'buns': 'hamburger buns',
    'burger buns': 'hamburger buns',
  };

  constructor(private readonly databaseService: DatabaseService) {}

  // ═════════════════════════════════════════════════════════════════════
  // NORMALIZATION
  // ═════════════════════════════════════════════════════════════════════

  private cleanIngredientName(name: string): string {
    let cleaned = name.toLowerCase().trim();
    cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
    for (const descriptor of this.descriptorsToRemove) {
      cleaned = cleaned.replace(new RegExp(`\\b${descriptor}\\b`, 'gi'), ' ');
    }
    cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  normalizeIngredientName(name: string): string {
    return this.cleanIngredientName(name);
  }

  // ═════════════════════════════════════════════════════════════════════
  // QUERY BUILDER — just use the ingredient name directly
  // ═════════════════════════════════════════════════════════════════════

  private buildSearchQuery(ingredientName: string): string {
    const cleaned = this.cleanIngredientName(ingredientName);

    // Only resolve simple abbreviations/synonyms
    if (this.synonymDictionary[cleaned]) {
      return this.synonymDictionary[cleaned];
    }

    // Add "food" so Pixabay returns the ingredient, not unrelated matches
    // e.g. "yellow mustard" → "yellow mustard food" (condiment, not plant)
    return `${cleaned} food`;
  }

  // ═════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ═════════════════════════════════════════════════════════════════════

  private canMakeRequest(): boolean {
    const now = Date.now();
    if (now - this.requestWindowStart > 3600000) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }
    return this.requestCount < this.maxRequestsPerHour;
  }

  private isValidCache(cached: IngredientImageCache): boolean {
    return (cached.source === 'pixabay' || cached.source === 'user_override') && Boolean(cached.image_url);
  }

  // ═════════════════════════════════════════════════════════════════════
  // FETCH FROM PIXABAY — simple search, trust Pixabay's relevance
  // ═════════════════════════════════════════════════════════════════════

  private async fetchAndScoreFromPixabay(
    originalName: string,
    normalizedName: string,
  ): Promise<{ best: IngredientImageCache | null; allScored: ScoredPixabayHit[] }> {
    if (!this.pixabayApiKey) {
      this.logger.warn('Pixabay API key not configured');
      return { best: null, allScored: [] };
    }
    if (!this.canMakeRequest()) {
      this.logger.warn('Pixabay rate limit reached');
      return { best: null, allScored: [] };
    }

    try {
      const searchQuery = this.buildSearchQuery(originalName);
      this.logger.debug(`Searching Pixabay for "${originalName}" → query: "${searchQuery}"`);

      // Simple search — just the ingredient name, no extra filters that confuse results
      const url = `https://pixabay.com/api/?key=${this.pixabayApiKey}&q=${encodeURIComponent(searchQuery)}&image_type=photo&per_page=20&safesearch=true`;

      const response = await fetch(url);
      this.requestCount++;

      if (!response.ok) {
        if (response.status === 429) {
          this.logger.error('Pixabay API rate limit exceeded');
        } else {
          this.logger.error(`Pixabay API error: ${response.status}`);
        }
        return { best: null, allScored: [] };
      }

      const data: PixabaySearchResponse = await response.json();

      if (data.hits.length === 0) {
        this.logger.debug(`No Pixabay results for: ${originalName}`);
        return { best: null, allScored: [] };
      }

      // Trust Pixabay's relevance ordering — just assign position-based scores
      const scored: ScoredPixabayHit[] = data.hits.map((hit, index) => ({
        hit,
        score: data.hits.length - index, // first result = highest score
        reasons: [`Position ${index + 1} in Pixabay results`],
      }));

      // Pick the first result (most relevant according to Pixabay)
      const bestPhoto = data.hits[0];

      const best: IngredientImageCache = {
        ingredient_name_normalized: normalizedName,
        image_url: bestPhoto.webformatURL,
        attribution_text: `Photo by ${bestPhoto.user} on Pixabay`,
        attribution_link: bestPhoto.pageURL,
        source: 'pixabay',
        pixabay_id: bestPhoto.id,
        score: scored[0].score,
      };

      return { best, allScored: scored };
    } catch (error) {
      this.logger.error(`Failed to fetch from Pixabay: ${error}`);
      return { best: null, allScored: [] };
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RESOLVE SINGLE INGREDIENT IMAGE
  // ═════════════════════════════════════════════════════════════════════

  async resolveIngredientImage(
    ingredientName: string,
  ): Promise<{ imageUrl: string; attribution: IngredientAttribution; source: 'pixabay' | 'placeholder' | 'user_override' }> {
    const normalizedName = this.normalizeIngredientName(ingredientName);

    // (6) Check cache first — user overrides are always valid
    const cached = await this.databaseService.getIngredientImage(normalizedName);
    if (cached && this.isValidCache(cached)) {
      this.logger.debug(`Cache hit for: ${normalizedName} (source: ${cached.source})`);
      return {
        imageUrl: cached.image_url,
        attribution: { text: cached.attribution_text, link: cached.attribution_link },
        source: cached.source as 'pixabay' | 'placeholder' | 'user_override',
      };
    }
    if (cached) {
      await this.databaseService.deleteIngredientImage(normalizedName);
    }

    // Fetch + score from Pixabay
    const { best } = await this.fetchAndScoreFromPixabay(ingredientName, normalizedName);

    if (best) {
      // (6) Cache in Postgres
      await this.databaseService.saveIngredientImage(best);
      return {
        imageUrl: best.image_url,
        attribution: { text: best.attribution_text, link: best.attribution_link },
        source: 'pixabay',
      };
    }

    return {
      imageUrl: '',
      attribution: { text: 'No image available', link: '#' },
      source: 'placeholder',
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // RESOLVE MULTIPLE INGREDIENT IMAGES (batch)
  // ═════════════════════════════════════════════════════════════════════

  async resolveIngredientImages(
    ingredients: Array<{ name: string; amount: string; unit: string }>,
  ): Promise<{ ingredients: RecipeIngredient[]; warnings: string[] }> {
    const warnings: string[] = [];
    const normalizedNames = ingredients.map(ing => this.normalizeIngredientName(ing.name));

    // Batch fetch from cache
    const cachedImages = await this.databaseService.getMultipleIngredientImages(normalizedNames);
    const results: RecipeIngredient[] = [];

    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i];
      const normalizedName = normalizedNames[i];
      const cached = cachedImages.get(normalizedName);

      if (cached && this.isValidCache(cached)) {
        results.push({
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          imageUrl: cached.image_url,
          imageSource: cached.source as 'pixabay' | 'placeholder' | 'user_override',
          attribution: { text: cached.attribution_text, link: cached.attribution_link },
        });
      } else {
        if (cached) {
          await this.databaseService.deleteIngredientImage(normalizedName);
        }
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

  // ═════════════════════════════════════════════════════════════════════
  // (6) USER OVERRIDE — manually set an image for an ingredient
  // ═════════════════════════════════════════════════════════════════════

  async overrideIngredientImage(
    ingredientName: string,
    imageUrl: string,
    attributionText: string,
    attributionLink: string,
  ): Promise<IngredientImageCache> {
    const normalizedName = this.normalizeIngredientName(ingredientName);

    const data: IngredientImageCache = {
      ingredient_name_normalized: normalizedName,
      image_url: imageUrl,
      attribution_text: attributionText,
      attribution_link: attributionLink,
      source: 'user_override',
      is_user_override: true,
    };

    await this.databaseService.saveIngredientImage(data);
    this.logger.log(`User override saved for: ${normalizedName}`);
    return data;
  }

  // ═════════════════════════════════════════════════════════════════════
  // (6) SEARCH ALTERNATIVES — let user pick from scored candidates
  // ═════════════════════════════════════════════════════════════════════

  async searchAlternativeImages(ingredientName: string): Promise<SearchAlternativesResult> {
    const normalizedName = this.normalizeIngredientName(ingredientName);
    const { allScored } = await this.fetchAndScoreFromPixabay(ingredientName, normalizedName);

    // Return top 12 alternatives for user to choose from
    const alternatives = allScored.slice(0, 12).map(scored => ({
      imageUrl: scored.hit.webformatURL,
      previewUrl: scored.hit.previewURL,
      attributionText: `Photo by ${scored.hit.user} on Pixabay`,
      attributionLink: scored.hit.pageURL,
      score: scored.score,
      tags: scored.hit.tags,
      pixabayId: scored.hit.id,
    }));

    return { ingredientName: normalizedName, alternatives };
  }
}
