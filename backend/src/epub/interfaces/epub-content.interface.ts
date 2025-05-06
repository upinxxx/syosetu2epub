// src/epub/interfaces/epubContent.ts
export interface IMyEpubContent {
  id: string;
  href: string;
  title: string;
  data: string;
  url: string | null;
  author: string[];
  filePath: string;
  templatePath: string;
  excludeFromToc: boolean;
  beforeToc: boolean;
  isCover: boolean;
  chapterTitle?: string;
}
