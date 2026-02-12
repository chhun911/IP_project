export interface IngredientImageCache {
  id?: number;
  ingredient_name_normalized: string;
  image_url: string;
  attribution_text: string;
  attribution_link: string;
  source: 'pixabay' | 'placeholder' | 'user_override';
  is_user_override?: boolean;
  pixabay_id?: number;
  score?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface PixabayHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface PixabaySearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayHit[];
}

/**
 * Scored Pixabay hit with relevance score
 */
export interface ScoredPixabayHit {
  hit: PixabayHit;
  score: number;
  reasons: string[];
}

/**
 * Ingredient dictionary entry for disambiguation
 */
export interface IngredientDictionaryEntry {
  searchQuery: string;
  objectType?: 'bottle' | 'jar' | 'bowl' | 'container' | 'raw' | 'powder' | 'whole';
  preferredTags?: string[];
  bannedTags?: string[];
}

/**
 * Configuration for image scoring
 */
export interface ImageScoringConfig {
  sceneIndicators: string[];
  isolatedIndicators: string[];
  genericBannedWords: string[];
  negativeKeywords: string[];
  photoStyleKeywords: string[];
}

/**
 * Candidate image for user to pick from
 */
export interface ImageCandidate {
  pixabayId: number;
  imageUrl: string;
  previewUrl: string;
  tags: string;
  score: number;
  attributionText: string;
  attributionLink: string;
}

/**
 * Result of searching for alternative images
 */
export interface SearchAlternativesResult {
  ingredientName: string;
  alternatives: ImageCandidate[];
}
