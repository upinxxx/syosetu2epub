import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoriesModule } from '@/infrastructure/repositories/repositories.module.js';
// import { User } from '../domain/user.entity.js';

@Module({
  imports: [RepositoriesModule],
  // imports: [TypeOrmModule.forFeature({ User })],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
