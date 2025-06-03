import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { NovelSource } from '@/domain/enums/novel-source.enum.js';

/**
 * 預覽請求 DTO
 */
export class PreviewRequestDto {
  @IsEnum(NovelSource)
  source: NovelSource;

  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * 獲取預覽任務狀態 DTO
 */
export class GetPreviewJobStatusDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
}

/**
 * 根據 ID 獲取預覽 DTO
 */
export class GetPreviewByIdDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
