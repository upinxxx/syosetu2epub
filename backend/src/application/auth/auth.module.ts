import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '@/infrastructure/entities/user.orm-entity.js';
import { ValidateOrCreateUserUseCase } from './use-cases/validate-or-create-user.use-case.js';
import { GetCurrentUserUseCase } from './use-cases/get-current-user.use-case.js';
import { GenerateTokenUseCase } from './use-cases/generate-token.use-case.js';
import { RepositoriesModule } from '@/infrastructure/repositories/repositories.module.js';
import { AuthModule as AuthInfrastructureModule } from '@/infrastructure/auth/auth.module.js';
import { AuthFacade } from './auth.facade.js';

/**
 * 認證相關模組
 */
@Module({
  imports: [
    // 引入儲存庫模組
    RepositoriesModule,
    // 引入認證基礎設施模組（包含 JwtModule）
    AuthInfrastructureModule,
  ],
  providers: [
    // 認證相關用例
    {
      provide: ValidateOrCreateUserUseCase,
      useClass: ValidateOrCreateUserUseCase,
    },
    {
      provide: GetCurrentUserUseCase,
      useClass: GetCurrentUserUseCase,
    },
    {
      provide: GenerateTokenUseCase,
      useClass: GenerateTokenUseCase,
    },
    // Facade
    {
      provide: AuthFacade,
      useClass: AuthFacade,
    },
  ],
  exports: [
    // 僅導出 Facade
    AuthFacade,
  ],
})
export class AuthModule {}
