import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DeepSeekService } from './services/deepseek.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, DeepSeekService],
})
export class ChatModule {}
