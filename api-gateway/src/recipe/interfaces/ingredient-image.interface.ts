export interface IngredientImageCache {
  id?: number;
  ingredient_name_normalized: string;
  image_url: string;
  attribution_text: string;
  attribution_link: string;
  source: 'unsplash' | 'placeholder';
  created_at?: Date;
  updated_at?: Date;
}

export interface UnsplashSearchResult {
  id: string;
  description?: string | null;
  alt_description?: string | null;
  tags?: Array<{ title: string }>;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashSearchResult[];
}
