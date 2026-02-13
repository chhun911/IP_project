-- Migration: Add image_generation_count column to users table
-- Tracks how many times a user has used AI image generation (max 5 free uses)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS image_generation_count INTEGER DEFAULT 0;
