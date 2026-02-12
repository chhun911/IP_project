import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserDatabaseService } from './services/user-database.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UserDatabaseService],
  exports: [AuthService, UserDatabaseService],
})
export class AuthModule {}
