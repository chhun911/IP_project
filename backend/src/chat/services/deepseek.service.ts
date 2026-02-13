import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekChatResponse {
  response: string;
  success: boolean;
}

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  private readonly model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat';
  private readonly apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.deepseek.com';

  /**
   * Send a chat message to DeepSeek AI (non-streaming)
   */
  async chat(userMessage: string, conversationHistory?: ChatMessage[]): Promise<DeepSeekChatResponse> {
    if (!this.apiKey) {
      throw new BadRequestException('AI API key not configured');
    }

    if (!userMessage || userMessage.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    const messages = this.buildMessages(userMessage, conversationHistory);

    try {
      const response = await fetch(`${this.apiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.5,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error(`DeepSeek API error: ${JSON.stringify(error)}`);
        throw new BadRequestException('Failed to get response from AI');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new BadRequestException('Empty response from AI');
      }

      return {
        response: content,
        success: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`DeepSeek API request failed: ${error}`);
      throw new BadRequestException('Failed to communicate with AI service');
    }
  }

  /**
   * Stream a chat response from DeepSeek AI using SSE.
   * Yields string chunks as they arrive.
   */
  async *chatStream(userMessage: string, conversationHistory?: ChatMessage[]): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new BadRequestException('AI API key not configured');
    }

    if (!userMessage || userMessage.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    const messages = this.buildMessages(userMessage, conversationHistory);

    const response = await fetch(`${this.apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.5,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      this.logger.error(`DeepSeek stream API error: ${errBody}`);
      throw new BadRequestException('Failed to get streaming response from AI');
    }

    const reader = response.body as any;
    // Node 18+ fetch returns a ReadableStream; convert to async iterable
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of reader) {
      buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ') && trimmed.slice(6) !== '[DONE]') {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch { /* skip */ }
      }
    }
  }

  private buildMessages(userMessage: string, conversationHistory?: ChatMessage[]): ChatMessage[] {
    return [
      {
        role: 'system',
        content: this.getSystemPrompt(),
      },
      ...(conversationHistory || []),
      {
        role: 'user',
        content: userMessage,
      },
    ];
  }

  /**
   * Build the system prompt for the cooking assistant
   */
  private getSystemPrompt(): string {
    return `You are an expert cooking assistant and culinary advisor for the AICookBook application.

Your role is to:
1. Help users with cooking questions, recipe suggestions, and culinary advice
2. Provide detailed information about recipes, ingredients, and cooking techniques
3. Suggest recipes based on available ingredients or dietary preferences
4. Offer tips for ingredient substitutions and meal planning
5. Answer food safety questions and provide cooking best practices
6. Be friendly, helpful, and encouraging

Guidelines:
- Keep responses clear, concise, and practical
- Use friendly, conversational language
- Provide specific measurements and cooking times when relevant
- Include food safety warnings when appropriate
- Suggest creative alternatives when ingredients are missing
- Be supportive and enthusiastic about cooking

Remember: You're helping people become better cooks and enjoy their culinary journey!`;
  }
}
