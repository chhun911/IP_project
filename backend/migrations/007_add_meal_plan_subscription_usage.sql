-- Migration: Add subscription and meal planning usage fields to users.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) DEFAULT 'free';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS meal_plan_generations_used INTEGER DEFAULT 0;

UPDATE users
SET subscription_type = 'free'
WHERE subscription_type IS NULL;

UPDATE users
SET meal_plan_generations_used = 0
WHERE meal_plan_generations_used IS NULL;
