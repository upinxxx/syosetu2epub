import { Module } from '@nestjs/common';
import { KindleDeliveryController } from './kindle-delivery.controller.js';
import { KindleDeliveryModule as AppKindleDeliveryModule } from '@/application/kindle-delivery/kindle-delivery.module.js';
import { KindleDeliveryQueue } from '@/infrastructure/queue/kindle-delivery.queue.js';

/**
 * HTTP層的Kindle交付模塊
 * 註冊控制器和依賴模塊
 */
@Module({
  imports: [AppKindleDeliveryModule],
  controllers: [KindleDeliveryController],
  providers: [KindleDeliveryQueue],
})
export class KindleDeliveryHttpModule {}
