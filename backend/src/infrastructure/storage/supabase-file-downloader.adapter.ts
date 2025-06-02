import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { basename, extname } from 'node:path';

import { FileDownloaderPort } from '@/domain/ports/file-downloader.port.js';

@Injectable()
export class SupabaseFileDownloaderAdapter implements FileDownloaderPort {
  private readonly logger = new Logger(SupabaseFileDownloaderAdapter.name);
  private readonly supabase: SupabaseClient;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const supabaseConfig = this.configService.get('supabase');
    const url = supabaseConfig?.url;
    const serviceKey = supabaseConfig?.key;

    if (!url || !serviceKey) {
      throw new Error('Supabase configuration is missing');
    }

    this.supabase = createClient(url, serviceKey);
  }

  /**
   * 從Supabase Storage下載檔案
   * @param url 完整的Supabase Storage URL
   * @returns 檔案Buffer
   */
  async download(url: string): Promise<Buffer> {
    try {
      // 從URL解析bucket和path
      const { bucket, path } = this.parseSupabaseUrl(url);

      // 下載檔案
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        this.logger.error(`Failed to download file: ${error.message}`, error);
        throw new Error(`Failed to download file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      // 轉換為Buffer
      const buffer = Buffer.from(await data.arrayBuffer());
      this.logger.log(
        `File downloaded successfully: ${path} (${buffer.length} bytes)`,
      );

      return buffer;
    } catch (error) {
      this.logger.error(`Error downloading file: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * 從URL獲取檔案名稱
   * @param url Supabase Storage URL
   * @returns 檔案名稱
   */
  getFilename(url: string): string {
    try {
      const { path } = this.parseSupabaseUrl(url);
      return basename(path);
    } catch (error) {
      // 如果無法解析URL，返回一個預設名稱
      const timestamp = new Date().getTime();
      return `novel-${timestamp}.epub`;
    }
  }

  /**
   * 解析Supabase URL，提取bucket和path
   * @param url Supabase Storage URL
   * @returns {bucket, path}
   */
  private parseSupabaseUrl(url: string): { bucket: string; path: string } {
    try {
      // 支持兩種格式:
      // 1. https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
      // 2. https://<project>.supabase.in/storage/v1/object/sign/<bucket>/<path>?token=xxx

      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');

      // 找到bucket的位置
      const publicIndex = pathSegments.findIndex(
        (segment) => segment === 'public',
      );
      const signIndex = pathSegments.findIndex((segment) => segment === 'sign');

      let bucketIndex = -1;
      if (publicIndex !== -1) {
        bucketIndex = publicIndex + 1;
      } else if (signIndex !== -1) {
        bucketIndex = signIndex + 1;
      } else {
        throw new Error('Invalid Supabase URL format');
      }

      const bucket = pathSegments[bucketIndex];
      const path = pathSegments.slice(bucketIndex + 1).join('/');

      if (!bucket || !path) {
        throw new Error('Could not extract bucket or path from URL');
      }

      return { bucket, path };
    } catch (error) {
      this.logger.error(`Error parsing Supabase URL: ${error.message}`, error);
      throw new Error(`Invalid Supabase URL: ${error.message}`);
    }
  }
}
