import { Injectable, Logger } from '@nestjs/common';
import {
  PixabayHit,
  ScoredPixabayHit,
} from '../interfaces/ingredient-image.interface';
import {
  INGREDIENT_DICTIONARY,
  IMAGE_SCORING_CONFIG,
  SCORE_WEIGHTS,
} from '../config/ingredient-image.config';

@Injectable()
export class ImageScoringService {
  private readonly logger = new Logger(ImageScoringService.name);

  /**
   * Normalize ingredient name for lookups
   */
  normalizeForLookup(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get the best search query for an ingredient using dictionary or fallback
   */
  getOptimizedSearchQuery(ingredientName: string): {
    query: string;
    preferredTags: string[];
    bannedTags: string[];
  } {
    const normalized = this.normalizeForLookup(ingredientName);

    // Check exact match in dictionary
    if (INGREDIENT_DICTIONARY[normalized]) {
      const entry = INGREDIENT_DICTIONARY[normalized];
      return {
        query: this.buildSearchQuery(entry.searchQuery),
        preferredTags: entry.preferredTags || [],
        bannedTags: entry.bannedTags || [],
      };
    }

    // Check partial matches (e.g., "ground beef 80/20" should match "ground beef")
    for (const [key, entry] of Object.entries(INGREDIENT_DICTIONARY)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return {
          query: this.buildSearchQuery(entry.searchQuery),
          preferredTags: entry.preferredTags || [],
          bannedTags: entry.bannedTags || [],
        };
      }
    }

    // Fallback: build a generic query with disambiguation
    const genericQuery = this.buildGenericQuery(normalized);
    return {
      query: this.buildSearchQuery(genericQuery),
      preferredTags: [],
      bannedTags: [],
    };
  }

  /**
   * Build a search query with photo style keywords and negative keywords
   */
  private buildSearchQuery(baseQuery: string): string {
    const styleKeyword = IMAGE_SCORING_CONFIG.photoStyleKeywords[0]; // "isolated"
    return `${baseQuery} ${styleKeyword}`;
  }

  /**
   * Build a generic query for unknown ingredients
   */
  private buildGenericQuery(ingredientName: string): string {
    // Add "ingredient" or "food" to help Pixabay understand context
    const words = ingredientName.split(' ');
    
    // If it's a single word, add context
    if (words.length === 1) {
      return `${ingredientName} food ingredient`;
    }
    
    return `${ingredientName} ingredient`;
  }

  /**
   * Score a list of Pixabay hits for an ingredient
   * Returns sorted array with best matches first
   */
  scoreAndRankImages(
    hits: PixabayHit[],
    ingredientName: string,
    preferredTags: string[],
    bannedTags: string[]
  ): ScoredPixabayHit[] {
    const normalized = this.normalizeForLookup(ingredientName);
    const ingredientKeywords = this.extractKeywords(normalized);

    // Combine ingredient-specific banned tags with generic ones
    const allBannedWords = [
      ...bannedTags,
      ...IMAGE_SCORING_CONFIG.genericBannedWords,
    ];

    const scoredHits: ScoredPixabayHit[] = hits.map((hit) => {
      const { score, reasons } = this.calculateScore(
        hit,
        ingredientKeywords,
        preferredTags,
        allBannedWords
      );
      return { hit, score, reasons };
    });

    // Sort by score descending
    scoredHits.sort((a, b) => b.score - a.score);

    return scoredHits;
  }

