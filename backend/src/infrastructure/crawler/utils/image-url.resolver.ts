// src/utils/imageUrlResolver.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

// 使用簡單的 Map 作為快取，避免重複對同一個 URL 進行解析
const resolvedUrlCache = new Map<string, string>();

/**
 * Resolve an image URL by sending a HEAD request.
 * If there is a redirect, extract the final URL.
 * Uses caching to reduce redundant network calls.
 */
export async function resolveImageUrl(src: string): Promise<string> {
  if (resolvedUrlCache.has(src)) {
    return resolvedUrlCache.get(src)!;
  }

  try {
    // 使用 HEAD 請求，不跟隨重定向
    await axios.head(src, { maxRedirects: 0 });
    resolvedUrlCache.set(src, src);
    return src;
  } catch (error: any) {
    if (error.response && error.response.headers?.location) {
      const finalUrl = error.response.headers.location;
      resolvedUrlCache.set(src, finalUrl);
      return finalUrl;
    }
    resolvedUrlCache.set(src, src);
    return src;
  }
}

/**
 * Traverse the provided HTML string and fix image URLs:
 * 1. Prepend "https:" for protocol-relative URLs.
 * 2. For URLs matching a specific pattern (e.g. those with "/userpageimage/viewimagebig/"),
 *    resolve the final URL via resolveImageUrl.
 */
export async function fixImageUrls(html: string): Promise<string> {
  const $ = cheerio.load(html);
  const promises: Promise<void>[] = [];

  $('img').each((i, el) => {
    let src = $(el).attr('src');
    if (!src) return;
    // 補全協議
    if (src.startsWith('//')) {
      src = 'https:' + src;
    }
    // 如果 URL 包含指定關鍵字，進行最終 URL 解析
    if (src.includes('/userpageimage/viewimagebig/')) {
      const promise = resolveImageUrl(src)
        .then((finalUrl) => {
          $(el).attr('src', finalUrl);
        })
        .catch((err) => {
          console.error(`Error resolving image URL for ${src}`, err);
        });
      promises.push(promise);
    } else {
      $(el).attr('src', src);
    }
  });

  await Promise.all(promises);
  return $.html();
}
