import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EpubJobRepository,
  EPUB_JOB_REPOSITORY_TOKEN,
} from '@/domain/ports/repository/index.js';
import {
  StoragePort,
  STORAGE_PORT_TOKEN,
} from '@/domain/ports/storage.port.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

@Injectable()
export class CleanupOldFilesUseCase {
  private readonly logger = new Logger(CleanupOldFilesUseCase.name);

  constructor(
    @Inject(EPUB_JOB_REPOSITORY_TOKEN)
    private readonly epubJobRepository: EpubJobRepository,
    @Inject(STORAGE_PORT_TOKEN)
    private readonly storagePort: StoragePort,
  ) {}

  /**
   * 清理超過指定天數的檔案
   * @param daysOld 檔案保留天數，預設 7 天
   */
  async execute(daysOld: number = 7): Promise<void> {
    this.logger.log(`開始清理超過 ${daysOld} 天的檔案`);

    try {
      // 計算截止日期
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      this.logger.log(`清理截止日期: ${cutoffDate.toISOString()}`);

      // 查詢所有已完成且超過指定天數的任務
      const oldJobs = await this.epubJobRepository.findPaged({
        page: 1,
        limit: 1000, // 一次處理最多 1000 個任務
        sortBy: 'createdAt',
        sortDirection: 'ASC',
      });

      const jobsToClean = oldJobs.items.filter(
        (job) =>
          job.status === JobStatus.COMPLETED &&
          job.createdAt < cutoffDate &&
          job.publicUrl,
      );

      this.logger.log(`找到 ${jobsToClean.length} 個需要清理的檔案`);

      let cleanedCount = 0;
      let errorCount = 0;

      for (const job of jobsToClean) {
        try {
          // 從 publicUrl 提取檔案名稱
          const fileName = this.extractFileNameFromUrl(job.publicUrl!);

          if (fileName) {
            // 刪除 Supabase 中的檔案
            await this.storagePort.deleteFile(fileName);

            // 清除任務的 publicUrl
            await this.epubJobRepository.updateDownloadUrl(job.id, '');

            cleanedCount++;
            this.logger.debug(`已清理檔案: ${fileName} (任務 ID: ${job.id})`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `清理檔案失敗 (任務 ID: ${job.id}): ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `檔案清理完成。成功清理: ${cleanedCount} 個，失敗: ${errorCount} 個`,
      );
    } catch (error) {
      this.logger.error(`檔案清理過程發生錯誤: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 從 Supabase URL 中提取檔案名稱
   * @param url Supabase 公開 URL
   * @returns 檔案名稱或 null
   */
  private extractFileNameFromUrl(url: string): string | null {
    try {
      // Supabase URL 格式: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<filename>
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      if (fileName && fileName.includes('.epub')) {
        return fileName;
      }

      return null;
    } catch (error) {
      this.logger.warn(`無法從 URL 提取檔案名稱: ${url}`, error);
      return null;
    }
  }
}
