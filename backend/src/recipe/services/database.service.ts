import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { IngredientImageCache } from '../interfaces/ingredient-image.interface';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
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

    await this.initializeSchema();
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const requiredColumns = [
        'id',
        'ingredient_name_normalized',
        'image_url',
        'attribution_text',
        'attribution_link',
        'source',
        'created_at',
        'updated_at',
      ];

      const existingColumnsResult = await client.query<{ column_name: string }>(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ingredient_images'
        `
      );

      if (existingColumnsResult.rows.length > 0) {
        const existingColumns = new Set(
          existingColumnsResult.rows.map((row) => row.column_name)
        );
        const missingColumns = requiredColumns.filter(
          (column) => !existingColumns.has(column)
        );

        if (missingColumns.length > 0) {
          this.logger.warn(
            `ingredient_images schema mismatch; recreating table. Missing columns: ${missingColumns.join(', ')}`
          );
          await client.query('DROP TABLE IF EXISTS ingredient_images');
        }
      }

      await client.query(`
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
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ingredient_name 
        ON ingredient_images(ingredient_name_normalized);
      `);
      this.logger.log('Database schema initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database schema', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getIngredientImage(normalizedName: string): Promise<IngredientImageCache | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<IngredientImageCache>(
        `SELECT * FROM ingredient_images WHERE ingredient_name_normalized = $1`,
        [normalizedName]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async saveIngredientImage(data: IngredientImageCache): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO ingredient_images 
         (ingredient_name_normalized, image_url, attribution_text, attribution_link, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (ingredient_name_normalized) 
         DO UPDATE SET 
           image_url = EXCLUDED.image_url,
           attribution_text = EXCLUDED.attribution_text,
           attribution_link = EXCLUDED.attribution_link,
           source = EXCLUDED.source,
           updated_at = CURRENT_TIMESTAMP`,
        [
          data.ingredient_name_normalized,
          data.image_url,
          data.attribution_text,
          data.attribution_link,
          data.source,
        ]
      );
    } finally {
      client.release();
    }
  }

  async getMultipleIngredientImages(
    normalizedNames: string[]
  ): Promise<Map<string, IngredientImageCache>> {
    if (normalizedNames.length === 0) return new Map();

    const client = await this.pool.connect();
    try {
      const placeholders = normalizedNames.map((_, i) => `$${i + 1}`).join(', ');
      const result = await client.query<IngredientImageCache>(
        `SELECT * FROM ingredient_images WHERE ingredient_name_normalized IN (${placeholders})`,
        normalizedNames
      );

      const map = new Map<string, IngredientImageCache>();
      for (const row of result.rows) {
        map.set(row.ingredient_name_normalized, row);
      }
      return map;
    } finally {
      client.release();
    }
  }

  async deleteIngredientImage(normalizedName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM ingredient_images WHERE ingredient_name_normalized = $1`,
        [normalizedName]
      );
    } finally {
      client.release();
    }
  }

  async clearAllIngredientImages(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`DELETE FROM ingredient_images`);
      this.logger.log(`Cleared ${result.rowCount} cached ingredient images`);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }
}
