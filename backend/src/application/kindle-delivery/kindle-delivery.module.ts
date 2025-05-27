import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RepositoriesModule } from '@/infrastructure/repositories/repositories.module.js';
import { KindleDeliveryProcessor } from './kindle-delivery.processor.js';
import { SendToKindleUseCase } from './use-cases/send-to-kindle.use-case.js';
import { GetUserDeliveryHistoryUseCase } from './use-cases/get-user-delivery-history.use-case.js';
import { ProcessDeliveryJobUseCase } from './use-cases/process-delivery-job.use-case.js';
import { KindleDeliveryFacade } from './kindle-delivery.facade.js';

@Module({
  imports: [
    RepositoriesModule,
    BullModule.registerQueue({
      name: 'kindle-delivery',
    }),
  ],
  providers: [
    // 用例
    SendToKindleUseCase,
    GetUserDeliveryHistoryUseCase,
    ProcessDeliveryJobUseCase,
    // Processor
    KindleDeliveryProcessor,
    // Facade
    KindleDeliveryFacade,
  ],
  exports: [
    // 僅導出 Facade
    KindleDeliveryFacade,
  ],
})
export class KindleDeliveryModule {}
