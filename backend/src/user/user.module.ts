import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { RepositoriesModule } from '@/infrastructure/repositories/repositories.module.js';

@Module({
  imports: [RepositoriesModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
