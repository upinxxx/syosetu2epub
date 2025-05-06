// src/crawler/utils/syosetu.crawler.ts

import axios from 'axios';
import * as cheerio from 'cheerio';
import { fixImageUrls } from './image-url.resolver.js';

const MAX_RETRIES = 3; // 最大重試次數
const RETRY_DELAY = 1000; // 重試間隔時間（毫秒）

// 定義每個章節的介面
export interface Chapter {
  chapterTitle: string | null;
  title: string;
  url: string;
}

// 定義小說基本資訊介面
export interface NovelInfo {
  novelTitle: string;
  novelAuthor: string;
  novelDescription: string;
  chapters: Chapter[];
}

/**
 * 解析頁面 HTML，從中抽取章節資料
 * @param html 網頁 HTML
 * @param currentChapterTitle 當前章節標題
 * @returns 章節列表與最後一個章節標題
 */
function parseChaptersFromHtml(
  html: string,
  currentChapterTitle: string | null = null,
): { chapters: Chapter[]; lastChapterTitle: string | null } {
  const $ = cheerio.load(html);
  const chapters: Chapter[] = [];

  $('.p-eplist')
    .children()
    .each((i, elem) => {
      const el = $(elem);
      if (el.hasClass('p-eplist__chapter-title')) {
        // 更新當前章節標題
        currentChapterTitle = el.text().trim();
      } else if (el.hasClass('p-eplist__sublist')) {
        // 小節：取得連結與章節標題
        const link = el.find('a.p-eplist__subtitle');
        if (link.length > 0) {
          const subTitle = link.text().trim();
          const linkHref = link.attr('href');
          const subUrl = linkHref
            ? 'https://ncode.syosetu.com/' + linkHref
            : '';
          chapters.push({
            chapterTitle: currentChapterTitle,
            title: subTitle,
            url: subUrl,
          });
        }
      }
    });
  return { chapters, lastChapterTitle: currentChapterTitle };
}
/**
 * 輔助函式：取得指定頁面的 HTML，並支援重試
 * @param pageUrl 頁面 URL
 */
async function fetchPageHtml(pageUrl: string): Promise<string> {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      const response = await axios.get(pageUrl);
      return response.data;
    } catch (error) {
      attempts++;
      console.error(`Failed to fetch ${pageUrl}, attempt ${attempts}:`, error);
      if (attempts < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Failed to fetch page HTML');
}

/**
 * 依據 syosetu 網站結構抓取小說基本資訊與章節列表
 * @param baseUrl 小說的基本 URL（不含分頁參數）
 * @returns NovelInfo 物件
 */
export async function syosetuNovelInfoCrawler(
  baseUrl: string,
): Promise<NovelInfo> {
  // 第一頁 URL（若已含參數則使用原網址）
  const firstPageUrl = baseUrl.includes('?') ? baseUrl : `${baseUrl}?p=1`;
  const firstHtml = await fetchPageHtml(firstPageUrl);
  const $ = cheerio.load(firstHtml);

  // 取得小說基本資訊（以第一頁為準）
  const novelTitle = $('.p-novel__title').text().trim();
  const novelAuthor = $('.p-novel__author > a').text().trim();
  const novelDescription = $('.p-novel__summary').text().trim();

  // 判斷最大頁數
  let maxPage = 1;
  const lastPager = $('.c-pager__item.c-pager__item--last');
  if (lastPager.length > 0) {
    const href = lastPager.attr('href') || '';
    const match = href.match(/[\?&]p=(\d+)/);
    if (match && match[1]) {
      maxPage = parseInt(match[1], 10);
    }
  }

  let allChapters: Chapter[] = [];
  let currentChapterTitle: string | null = null;

  for (let p = 1; p <= maxPage; p++) {
    const pageUrl = `${baseUrl}?p=${p}`;
    const pageHtml = await fetchPageHtml(pageUrl);
    const result = parseChaptersFromHtml(pageHtml, currentChapterTitle);
    currentChapterTitle = result.lastChapterTitle;
    allChapters = allChapters.concat(result.chapters);
  }

  return {
    novelTitle,
    novelAuthor,
    novelDescription,
    chapters: allChapters,
  };
}

/**
 * 使用 syosetu 網站結構抓取章節內容
 * @param url 章節 URL（例如 "/123456/"，需要組合完整網址）
 * @returns 章節內容 HTML（已修正圖片 URL）
 */
export async function syosetuChapterContentCrawler(
  url: string,
): Promise<string> {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      const response = await axios.get(url);
      const html = response.data;
      const $ = cheerio.load(html);
      const contentArr: string[] = [];

      $('.p-novel__body')
        .children()
        .each((i, element) => {
          const el = $(element);
          let elementHtml = $.html(el);
          if (el.hasClass('p-novel__text--afterword')) {
            elementHtml = '<hr>' + elementHtml;
          }
          if (el.hasClass('p-novel__text--preface')) {
            elementHtml = elementHtml + '<hr>';
          }
          contentArr.push(elementHtml);
        });

      const fullHtml = contentArr.join('');
      return await fixImageUrls(fullHtml);
    } catch (error: any) {
      attempts++;
      console.error(
        `An error occurred while scraping chapter content, attempt ${attempts}:`,
        error,
      );
      if (attempts < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Failed to scrape content');
}
