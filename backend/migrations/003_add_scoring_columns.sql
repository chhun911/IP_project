-- Migration: Add scoring and user override columns to ingredient_images
-- These columns support the new image scoring pipeline and user override feature

-- Add pixabay_id to track which Pixabay image was selected
ALTER TABLE ingredient_images
ADD COLUMN IF NOT EXISTS pixabay_id INTEGER;

-- Add score to store the computed relevance score
ALTER TABLE ingredient_images
ADD COLUMN IF NOT EXISTS score REAL DEFAULT 0;

-- Add is_user_override flag to protect manually chosen images from being overwritten
ALTER TABLE ingredient_images
ADD COLUMN IF NOT EXISTS is_user_override BOOLEAN DEFAULT FALSE;

-- Note: The DatabaseService auto-detects missing columns and recreates the table
-- if needed, so this migration is optional for development environments.
-- For production, run this migration manually before deploying the new code.
