import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * 任務 ID 路徑參數 DTO
 * 用於驗證路徑中的 jobId 參數
 */
export class JobIdParamDto {
  /**
   * 任務 ID，必須是有效的 UUID 格式
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsUUID('4', { message: '任務 ID 必須是有效的 UUID 格式' })
  @IsNotEmpty({ message: '任務 ID 不能為空' })
  jobId: string;
}
