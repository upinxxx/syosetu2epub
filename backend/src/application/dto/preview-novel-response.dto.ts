import { NovelSource } from '../../shared/dto/preview-novel.dto.js';

/**
 * 小說預覽回應 DTO
 */
export class PreviewNovelResponseDto {
  /** 小說 ID */
  novelId: string;

  /** 小說標題 */
  title: string;

  /** 作者 */
  author: string;

  /** 描述 */
  description: string;

  /** 來源網站 */
  source: NovelSource;

  /** 來源網站 ID */
  sourceId: string;

  /** 封面圖片 URL */
  coverUrl?: string;

  /** 小說更新時間 */
  novelUpdatedAt?: Date;
}
