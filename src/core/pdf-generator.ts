/**
 * PDF 生成器
 */

import type { PPTInfo } from '../types';
import {
  downloadImage,
  blobToDataURL,
  loadImage,
  downloadWithConcurrency,
  processImage
} from '../utils/image-downloader';
import { DownloadController } from './download-controller';

import { pdfWorkerEntry } from './pdf-worker';
import { CONFIG } from '../config';

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
 */
export async function generatePDF(
  pptInfo: PPTInfo,
  onProgress?: (current: number, total: number) => void,
  controller?: DownloadController
): Promise<Blob | Blob[]> {
  const { pageCount } = pptInfo;

  // 如果页数在安全范围内，直接生成单个文件
  if (pageCount <= CONFIG.MAX_PAGES_PER_PDF) {
    return generatePDFSegment(pptInfo, 1, pageCount, onProgress, controller);
  } else {
    const parts = Math.ceil(pageCount / CONFIG.MAX_PAGES_PER_PDF);

    const shouldSplit = confirm(
      `当前PPT页数较多(${pageCount}页)，建议分卷下载以避免浏览器崩溃。\n\n` +
      `点击“确定”：自动分为 ${parts} 个文件下载（推荐）\n` +
      `点击“取消”：尝试合并为一个文件下载（风险较大）`
    );

    if (!shouldSplit) {
      console.log(`[PDF生成] 用户选择强制合并下载，共 ${pageCount} 页`);
      return generatePDFSegment(pptInfo, 1, pageCount, onProgress, controller);
    }

    console.log(`[PDF生成] 页数(${pageCount})超过限制(${CONFIG.MAX_PAGES_PER_PDF})，启动自动分卷模式`);

    const results: Blob[] = [];
    
    for (let i = 0; i < parts; i++) {
      controller?.throwIfAborted();

      const startPage = i * CONFIG.MAX_PAGES_PER_PDF + 1;
      const endPage = Math.min((i + 1) * CONFIG.MAX_PAGES_PER_PDF, pageCount);
      
      console.log(`[PDF生成] 开始处理分卷 ${i + 1}/${parts}: 第 ${startPage} - ${endPage} 页`);
      
      // 生成该分卷
      const blob = await generatePDFSegment(pptInfo, startPage, endPage, onProgress, controller);
      results.push(blob);
      
      // 分卷之间稍微休息一下，释放内存
      if (i < parts - 1) {
        await sleep(1000);
      }
    }
    
    return results;
  }
}

/**
 * 生成 PDF 片段
 */
async function generatePDFSegment(
  pptInfo: PPTInfo,
  startPage: number,
  endPage: number,
  onProgress?: (current: number, total: number) => void,
  controller?: DownloadController
): Promise<Blob> {
  const { baseUrl, pageCount: totalTotal } = pptInfo; // totalTotal 用于进度条显示
  
  controller?.throwIfAborted();

  // 1. 获取本卷第一张图片以确定尺寸和初始内容
  console.log(`[PDF生成] 获取第${startPage}页确定基准尺寸...`);
  
  const firstImageUrl = `${baseUrl}${startPage}.png`;
  const firstBlob = await downloadImage(firstImageUrl);
  
  // 处理第一张图片 (转码 JPEG)
  const firstProcessed = await processImage(firstBlob, CONFIG.IMAGE_QUALITY);
  
  // 获取尺寸
  const firstDataUrl = await blobToDataURL(firstBlob); 
  const firstImg = await loadImage(firstDataUrl);

  const pxToMm = 25.4 / 96;
  const pageWidth = firstImg.width * pxToMm;
  const pageHeight = firstImg.height * pxToMm;

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
        firstPageData: firstProcessed.buffer,
        format: firstProcessed.format
      }
    }, [firstProcessed.buffer]);

    // 更新进度
    onProgress?.(startPage, totalTotal);

    // 3. 循环后续页面
    const segmentCount = endPage - startPage;
    const batches = Math.ceil(segmentCount / CONFIG.BATCH_SIZE);

    try {
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        controller?.throwIfAborted();

        const batchStart = startPage + 1 + batchIndex * CONFIG.BATCH_SIZE;
        const batchEnd = Math.min(batchStart + CONFIG.BATCH_SIZE - 1, endPage);
        
        const batchUrls: string[] = [];
        for (let i = batchStart; i <= batchEnd; i++) {
          batchUrls.push(`${baseUrl}${i}.png`);
        }

        console.log(`[PDF生成] 批次处理: 第${batchStart}-${batchEnd}页`);

        // 并发下载 Blob
        const blobs = await downloadWithConcurrency(batchUrls, downloadImage, CONFIG.BATCH_SIZE, controller);
        
        // 处理并发送给 Worker
        for (let i = 0; i < blobs.length; i++) {
          controller?.throwIfAborted();
          const blob = blobs[i];
          if (!blob) continue;

          // 图片转码 (PNG -> JPEG)
          const processed = await processImage(blob, CONFIG.IMAGE_QUALITY);
          const pageNum = batchStart + i;

          worker.postMessage({
            type: 'ADD_PAGE',
            payload: {
              data: processed.buffer,
              pageNum,
              format: processed.format
            }
          }, [processed.buffer]);

          onProgress?.(pageNum, totalTotal);
        }

        await sleep(CONFIG.CPU_COOLDOWN);
      }

      console.log('[PDF生成] 数据发送完毕，正在输出 PDF...');
      worker.postMessage({ type: 'FINISH' });

    } catch (err) {
      worker.terminate();
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
