import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EpubJob, EpubJobStatus } from "./entities/epub-job.entity.js";
import { NovelService } from "../../novel/novel.service.js";
import { EpubService } from "../../epub/epub.service.js";

const PREVIEW_PROVIDER_TOKEN = Symbol("PREVIEW_PROVIDER");
const STORAGE_PROVIDER_TOKEN = Symbol("STORAGE_PROVIDER");
const EMAIL_PROVIDER_TOKEN = Symbol("EMAIL_PROVIDER");

@Injectable()
export class EpubJobService {
  private logger = new Logger(EpubJobService.name);

  constructor(
    @InjectRepository(EpubJob)
    private epubJobRepository: Repository<EpubJob>,
    @Inject(forwardRef(() => NovelService))
    private novelService: NovelService,
    @Inject(EpubService)
    private epubService: EpubService,
    @Inject(PREVIEW_PROVIDER_TOKEN)
    private previewProvider: any,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private storageProvider: any,
    @Inject(EMAIL_PROVIDER_TOKEN)
    private emailProvider: any
  ) {}

  async createJob(novelId: string) {
    try {
      const novel = await this.novelService.findNovelById(novelId);
      if (!novel) {
        throw new NotFoundException(`找不到 ID 為 ${novelId} 的小說`);
      }
      const job = this.epubJobRepository.create({
        novelId,
        status: EpubJobStatus.QUEUED,
      });
      const savedJob = await this.epubJobRepository.save(job);
      this.logger.log(`已創建 EPUB 轉換任務: ${savedJob.id}`);
      return savedJob;
    } catch (error) {
      this.logger.error(`創建 EPUB 任務失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getJobStatus(jobId: string) {
    try {
      const job = await this.epubJobRepository.findOne({
        where: { id: jobId },
      });
      if (!job) {
        throw new Error(`找不到 ID 為 ${jobId} 的任務`);
      }
      return {
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
      };
    } catch (error) {
      this.logger.error(`獲取任務狀態失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getJobDownloadUrl(jobId: string) {
    try {
      const job = await this.epubJobRepository.findOne({
        where: { id: jobId },
        relations: ["novel"],
      });
      if (!job) {
        throw new Error(`找不到 ID 為 ${jobId} 的任務`);
      }
      if (job.status !== EpubJobStatus.COMPLETED) {
        throw new Error(`任務尚未完成，無法獲取下載連結`);
      }
      if (!job.publicUrl) {
        throw new Error(`任務未生成下載連結`);
      }
      return job.publicUrl;
    } catch (error) {
      this.logger.error(`獲取下載連結失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  async handleJob(jobData: { jobId: string; novelId: string }) {
    const { jobId, novelId } = jobData;
    this.logger.log(`開始處理 EPUB 轉換任務: ${jobId}`);

    try {
      await this.updateStatus(jobId, EpubJobStatus.PROCESSING);
      const novel = await this.fetchNovel(novelId);
      const novelUrl = this.resolveUrl(novel.source, novel.sourceId);
      const metadata = await this.fetchMetadata(novelUrl);
      const publicUrl = await this.generateEpub(metadata);
      await this.updateStatus(jobId, EpubJobStatus.COMPLETED, publicUrl);
      this.logger.log(`任務 ${jobId} 已成功完成，下載連結: ${publicUrl}`);
    } catch (error) {
      this.logger.error(
        `處理任務 ${jobId} 失敗: ${error.message}`,
        error.stack
      );
      await this.updateStatus(
        jobId,
        EpubJobStatus.FAILED,
        undefined,
        error.message
      );
      throw error;
    }
  }

  async updateStatus(
    jobId: string,
    status: EpubJobStatus,
    publicUrl?: string,
    errorMessage?: string
  ) {
    try {
      const job = await this.epubJobRepository.findOne({
        where: { id: jobId },
      });
      if (!job) {
        throw new Error(`找不到 ID 為 ${jobId} 的任務`);
      }

      job.status = status;

      if (publicUrl) {
        job.publicUrl = publicUrl;
      }

      if (errorMessage) {
        job.errorMessage = errorMessage;
      }

      if (status === EpubJobStatus.PROCESSING && !job.startedAt) {
        job.startedAt = new Date();
      }

      if (
        (status === EpubJobStatus.COMPLETED ||
          status === EpubJobStatus.FAILED) &&
        !job.completedAt
      ) {
        job.completedAt = new Date();
      }

      await this.epubJobRepository.save(job);
      this.logger.log(`已更新任務 ${jobId} 狀態為: ${status}`);
    } catch (error) {
      this.logger.error(`更新任務狀態失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  async fetchNovel(novelId: string) {
    const novel = await this.novelService.findNovelById(novelId);
    if (!novel) {
      throw new Error(`找不到 ID 為 ${novelId} 的小說`);
    }
    this.logger.log(`成功獲取小說 "${novel.title}" 資訊`);
    return novel;
  }

  resolveUrl(source: string, sourceId: string) {
    let novelUrl;
    switch (source) {
      case "narou":
        novelUrl = `https://ncode.syosetu.com/${sourceId}`;
        break;
      case "kakuyomu":
        novelUrl = `https://kakuyomu.jp/works/${sourceId}`;
        break;
      default:
        throw new Error(`不支援的小說來源: ${source}`);
    }
    this.logger.log(`小說 URL 已構建: ${novelUrl}`);
    return novelUrl;
  }

  async fetchMetadata(url: string) {
    this.logger.log(`開始爬取小說 URL: ${url}`);
    if (!this.previewProvider.supports(url)) {
      throw new Error(`不支援的小說網站: ${url}`);
    }

    const novelInfo = await this.previewProvider.fetchNovelInfo(url);
    this.logger.log(`取得小說資料：${novelInfo.novelTitle}`);

    const chapters = [];
    for (const chapter of novelInfo.chapters) {
      const chapterContent = await this.previewProvider.fetchChapterContent(
        chapter.url
      );
      chapters.push({
        chapterTitle: chapter.chapterTitle || "",
        title: chapter.title,
        data: chapterContent,
      });
      this.logger.log(`已爬取章節: ${chapter.title}`);
    }

    return {
      novelTitle: novelInfo.novelTitle,
      novelAuthor: novelInfo.novelAuthor,
      novelDescription: novelInfo.novelDescription,
      chapters,
    };
  }

  async generateEpub(metadata: any) {
    this.logger.log(`開始生成小說 "${metadata.novelTitle}" 的 EPUB`);
    const publicUrl = await this.epubService.generateEpub(metadata);
    this.logger.log(`EPUB 檔案生成並上傳成功，下載連結: ${publicUrl}`);
    return publicUrl;
  }

  async sendNotification(
    email: string,
    novelTitle: string,
    downloadUrl: string
  ) {
    try {
      await this.emailProvider.sendDownloadNotification(
        email,
        novelTitle,
        downloadUrl
      );
      this.logger.log(`已發送通知郵件至: ${email}, 小說: ${novelTitle}`);
    } catch (error) {
      this.logger.error(`發送通知失敗: ${error.message}`, error.stack);
    }
  }
}

export {
  PREVIEW_PROVIDER_TOKEN,
  STORAGE_PROVIDER_TOKEN,
  EMAIL_PROVIDER_TOKEN,
  EpubJobService,
};
