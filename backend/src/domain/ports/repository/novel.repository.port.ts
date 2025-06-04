import { Novel } from '../../entities/novel.entity.js';
import { CrudRepository, PagedRepository } from './base.repository.port.js';

/**
 * Novel Repository Port
 */
export interface NovelRepository
  extends CrudRepository<Novel>,
    PagedRepository<Novel> {
  findBySourceAndSourceId(
    source: string,
    sourceId: string,
  ): Promise<Novel | null>;
}

export const NOVEL_REPOSITORY_TOKEN = 'NOVEL_REPOSITORY';
