import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分頁查詢 DTO
 * 用於驗證分頁相關的查詢參數
 */
export class PaginationQueryDto {
  /**
   * 頁碼，從 1 開始
   * @default 1
   * @example 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '頁碼必須是整數' })
  @Min(1, { message: '頁碼必須大於等於 1' })
  @Max(1000, { message: '頁碼不能超過 1000' })
  page?: number = 1;

  /**
   * 每頁數量
   * @default 10
   * @example 10
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每頁數量必須是整數' })
  @Min(1, { message: '每頁數量必須大於等於 1' })
  @Max(100, { message: '每頁數量不能超過 100' })
  limit?: number = 10;
}

/**
 * 最近任務查詢 DTO
 * 用於驗證獲取最近任務的查詢參數
 */
export class RecentJobsQueryDto {
  /**
   * 天數限制
   * @default 7
   * @example 7
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '天數必須是整數' })
  @Min(1, { message: '天數必須大於等於 1' })
  @Max(30, { message: '天數不能超過 30' })
  days?: number = 7;
}
