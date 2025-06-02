import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseStorageAdapter } from './supabase-storage.adapter.js';
import { STORAGE_PORT_TOKEN } from '../../domain/ports/storage.port.js';
import { SupabaseFileDownloaderAdapter } from './supabase-file-downloader.adapter.js';
import { FILE_DOWNLOADER_PORT } from '@/domain/ports/file-downloader.port.js';
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
    {
      provide: FILE_DOWNLOADER_PORT,
      useClass: SupabaseFileDownloaderAdapter,
    },
  ],
  exports: [STORAGE_PORT_TOKEN, FILE_DOWNLOADER_PORT],
})
export class StorageModule {}
