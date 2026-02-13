import { Controller, Post, Get, Delete, Body, Query, Param, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { ChatDatabaseService } from './services/chat-database.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatDatabaseService: ChatDatabaseService,
  ) {}

  @Post()
  async chat(@Body() chatDto: ChatDto) {
    return this.chatService.processChat(chatDto);
  }

  /**
   * POST /api/chat/stream
   * Stream chat response via Server-Sent Events for real-time token display
   */
  @Post('stream')
  async chatStream(@Body() chatDto: ChatDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const result = await this.chatService.processChatStream(chatDto, res);
      // Send final event with metadata (conversationId, full response for DB)
      res.write(`data: ${JSON.stringify({ type: 'done', conversationId: result.conversationId })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  /**
   * GET /api/chat/history?userId=1
   * Get all conversations for a user (sidebar list)
   */
  @Get('history')
  async getChatHistory(@Query('userId') userId: string) {
    const conversations = await this.chatDatabaseService.getConversationsByUser(Number(userId));
    return { success: true, conversations };
  }

  /**
   * GET /api/chat/history/:id?userId=1
   * Get a single conversation with all its messages
   */
  @Get('history/:id')
  async getConversation(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const conversation = await this.chatDatabaseService.getConversationWithMessages(
      Number(id),
      Number(userId),
    );
    if (!conversation) {
      return { success: false, message: 'Conversation not found' };
    }
    return { success: true, conversation };
  }

  /**
   * DELETE /api/chat/history/:id?userId=1
   * Delete a conversation and all its messages
   */
  @Delete('history/:id')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const deleted = await this.chatDatabaseService.deleteConversation(
      Number(id),
      Number(userId),
    );
    return { success: deleted };
  }
}
