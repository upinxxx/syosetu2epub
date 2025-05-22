import { NovelSource } from '@/domain/enums/novel-source.enum.js';
import { NotFoundException } from '@nestjs/common';

export function buildNovelUrl(source: NovelSource, sourceId: string): string {
  switch (source) {
    case NovelSource.NAROU:
      return `https://ncode.syosetu.com/${sourceId}/`;
    case NovelSource.KAKUYOMU:
      return `https://kakuyomu.jp/works/${sourceId}`;
    default:
      throw new NotFoundException(`不支援的小說來源: ${source}`);
  }
}

export function buildNarouApiUrl(sourceId: string): string {
  return `https://api.syosetu.com/novelapi/api/?out=json&ncode=${sourceId}`;
}
