import {
  deref,
  ApolloState,
  buildEpisodeUrl,
} from '../utils/apollo-helpers.js';
import {
  NovelIndex,
  ChapterIndex,
} from '@/domain/ports/crawler.strategy.port.js';
import { fetchPageHtml } from '../utils/fetch-html.js';
import { fixImageUrls } from '../utils/image-url.resolver.js';
export async function crawlChapterContent(url: string): Promise<string> {
  const $ = await fetchPageHtml(url);
  const contentArr: string[] = [];

  $('.widget-episodeBody')
    .children()
    .each((i, element) => {
      const el = $(element);
      let elementHtml = $.html(el);
      contentArr.push(elementHtml);
    });

  const fullHtml = contentArr.join('');
  return await fixImageUrls(fullHtml);
}

export async function crawlNovelIndex(
  url: string,
  withChapters = false,
): Promise<NovelIndex> {
  const $ = await fetchPageHtml(url);
  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (!nextDataScript) {
    throw new Error(
      '找不到 __NEXT_DATA__ 腳本標籤，請確認頁面是否正確 SSR 或是否被阻擋',
    );
  }
  const state: ApolloState =
    JSON.parse(nextDataScript).props.pageProps.__APOLLO_STATE__;

  const workId = extractWorkIdBySplit(url);

  const get = deref(state);
  const work: any = get(`Work:${workId}`);

  if (!work) throw new Error(`Work ${workId} not found`);

  const author: any = get(work.author);

  const novel: NovelIndex = {
    novelTitle: work.title,
    novelAuthor: author?.activityName ?? author?.name ?? 'Unknown',
    novelDescription: `${work.catchphrase ?? ''}${work.introduction ?? ''}`,
    chapters: [],
  };

  if (withChapters) novel.chapters = parseChapters(state, work);

  return novel;
}

export function parseChapters(state: ApolloState, work: any): ChapterIndex[] {
  const get = deref(state);
  const list: ChapterIndex[] = [];

  // 若無二級目錄，fallback 至第一章
  const tocRefs = work.tableOfContents?.length
    ? work.tableOfContents
    : [{ episodeUnions: [work.firstPublicEpisodeUnion] }];

  for (const tocRef of tocRefs) {
    const tocNode: any = get(tocRef);
    const chapterMeta: any = get(tocNode?.chapter);
    const chapterTitle = chapterMeta?.title ?? null;

    for (const epRef of tocNode?.episodeUnions ?? []) {
      const ep: any = get(epRef);
      if (!ep) continue;

      list.push({
        chapterTitle,
        title: ep.title,
        url: buildEpisodeUrl(work.id, ep.id),
      });
    }
  }

  return list;
}

export function extractWorkIdBySplit(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    // pathname 會是 "/works/1177354054886293774"
    const parts = pathname.split('/');
    // parts = ["", "works", "1177354054886293774"]
    return parts[2] ?? null;
  } catch {
    return null;
  }
}
