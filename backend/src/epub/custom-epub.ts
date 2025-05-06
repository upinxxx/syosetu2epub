// /src/epub/my-epub.ts
import { EPub } from '@lesjoursfr/html-to-epub';
import { IMyEpubContent } from './interfaces/epub-content.interface.js'; // ← 引入你剛剛定義的型別

export class MyEpub extends EPub {
  declare content: IMyEpubContent[];

  constructor(options: any, output: string) {
    super(options, output);

    this.content = this.content.map((item, idx) => ({
      ...item,
      chapterTitle: options.content?.[idx]?.chapterTitle ?? '',
    }));
  }
}