  /**
   * Extract keywords from ingredient name
   */
  private extractKeywords(ingredientName: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'for', 'to', 'with',
    ]);
    
    return ingredientName
      .split(' ')
      .filter((word) => word.length > 1 && !stopWords.has(word));
  }

  /**
   * Calculate score for a single image hit
   */
  private calculateScore(
    hit: PixabayHit,
    ingredientKeywords: string[],
    preferredTags: string[],
    bannedWords: string[]
  ): { score: number; reasons: string[] } {
    const tags = hit.tags.toLowerCase();
    const tagList = tags.split(',').map((t) => t.trim());
    const reasons: string[] = [];

    let tagMatch = 0;
    let bannedWordPenalty = 0;
    let preferredBonus = 0;
    let scenePhotoPenalty = 0;

    // Score: ingredient keyword matches in tags
    for (const keyword of ingredientKeywords) {
      if (tags.includes(keyword)) {
        tagMatch += SCORE_WEIGHTS.TAG_KEYWORD_MATCH;
        reasons.push(`+${SCORE_WEIGHTS.TAG_KEYWORD_MATCH} tag keyword: "${keyword}"`);
      }
      // Exact tag match bonus
      if (tagList.includes(keyword)) {
        tagMatch += SCORE_WEIGHTS.EXACT_MATCH_BONUS;
        reasons.push(`+${SCORE_WEIGHTS.EXACT_MATCH_BONUS} exact tag: "${keyword}"`);
      }
    }

    // Score: preferred tags bonus
    for (const preferred of preferredTags) {
      if (tags.includes(preferred.toLowerCase())) {
        preferredBonus += SCORE_WEIGHTS.TAG_MATCH;
        reasons.push(`+${SCORE_WEIGHTS.TAG_MATCH} preferred: "${preferred}"`);
      }
    }

    // Penalty: banned words
    for (const banned of bannedWords) {
      if (tags.includes(banned.toLowerCase())) {
        bannedWordPenalty += SCORE_WEIGHTS.BANNED_WORD_PENALTY;
        reasons.push(`${SCORE_WEIGHTS.BANNED_WORD_PENALTY} banned: "${banned}"`);
      }
    }

    // Penalty: scene indicators
    for (const scene of IMAGE_SCORING_CONFIG.sceneIndicators) {
      if (tags.includes(scene.toLowerCase())) {
        scenePhotoPenalty += SCORE_WEIGHTS.SCENE_INDICATOR_PENALTY;
        reasons.push(`${SCORE_WEIGHTS.SCENE_INDICATOR_PENALTY} scene: "${scene}"`);
      }
    }

    // Bonus: isolated indicators
    for (const isolated of IMAGE_SCORING_CONFIG.isolatedIndicators) {
      if (tags.includes(isolated.toLowerCase())) {
        preferredBonus += SCORE_WEIGHTS.ISOLATED_INDICATOR_BONUS;
        reasons.push(`+${SCORE_WEIGHTS.ISOLATED_INDICATOR_BONUS} isolated: "${isolated}"`);
      }
    }

    // Small popularity bonus (normalized)
    const popularityScore = this.calculatePopularityBonus(hit);
    if (popularityScore > 0) {
      preferredBonus += popularityScore;
      reasons.push(`+${popularityScore} popularity`);
    }

    const totalScore = tagMatch + preferredBonus + bannedWordPenalty + scenePhotoPenalty;

    return {
      score: totalScore,
      reasons,
    };
  }

  /**
   * Calculate a small popularity bonus based on likes and downloads
   * Returns 0-2 points
   */
  private calculatePopularityBonus(hit: PixabayHit): number {
    // Normalize based on typical ranges
    const likeScore = Math.min(hit.likes / 500, 1);
    const downloadScore = Math.min(hit.downloads / 1000, 1);
    
    return Math.round((likeScore + downloadScore) * SCORE_WEIGHTS.POPULARITY_BONUS_MAX) / 2;
  }

  /**
   * Log scoring details for debugging
   */
  logScoringDetails(
    ingredientName: string,
    topHits: ScoredPixabayHit[],
    count: number = 5
  ): void {
    this.logger.debug(`Scoring results for "${ingredientName}":`);
    topHits.slice(0, count).forEach((scored, i) => {
      this.logger.debug(
        `  ${i + 1}. Score: ${scored.score} | Tags: ${scored.hit.tags.substring(0, 60)}... | ` +
        `Reasons: ${scored.reasons.slice(0, 4).join(', ')}`
      );
    });
  }
}
