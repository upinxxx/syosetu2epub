import { Module } from '@nestjs/common';

import { SendToKindleUseCase } from './send-to-kindle.use-case.js';
import { GetDeliveryHistoryQuery } from './get-delivery-history.query.js';
import { GetRecentDeliveryQuery } from './get-recent-delivery.query.js';
import { GetDeliveryStatusQuery } from './get-delivery-status.query.js';
import { KindleDeliveryFacade } from './kindle-delivery.facade.js';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module.js';

@Module({
  imports: [InfrastructureModule],
  providers: [
    { provide: SendToKindleUseCase, useClass: SendToKindleUseCase },
    { provide: GetDeliveryHistoryQuery, useClass: GetDeliveryHistoryQuery },
    { provide: GetRecentDeliveryQuery, useClass: GetRecentDeliveryQuery },
    { provide: GetDeliveryStatusQuery, useClass: GetDeliveryStatusQuery },
    { provide: KindleDeliveryFacade, useClass: KindleDeliveryFacade },
  ],
  exports: [KindleDeliveryFacade],
})
export class KindleDeliveryModule {}
