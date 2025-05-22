import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort } from '../../domain/ports/storage.port.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { BadRequestException } from '@nestjs/common';

/**
 * Supabase 存儲服務實現
 * 使用 Supabase Storage 存儲和管理檔案
 */
@Injectable()
export class SupabaseStorageAdapter implements StoragePort {
  private readonly logger = new Logger(SupabaseStorageAdapter.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    this.bucket = this.configService.get<string>('SUPABASE_BUCKET') ?? 'epubs';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 配置缺失，請檢查環境變數');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log(
      `Supabase Storage 服務已初始化，使用儲存桶: ${this.bucket}`,
    );
  }

  /**
   * 上傳檔案並獲取公開 URL
   * @param filePath 本地檔案路徑
   * @param fileName 目標檔案名稱
   * @param contentType 可選的內容類型
   */
  async uploadFile(
    filePath: string,
    fileName: string,
    contentType = 'application/epub+zip',
  ): Promise<string> {
    try {
      this.logger.log(`開始上傳檔案 ${fileName} 到 Supabase Storage`);

      // 讀取檔案
      const fileBuffer = await fs.readFile(filePath);
      // const fileExt = path.extname(fileName).toLowerCase();

      // 上传到 Supabase
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileName, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        throw new BadRequestException(`Supabase 上傳失敗：${error.message}`);
      }

      const publicUrl = this.getPublicUrl(fileName);
      this.logger.log(`檔案上傳成功，公開 URL: ${publicUrl}`);
      // 刪除本地暫存檔案
      await fs.unlink(filePath);
      this.logger.log('已刪除本地暫存檔案');

      return publicUrl;
    } catch (error) {
      this.logger.error(`檔案上傳失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 獲取檔案公開 URL
   * @param fileName 檔案名稱
   */
  getPublicUrl(fileName: string): string {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  /**
   * 刪除檔案
   * @param fileName 檔案名稱
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      this.logger.log(`開始刪除檔案 ${fileName}`);

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([fileName]);

      if (error) {
        throw new Error(`刪除失敗: ${error.message}`);
      }

      this.logger.log(`檔案 ${fileName} 已成功刪除`);
    } catch (error) {
      this.logger.error(`檔案刪除失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}
