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

/**
 * 并发控制：限制同时执行的Promise数量
 */
export async function downloadWithConcurrency(
  urls: string[],
  concurrency: number = 5
): Promise<Blob[]> {
  const results: Blob[] = new Array(urls.length);
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    const index = i;
    const promise = downloadImage(urls[index]).then(blob => {
      results[index] = blob;
    });
    
    const wrappedPromise = promise.then(() => {
      executing.splice(executing.indexOf(wrappedPromise), 1);
    });
    
    executing.push(wrappedPromise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
}
