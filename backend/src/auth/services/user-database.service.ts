import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  image_generation_count: number;
  subscription_type: 'free' | 'premium';
  meal_plan_generations_used: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UserDatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(UserDatabaseService.name);

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
      this.logger.log('Connecting to Neon PostgreSQL (DATABASE_URL)');
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
      this.logger.log('Connecting to local PostgreSQL');
    }

    await this.initializeSchema();
    this.logger.log('Users database schema initialized');
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  /**
   * Auto-create the users table if it doesn't exist.
   */
  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(200) NOT NULL,
          image_generation_count INTEGER DEFAULT 0,
          subscription_type VARCHAR(20) DEFAULT 'free',
          meal_plan_generations_used INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Add usage/subscription columns if they don't exist (for existing tables)
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS image_generation_count INTEGER DEFAULT 0;
      `);
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) DEFAULT 'free';
      `);
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS meal_plan_generations_used INTEGER DEFAULT 0;
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);

      this.logger.log('Users table ready');
    } catch (error) {
      this.logger.error('Failed to initialize users schema', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find a user by email. Returns null if not found.
   */
  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] ?? null;
  }

  /**
   * Find a user by ID. Returns null if not found.
   */
  async findById(id: number): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  /**
   * Create a new user. Returns the created user row (without password_hash in practice,
   * but the full row is returned for service-level use).
   */
  async createUser(name: string, email: string, passwordHash: string): Promise<UserRow> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, passwordHash],
    );
    return result.rows[0];
  }

  /**
   * Get the image generation usage count for a user.
   */
  async getImageGenerationCount(userId: number): Promise<number> {
    const result = await this.pool.query<{ image_generation_count: number }>(
      'SELECT image_generation_count FROM users WHERE id = $1',
      [userId],
    );
    return result.rows[0]?.image_generation_count ?? 0;
  }

  /**
   * Increment the image generation count for a user. Returns the new count.
   */
  async incrementImageGenerationCount(userId: number): Promise<number> {
    const result = await this.pool.query<{ image_generation_count: number }>(
      `UPDATE users SET image_generation_count = image_generation_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING image_generation_count`,
      [userId],
    );
    return result.rows[0]?.image_generation_count ?? 0;
  }

  /**
   * Get subscription and meal plan generation usage for a user.
   */
  async getMealPlanUsage(userId: number): Promise<{
    subscriptionType: 'free' | 'premium';
    used: number;
  }> {
    const result = await this.pool.query<{
      subscription_type: 'free' | 'premium';
      meal_plan_generations_used: number;
    }>(
      `SELECT subscription_type, meal_plan_generations_used
       FROM users
       WHERE id = $1`,
      [userId],
    );

    return {
      subscriptionType: result.rows[0]?.subscription_type || 'free',
      used: result.rows[0]?.meal_plan_generations_used ?? 0,
    };
  }

  /**
   * Increment the meal plan generation count for a user. Returns the new count.
   */
  async incrementMealPlanGenerationCount(userId: number): Promise<number> {
    const result = await this.pool.query<{ meal_plan_generations_used: number }>(
      `UPDATE users
       SET meal_plan_generations_used = meal_plan_generations_used + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING meal_plan_generations_used`,
      [userId],
    );
    return result.rows[0]?.meal_plan_generations_used ?? 0;
  }
}
