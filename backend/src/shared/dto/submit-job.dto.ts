import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * 提交 EPUB 轉換任務 DTO
 */
export class SubmitJobDto {
  /**
   * 小說 ID，參考 Novel 實體表
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID()
  @IsNotEmpty({ message: '小說 ID 不能為空' })
  novelId: string;
}
