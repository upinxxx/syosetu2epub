// src/crawler/utils/narou.crawler.ts

import { CheerioAPI } from 'cheerio';
import { fixImageUrls } from '../utils/image-url.resolver.js';
import {
  ChapterIndex,
  NovelIndex,
} from '../../../domain/ports/crawler.strategy.port.js';
import { fetchPageHtml } from '../utils/fetch-html.js';

/**
 * 使用 narou syosetu 網站結構抓取章節內容
 * @param url 章節 URL（例如 "/123456/"，需要組合完整網址）
 * @returns 章節內容 HTML（已修正圖片 URL）
 */
export async function crawlChapterContent(url: string): Promise<string> {
  const $ = await fetchPageHtml(url);
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
}

/**
 * 依據 narou syosetu 網站結構抓取小說基本資訊與章節列表
 * @param baseUrl 小說的基本 URL（不含分頁參數）
 * @returns NovelData 物件
 */
export async function crawlNovelIndex(baseUrl: string): Promise<NovelIndex> {
  // 第一頁 URL（若已含參數則使用原網址）
  const firstPageUrl = baseUrl.includes('?') ? baseUrl : `${baseUrl}?p=1`;
  const $ = await fetchPageHtml(firstPageUrl);

  // 取得小說基本資訊（以第一頁為準）
  const novelTitle = $('.p-novel__title').text().trim();
  const novelAuthor = $('.p-novel__author > a').text().trim();
  const novelDescription = $('.p-novel__summary').text().trim();
  // 單頁小說
  if (!novelDescription) {
    return {
      novelTitle,
      novelAuthor,
      novelDescription,
      chapters: [{ chapterTitle: null, title: novelTitle, url: baseUrl }],
    };
  }
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

  let allChapters: ChapterIndex[] = [];
  let currentChapterTitle: string | null = null;

  for (let p = 1; p <= maxPage; p++) {
    const pageUrl = `${baseUrl}?p=${p}`;
    const pageHtml = await fetchPageHtml(pageUrl);
    const result = parseChapters(pageHtml, currentChapterTitle);
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
 * 解析頁面 HTML，從中抽取章節資料
 * @param $ 網頁 HTML
 * @param currentChapterTitle 當前章節標題
 * @returns 章節列表與最後一個章節標題
 */
function parseChapters(
  $: CheerioAPI,
  currentChapterTitle: string | null = null,
): { chapters: ChapterIndex[]; lastChapterTitle: string | null } {
  const chapters: ChapterIndex[] = [];

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
