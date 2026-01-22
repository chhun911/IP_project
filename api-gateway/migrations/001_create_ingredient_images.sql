-- Migration: Create ingredient_images table for caching Unsplash image lookups
-- Run this migration manually or let the DatabaseService auto-create on startup

CREATE TABLE IF NOT EXISTS ingredient_images (
    id SERIAL PRIMARY KEY,
    ingredient_name_normalized VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT NOT NULL,
    attribution_text VARCHAR(500) NOT NULL,
    attribution_link TEXT NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'unsplash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by normalized ingredient name
CREATE INDEX IF NOT EXISTS idx_ingredient_name 
ON ingredient_images(ingredient_name_normalized);

-- Optional: Add a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ingredient_images_updated_at ON ingredient_images;

CREATE TRIGGER update_ingredient_images_updated_at
    BEFORE UPDATE ON ingredient_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO ingredient_images (ingredient_name_normalized, image_url, attribution_text, attribution_link, source)
-- VALUES 
--     ('chicken', 'https://images.unsplash.com/photo-chicken', 'Photo by Chef on Unsplash', 'https://unsplash.com/@chef', 'unsplash'),
--     ('garlic', 'https://images.unsplash.com/photo-garlic', 'Photo by Cook on Unsplash', 'https://unsplash.com/@cook', 'unsplash');
