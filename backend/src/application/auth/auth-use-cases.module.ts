import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserOrmEntity } from '@/infrastructure/entities/user.orm-entity.js';
import { ValidateOrCreateUserUseCase } from './use-cases/validate-or-create-user.use-case.js';
import { GetCurrentUserUseCase } from './use-cases/get-current-user.use-case.js';
import { GenerateTokenUseCase } from './use-cases/generate-token.use-case.js';
import { RepositoriesModule } from '@/infrastructure/repositories/repositories.module.js';
import { AuthInfrastructureModule } from '@/infrastructure/auth/auth.infrastructure.module.js';

/**
 * 認證相關用例模組
 */
@Module({
  imports: [
    // 認證相關基礎設施
    TypeOrmModule.forFeature([UserOrmEntity]),
    // 引入儲存庫模組
    RepositoriesModule,
    // 引入認證基礎設施模組（包含 JwtModule）
    AuthInfrastructureModule,
  ],
  providers: [
    // 認證相關用例
    ValidateOrCreateUserUseCase,
    GetCurrentUserUseCase,
    GenerateTokenUseCase,
  ],
  exports: [
    // 導出認證相關用例
    ValidateOrCreateUserUseCase,
    GetCurrentUserUseCase,
    GenerateTokenUseCase,
  ],
})
export class AuthUseCasesModule {}
