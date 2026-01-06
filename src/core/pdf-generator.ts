/**
 * PDF 生成器
 */

import type { PPTInfo } from '../types';
import {
  downloadImage,
  downloadImageAsArrayBuffer,
  blobToDataURL,
  loadImage,
  downloadWithConcurrency,
} from '../utils/image-downloader';
import { DownloadController } from './download-controller';

import { pdfWorkerEntry } from './pdf-worker';

/**
 * 延迟执行
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * 创建 Worker 实例
 */
function createWorker(): Worker {
  // 注入全局变量并序列化 Worker 函数
  const jspdfSource = process.env.JSPDF_SOURCE;
  const workerBody = pdfWorkerEntry.toString();
  
  // 引入 jsPDF 包的 umd 版本
  const code = `
    ${jspdfSource}
    ;
    (${workerBody})();
  `;
  
  const blob = new Blob([code], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // 不立即 revoke，确保 Worker 加载完成
  return worker;
}

/**
 * 下载所有图片并生成 PDF
 * 使用 Web Worker 将 CPU 密集型任务移出主线程，解决 UI 卡顿问题
 */
export async function generatePDF(
  pptInfo: PPTInfo,
  onProgress?: (current: number, total: number) => void,
  controller?: DownloadController
): Promise<Blob> {
  const { baseUrl, pageCount } = pptInfo;
  const BATCH_SIZE = 10;
  const CPU_COOLDOWN = 50;

  // 1. 获取第一张图片以确定PDF尺寸
  console.log('[PDF生成] 获取第1页确定尺寸');
  controller?.throwIfAborted();

  // 需要在主线程解析尺寸
  const firstImageUrl = `${baseUrl}1.png`;
  const firstBlob = await downloadImage(firstImageUrl); 
  const firstDataUrl = await blobToDataURL(firstBlob);
  const firstImg = await loadImage(firstDataUrl);

  const pxToMm = 25.4 / 96;
  const pageWidth = firstImg.width * pxToMm;
  const pageHeight = firstImg.height * pxToMm;

  // 将第一张图转为 ArrayBuffer 传给 Worker
  const firstArrayBuffer = await firstBlob.arrayBuffer();

  // 2. 初始化 Worker
  const worker = createWorker();
  
  return new Promise(async (resolve, reject) => {
    // 监听 Worker 消息
    worker.onmessage = (e) => {
      const { type, blob, error } = e.data;
      if (type === 'DONE') {
        resolve(blob);
        worker.terminate();
      } else if (type === 'ERROR') {
        reject(new Error(error));
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    // 发送初始化消息
    worker.postMessage({
      type: 'INIT',
      payload: {
        width: pageWidth,
        height: pageHeight,
        firstPageData: firstArrayBuffer
      }
    }, [firstArrayBuffer]);

    onProgress?.(1, pageCount);

    // 3. 批量下载并发送给 Worker
    const totalPages = pageCount - 1; 
    const batches = Math.ceil(totalPages / BATCH_SIZE);

    try {
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        controller?.throwIfAborted();

        const startPage = batchIndex * BATCH_SIZE + 2;
        const endPage = Math.min(startPage + BATCH_SIZE - 1, pageCount);
        const batchUrls: string[] = [];

        for (let i = startPage; i <= endPage; i++) {
          batchUrls.push(`${baseUrl}${i}.png`);
        }

        console.log(`[PDF生成] 批次${batchIndex + 1}/${batches}: 处理第${startPage}-${endPage}页`);
        
        // 并发下载为 ArrayBuffer
        const buffers = await downloadWithConcurrency(batchUrls, downloadImageAsArrayBuffer, BATCH_SIZE, controller);
        
        // 发送给 Worker
        for (let i = 0; i < buffers.length; i++) {
          controller?.throwIfAborted();
          
          const buffer = buffers[i];
          if (!buffer) continue;
          
          const pageNum = startPage + i;
          
          worker.postMessage({
            type: 'ADD_PAGE',
            payload: {
              data: buffer,
              pageNum
            }
          }, [buffer]);

          onProgress?.(pageNum, pageCount);
        }
        
        await sleep(CPU_COOLDOWN);
      }
      
      console.log('[PDF生成] 所有数据已发送 Worker，等待生成...');
      worker.postMessage({ type: 'FINISH' });

    } catch (err) {
      worker.terminate();
      // 如果是取消错误，直接抛出
      reject(err);
    }
  });
}

/**
 * 保存 PDF 文件
 */
export function savePDF(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
