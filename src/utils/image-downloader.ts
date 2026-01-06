/**
 * 图片下载工具
 */

/**
 * 使用 GM_xmlhttpRequest 下载图片
 */
export function downloadImage(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      responseType: 'blob',
      onload: (response) => {
        if (response.status === 200) {
          resolve(response.response as Blob);
        } else {
          reject(new Error(`下载失败: ${response.status}`));
        }
      },
      onerror: (error) => {
        reject(new Error(`网络错误: ${error}`));
      },
    });
  });
}

/**
 * 使用 GM_xmlhttpRequest 下载图片为 ArrayBuffer
 */
export function downloadImageAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      onload: (response) => {
        if (response.status === 200) {
          resolve(response.response as ArrayBuffer);
        } else {
          reject(new Error(`下载失败: ${response.status}`));
        }
      },
      onerror: (error) => {
        reject(new Error(`网络错误: ${error}`));
      },
    });
  });
}

/**
 * 将 Blob 转换为 Data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 加载图片并获取尺寸
 */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

import type { DownloadController } from '../core/download-controller';

/**
 * 通用的并发下载函数
 */
export async function downloadWithConcurrency<T>(
  urls: string[],
  downloadFn: (url: string) => Promise<T>,
  concurrency: number = 5,
  controller?: DownloadController
): Promise<T[]> {
  const results: T[] = new Array(urls.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < urls.length; i++) {
    // 每次开始新下载前检查是否已取消
    if (controller?.isAborted) {
      console.log(`[下载] 检测到取消信号，停止新的下载任务`);
      break;
    }

    const index = i;
    const url = urls[index];

    const promise = (async () => {
      // 再次检查是否取消
      if (controller?.isAborted) return;

      try {
        results[index] = await downloadFn(url);
      } catch (error) {
        console.error(`下载失败: ${url}`, error);
      }
    })();

    const wrappedPromise = promise.then(() => {
      executing.splice(executing.indexOf(wrappedPromise), 1);
    });

    executing.push(wrappedPromise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  // 等待已启动的任务完成
  await Promise.all(executing);
  return results;
}
