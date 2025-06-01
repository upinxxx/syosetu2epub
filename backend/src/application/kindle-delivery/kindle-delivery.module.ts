import { Module } from '@nestjs/common';

import { SendToKindleUseCase } from './send-to-kindle.use-case.js';
import { GetDeliveryHistoryQuery } from './get-delivery-history.query.js';
import { KindleDeliveryFacade } from './kindle-delivery.facade.js';

@Module({
  providers: [
    SendToKindleUseCase,
    GetDeliveryHistoryQuery,
    KindleDeliveryFacade,
  ],
  exports: [KindleDeliveryFacade],
})
export class KindleDeliveryModule {}
