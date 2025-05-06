import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EpubService } from '@epub/epub.service.js';

@Processor('epub-queue', {
  connection: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
})
export class EpubProcessor extends WorkerHost {
  constructor(private readonly epubService: EpubService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`處理任務: ${job.id}`, job.data);
    return this.epubService.generateEpub(job.data.url);
  }

  async onCompleted(job: Job<any, any, string>): Promise<void> {
    console.log(`任務完成: ${job.id}`);
  }

  async onFailed(job: Job<any, any, string>, err: Error): Promise<void> {
    console.error(`任務失敗: ${job.id}`, err);
  }
}
