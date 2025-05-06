// src/common/supabase.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // ✅
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BadRequestException } from '@nestjs/common';
import fs from 'fs/promises';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    // ✅ 用 DI
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_KEY');
    this.bucket = this.config.get<string>('SUPABASE_BUCKET') ?? 'epubs';
    if (!url || !key) {
      throw new Error('缺少 Supabase 設定：請檢查 SUPABASE_URL / SUPABASE_KEY');
    }
    this.supabase = createClient(url, key);
  }

  async uploadFile(
    localFilePath: string,
    remoteFileName: string,
  ): Promise<string> {
    const fileBuffer = await fs.readFile(localFilePath);
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(remoteFileName, fileBuffer, {
        contentType: 'application/epub+zip',
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Supabase 上傳失敗：${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(remoteFileName);
    return publicUrlData.publicUrl;
  }
}
