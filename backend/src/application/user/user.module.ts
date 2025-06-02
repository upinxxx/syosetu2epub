import { Module } from '@nestjs/common';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case.js';
import { UpdateUserProfileUseCase } from './use-cases/update-user-profile.use-case.js';
import { UserFacade } from './user.facade.js';
import { RepositoriesModule } from '@/infrastructure/repositories/repositories.module.js';

/**
 * 用戶管理相關模組
 */
@Module({
  imports: [
    // 引入儲存庫模組以提供 Repository 依賴
    RepositoriesModule,
  ],
  providers: [
    // 用戶相關用例
    {
      provide: GetUserProfileUseCase,
      useClass: GetUserProfileUseCase,
    },
    {
      provide: UpdateUserProfileUseCase,
      useClass: UpdateUserProfileUseCase,
    },
    // Facade
    {
      provide: UserFacade,
      useClass: UserFacade,
    },
  ],
  exports: [
    // 僅導出 Facade
    UserFacade,
  ],
})
export class UserModule {}
