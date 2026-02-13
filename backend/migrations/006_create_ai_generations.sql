-- Migration: Create AI generations table
-- Tracks every AI-generated recipe (from both chat and recipe-generator features)

CREATE TABLE IF NOT EXISTS ai_generations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    generation_type VARCHAR(50) NOT NULL DEFAULT 'recipe',
        -- 'recipe'       = recipe generator page
        -- 'chat_recipe'  = recipe extracted from chat
        -- 'image'        = AI image generation
    prompt TEXT,                          -- the user's input / ingredients list
    result JSONB,                        -- full generated output (recipe JSON, image URLs, etc.)
    model VARCHAR(100),                  -- AI model used (deepseek-chat, gpt-4o-mini, etc.)
    tokens_used INTEGER DEFAULT 0,       -- token count for cost tracking
    duration_ms INTEGER DEFAULT 0,       -- generation time in milliseconds
    status VARCHAR(20) NOT NULL DEFAULT 'success'
        CHECK (status IN ('success', 'error', 'pending')),
    error_message TEXT,                  -- error details if status = 'error'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_type ON ai_generations(generation_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);
