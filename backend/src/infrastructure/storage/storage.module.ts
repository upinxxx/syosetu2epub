import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseStorageAdapter } from './supabase-storage.adapter.js';
import { STORAGE_PORT_TOKEN } from '../../domain/ports/storage.port.js';

/**
 * 存儲模組 - 基礎設施層
 * 提供檔案存儲實現
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_PORT_TOKEN,
      useClass: SupabaseStorageAdapter,
    },
  ],
  exports: [STORAGE_PORT_TOKEN],
})
export class StorageModule {}
