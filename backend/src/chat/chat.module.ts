import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DeepSeekService } from './services/deepseek.service';
import { ChatDatabaseService } from './services/chat-database.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, DeepSeekService, ChatDatabaseService],
  exports: [ChatDatabaseService],
})
export class ChatModule {}
