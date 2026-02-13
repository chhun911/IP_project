import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export interface ConversationRow {
  id: number;
  user_id: number;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
}

@Injectable()
export class ChatDatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(ChatDatabaseService.name);

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
      this.logger.log('ChatDB: Connecting to Neon PostgreSQL');
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
      this.logger.log('ChatDB: Connecting to local PostgreSQL');
    }

    await this.initializeSchema();
    this.logger.log('Chat database schema initialized');
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) DEFAULT 'New Chat',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);`);

      this.logger.log('Chat tables ready');
    } catch (error) {
      this.logger.error('Failed to initialize chat schema', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ─── Conversations ───

  async createConversation(userId: number, title: string = 'New Chat'): Promise<ConversationRow> {
    const result = await this.pool.query<ConversationRow>(
      `INSERT INTO chat_conversations (user_id, title) VALUES ($1, $2) RETURNING *`,
      [userId, title],
    );
    return result.rows[0];
  }

  async getConversationsByUser(userId: number): Promise<ConversationRow[]> {
    const result = await this.pool.query<ConversationRow>(
      `SELECT * FROM chat_conversations WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId],
    );
    return result.rows;
  }

  async updateConversationTitle(conversationId: number, title: string): Promise<void> {
    await this.pool.query(
      `UPDATE chat_conversations SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [title, conversationId],
    );
  }

  async deleteConversation(conversationId: number, userId: number): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ─── Messages ───

  async addMessage(conversationId: number, role: 'user' | 'assistant' | 'system', content: string): Promise<MessageRow> {
    const result = await this.pool.query<MessageRow>(
      `INSERT INTO chat_messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *`,
      [conversationId, role, content],
    );
    // Touch the conversation's updated_at
    await this.pool.query(
      `UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId],
    );
    return result.rows[0];
  }

  async getMessagesByConversation(conversationId: number): Promise<MessageRow[]> {
    const result = await this.pool.query<MessageRow>(
      `SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId],
    );
    return result.rows;
  }

  /**
   * Get full conversation with messages (for loading a session)
   */
  async getConversationWithMessages(conversationId: number, userId: number) {
    const convResult = await this.pool.query<ConversationRow>(
      `SELECT * FROM chat_conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
    if (convResult.rows.length === 0) return null;

    const messages = await this.getMessagesByConversation(conversationId);
    return {
      ...convResult.rows[0],
      messages,
    };
  }
}
