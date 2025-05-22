import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';

/**
 * 提交小說轉換任務 DTO
 * 與 SubmitJobDto 類似但包含更多轉換選項
 */
export class ConvertNovelDto {
  /**
   * 小說 ID，參考 Novel 實體表
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID()
  @IsNotEmpty({ message: '小說 ID 不能為空' })
  novelId: string;

  /**
   * 是否包含封面圖片
   * @default true
   */
  @IsOptional()
  @IsBoolean()
  includeCover?: boolean = true;

  /**
   * 是否在完成後發送電子郵件通知
   * @default false
   */
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = false;

  /**
   * 自定義電子郵件地址（如果不使用用户默認郵件）
   * @example "user@example.com"
   */
  @IsOptional()
  @IsString()
  customEmail?: string;
}
