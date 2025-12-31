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

// 动态导入类型，避免循环依赖
import type { DownloadController } from '../core/download-controller';

/**
 * 并发控制：限制同时执行的Promise数量
 * 使用 GM_xmlhttpRequest 下载，支持通过 controller 取消
 */
export async function downloadWithConcurrency(
  urls: string[],
  concurrency: number = 5,
  controller?: DownloadController
): Promise<Blob[]> {
  const results: Blob[] = new Array(urls.length);
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

      // 使用 GM_xmlhttpRequest 下载（绕过 CORS，同时利用浏览器 HTTP 缓存）
      results[index] = await downloadImage(url);
    })();

    const wrappedPromise = promise.then(() => {
      executing.splice(executing.indexOf(wrappedPromise), 1);
    });

    executing.push(wrappedPromise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  // 等待已启动的任务完成（即使取消了也要等待当前任务）
  await Promise.all(executing);
  return results;
}
