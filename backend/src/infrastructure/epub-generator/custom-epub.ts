// /src/epub/my-epub.ts
import { EPub } from '@lesjoursfr/html-to-epub';
import { IMyEpubContent } from './interfaces/epub-generator.interface.js'; // ← 引入你剛剛定義的型別

export class MyEpub extends EPub {
  declare content: IMyEpubContent[];
  private options: any;

  constructor(options: any, output: string) {
    super(options, output);
    this.options = options;

    this.content = this.content.map((item, idx) => ({
      ...item,
      chapterTitle: options.content?.[idx]?.chapterTitle ?? '',
    }));
  }

  async render(): Promise<{ result: string }> {
    // 確保 description 正確傳遞到模板
    if (this.options.description) {
      // @ts-ignore - 確保 description 可以被覆寫
      this.options.description = this.options.description;
    }

    return await super.render();
  }
}
