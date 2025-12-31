/**
 * PDF 生成器
 */

import { jsPDF } from 'jspdf';
import type { PPTInfo } from '../types';
import { downloadImage, blobToDataURL, loadImage } from '../utils/image-downloader';

/**
 * 下载所有图片并生成 PDF
 */
export async function generatePDF(
  pptInfo: PPTInfo,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const { baseUrl, pageCount } = pptInfo;

  // 首先下载第一张图片以确定PDF尺寸
  const firstImageUrl = `${baseUrl}1.png`;
  const firstBlob = await downloadImage(firstImageUrl);
  const firstDataUrl = await blobToDataURL(firstBlob);
  const firstImg = await loadImage(firstDataUrl);

  // 根据第一张图片的实际尺寸创建 PDF
  // 将像素转换为毫米 (假设 96 DPI: 1 inch = 25.4mm, 1 inch = 96 pixels)
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

  // 下载并添加其余页面
  for (let i = 2; i <= pageCount; i++) {
    const imageUrl = `${baseUrl}${i}.png`;
    console.log(`正在下载第 ${i} 页:`, imageUrl);

    try {
      const blob = await downloadImage(imageUrl);
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
      onProgress?.(i, pageCount);
    } catch (error) {
      console.error(`第 ${i} 页下载失败:`, error);
      // 继续下载其他页面
    }
  }

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
