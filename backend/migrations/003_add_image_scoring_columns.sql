-- Migration: Add scoring/override columns to ingredient_images
-- These columns support the improved image accuracy pipeline:
--   pixabay_id    – tracks which Pixabay image was selected
--   score         – relevance score from the scoring algorithm
--   is_user_override – marks images manually chosen by users (never auto-replaced)

ALTER TABLE ingredient_images
  ADD COLUMN IF NOT EXISTS pixabay_id INTEGER,
  ADD COLUMN IF NOT EXISTS score REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_user_override BOOLEAN DEFAULT FALSE;

-- Allow 'user_override' in the source column (previously only 'pixabay' | 'placeholder')
-- No constraint change needed since source is VARCHAR(50)
