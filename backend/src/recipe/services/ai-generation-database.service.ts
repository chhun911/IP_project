import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export interface AiGenerationRow {
  id: number;
  user_id: number | null;
  generation_type: string;
  prompt: string | null;
  result: any;
  model: string | null;
  tokens_used: number;
  duration_ms: number;
  status: 'success' | 'error' | 'pending';
  error_message: string | null;
  created_at: Date;
}

@Injectable()
export class AiGenerationDatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(AiGenerationDatabaseService.name);

  async onModuleInit() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      this.logger.log('AiGenDB: Connecting to Neon PostgreSQL');
    } else {
      this.pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DB || 'aicookbook',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      this.logger.log('AiGenDB: Connecting to local PostgreSQL');
    }

    await this.initializeSchema();
    this.logger.log('AI generations database schema initialized');
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ai_generations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          generation_type VARCHAR(50) NOT NULL DEFAULT 'recipe',
          prompt TEXT,
          result JSONB,
          model VARCHAR(100),
          tokens_used INTEGER DEFAULT 0,
          duration_ms INTEGER DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'success'
            CHECK (status IN ('success', 'error', 'pending')),
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_generations_type ON ai_generations(generation_type);`);

      this.logger.log('AI generations table ready');
    } catch (error) {
      this.logger.error('Failed to initialize ai_generations schema', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record a new AI generation (recipe, chat_recipe, image, etc.)
   */
  async recordGeneration(params: {
    userId?: number;
    generationType: string;
    prompt: string;
    result: any;
    model?: string;
    tokensUsed?: number;
    durationMs?: number;
    status?: 'success' | 'error' | 'pending';
    errorMessage?: string;
  }): Promise<AiGenerationRow> {
    const result = await this.pool.query<AiGenerationRow>(
      `INSERT INTO ai_generations (user_id, generation_type, prompt, result, model, tokens_used, duration_ms, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.userId || null,
        params.generationType,
        params.prompt,
        JSON.stringify(params.result),
        params.model || null,
        params.tokensUsed || 0,
        params.durationMs || 0,
        params.status || 'success',
        params.errorMessage || null,
      ],
    );
    return result.rows[0];
  }

  /**
   * Get all AI generations for a user (recipe history)
   */
  async getGenerationsByUser(userId: number, type?: string): Promise<AiGenerationRow[]> {
    let query = `SELECT * FROM ai_generations WHERE user_id = $1`;
    const params: any[] = [userId];

    if (type) {
      query += ` AND generation_type = $2`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query<AiGenerationRow>(query, params);
    return result.rows;
  }

  /**
   * Get a single generation by ID
   */
  async getGenerationById(id: number, userId: number): Promise<AiGenerationRow | null> {
    const result = await this.pool.query<AiGenerationRow>(
      `SELECT * FROM ai_generations WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ?? null;
  }

  /**
   * Delete a generation record
   */
  async deleteGeneration(id: number, userId: number): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ai_generations WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update ingredient image inside the saved recipe JSONB.
   * Finds matching ingredients by name and updates their imageUrl, imageSource, and attribution.
   */
  async updateIngredientImageInResult(
    generationId: number,
    userId: number,
    ingredientName: string,
    imageUrl: string,
    attributionText: string,
    attributionLink: string,
  ): Promise<boolean> {
    // Fetch the current result JSONB
    const row = await this.getGenerationById(generationId, userId);
    if (!row || !row.result) return false;

    const result = row.result;
    const normalizedTarget = ingredientName.toLowerCase().trim();
    let updated = false;

    if (Array.isArray(result.ingredients)) {
      for (const ing of result.ingredients) {
        if (ing.name && ing.name.toLowerCase().trim() === normalizedTarget) {
          ing.imageUrl = imageUrl;
          ing.imageSource = 'user_override';
          ing.attribution = { text: attributionText, link: attributionLink };
          updated = true;
        }
      }
    }

    if (!updated) return false;

    // Write updated JSONB back
    const updateResult = await this.pool.query(
      `UPDATE ai_generations SET result = $1 WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(result), generationId, userId],
    );
    return (updateResult.rowCount ?? 0) > 0;
  }
}
