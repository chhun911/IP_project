import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [AuthModule, ChatModule, OrderModule],
})
export class AppModule {}
