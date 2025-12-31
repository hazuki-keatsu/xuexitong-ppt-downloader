/**
 * PDF 生成器
 */

import { jsPDF } from 'jspdf';
import type { PPTInfo } from '../types';
import { downloadImage, blobToDataURL, loadImage, downloadWithConcurrency } from '../utils/image-downloader';

/**
 * 延迟执行，降低CPU占用
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 下载所有图片并生成 PDF
 * 优化点：
 * 1. 批量并发下载（5个并发），提升下载速度
 * 2. 边下载边处理，及时释放内存
 * 3. 添加延迟降低CPU占用
 */
export async function generatePDF(
  pptInfo: PPTInfo,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const { baseUrl, pageCount } = pptInfo;
  const BATCH_SIZE = 15; // 并发数量
  const CPU_COOLDOWN = 20; // 冷却时间
  const YIELD_INTERVAL = 3; // 每一批次的处理的图片数

  // 首先下载第一张图片以确定PDF尺寸
  console.log('[PDF生成] 下载第1页确定尺寸');
  const firstImageUrl = `${baseUrl}1.png`;
  const firstBlob = await downloadImage(firstImageUrl);
  const firstDataUrl = await blobToDataURL(firstBlob);
  const firstImg = await loadImage(firstDataUrl);

  // 根据第一张图片的实际尺寸创建 PDF
  const pxToMm = 25.4 / 96;
  const pageWidth = firstImg.width * pxToMm;
  const pageHeight = firstImg.height * pxToMm;

  const pdf = new jsPDF({
    orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
  });

  // 添加第一页
  pdf.addImage(firstDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
  onProgress?.(1, pageCount);
  
  // 分批并发下载并处理剩余页面
  const totalPages = pageCount - 1; // 减去第一页
  const batches = Math.ceil(totalPages / BATCH_SIZE);
  
  console.log(`[PDF生成] 开始批量下载，共${totalPages}页，分${batches}批，每批${BATCH_SIZE}个并发`);

  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    const startPage = batchIndex * BATCH_SIZE + 2; // 从第2页开始
    const endPage = Math.min(startPage + BATCH_SIZE - 1, pageCount);
    const batchUrls: string[] = [];
    
    for (let i = startPage; i <= endPage; i++) {
      batchUrls.push(`${baseUrl}${i}.png`);
    }
    
    console.log(`[PDF生成] 批次${batchIndex + 1}/${batches}: 并发下载第${startPage}-${endPage}页`);
    
    try {
      // 并发下载这一批图片
      const blobs = await downloadWithConcurrency(batchUrls, BATCH_SIZE);
      
      // 逐个处理并添加到PDF（边处理边释放）
      for (let i = 0; i < blobs.length; i++) {
        const pageNum = startPage + i;
        const blob = blobs[i];
        
        if (!blob) {
          console.warn(`[PDF生成] 第${pageNum}页下载失败，跳过`);
          continue;
        }
        
        try {
          // 转换为DataURL并加载
          const dataUrl = await blobToDataURL(blob);
          const img = await loadImage(dataUrl);
          
          // 添加新页面
          pdf.addPage([pageWidth, pageHeight]);
          
          // 计算图片尺寸（保持原始比例，适应页面）
          const imgWidth = img.width * pxToMm;
          const imgHeight = img.height * pxToMm;
          
          let width = imgWidth;
          let height = imgHeight;
          let x = 0;
          let y = 0;
          
          // 如果图片尺寸与第一张不同，进行缩放以适应页面
          if (imgWidth > pageWidth || imgHeight > pageHeight) {
            const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
            width = imgWidth * ratio;
            height = imgHeight * ratio;
            x = (pageWidth - width) / 2;
            y = (pageHeight - height) / 2;
          }
          
          pdf.addImage(dataUrl, 'PNG', x, y, width, height);
          onProgress?.(pageNum, pageCount);
          
          // 每处理YIELD_INTERVAL页后yield一次，让浏览器呼吸
          if (i % YIELD_INTERVAL === 0) {
            await sleep(0); // yield给主线程
          }
          
          // 处理完后，blob和dataUrl会自动被GC回收
          // img对象也会在作用域外被回收
        } catch (error) {
          console.error(`[PDF生成] 第${pageNum}页处理失败:`, error);
        }
      }
      
      // 批次处理完后暂停一小段时间，降低CPU占用
      await sleep(CPU_COOLDOWN);
      
    } catch (error) {
      console.error(`[PDF生成] 批次${batchIndex + 1}下载失败:`, error);
    }
  }
  
  console.log('[PDF生成] 所有页面处理完毕，生成PDF文件');
  return pdf.output('blob');
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
