import { EpubJob } from '../../entities/epub-job.entity.js';
import { JobStatus } from '../../enums/job-status.enum.js';
import {
  CrudRepository,
  PagedRepository,
  PagedResult,
} from './base.repository.port.js';

/**
 * EpubJob Repository Port
 */
export interface EpubJobRepository
  extends CrudRepository<EpubJob>,
    PagedRepository<EpubJob> {
  findLatestByNovelId(novelId: string): Promise<EpubJob | null>;
  findByStatus(statuses: JobStatus[]): Promise<EpubJob[]>;
  findRecentActiveJobs(since: Date): Promise<EpubJob[]>;
  findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PagedResult<EpubJob>>;
  findRecentByUserId(userId: string, withinDays: number): Promise<EpubJob[]>;
  updateStatus(id: string, status: JobStatus): Promise<EpubJob>;
  updateDownloadUrl(id: string, publicUrl: string): Promise<EpubJob>;
}

export const EPUB_JOB_REPOSITORY_TOKEN = 'EPUB_JOB_REPOSITORY';
