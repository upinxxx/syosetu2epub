import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class PreviewNovelDto {
  @IsEnum(NovelSource, { message: '不支援的小說站點' })
  source: NovelSource;

  @IsString()
  @IsNotEmpty({ message: '作品 ID 不能為空' })
  sourceId: string;
}
