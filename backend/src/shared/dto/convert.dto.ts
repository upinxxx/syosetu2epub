import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 提交轉換任務 DTO
 */
export class SubmitConvertJobDto {
  @IsString()
  @IsNotEmpty()
  novelId: string;
}

/**
 * 獲取任務狀態 DTO
 */
export class GetJobStatusDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
}

/**
 * 獲取下載連結 DTO
 */
export class GetDownloadLinkDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
}

/**
 * 獲取用戶任務歷史 DTO
 */
export class GetUserJobHistoryDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

/**
 * 獲取用戶最近任務 DTO
 */
export class GetUserRecentJobsDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 5;
}
