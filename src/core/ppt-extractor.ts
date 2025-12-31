/**
 * PPT 信息提取器
 */

import type { PPTInfo } from '../types';
import { waitForIframeLoad } from '../utils/iframe-helper';

/**
 * 从 iframe 中提取 PPT 信息
 */
export async function extractPPTInfo(
  pptIframe: HTMLIFrameElement
): Promise<PPTInfo | null> {
  try {
    // 获取 data 属性中的信息
    const dataAttr = pptIframe.getAttribute('data');
    let fileName = 'download.pdf';

    if (dataAttr) {
      try {
        const data = JSON.parse(dataAttr);
        fileName = data.name?.replace(/\.(pptx?|pdf)$/i, '.pdf') || 'download.pdf';
      } catch (e) {
        console.warn('无法解析 data 属性:', e);
      }
    }

    // 等待 iframe 加载完成
    await waitForIframeLoad(pptIframe);

    const iframeDoc = pptIframe.contentDocument || pptIframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('无法访问 iframe 内容');
    }

    // 查找内部的 panView iframe
    const panViewIframe = iframeDoc.getElementById('panView') as HTMLIFrameElement;
    if (!panViewIframe) {
      throw new Error('未找到 panView iframe');
    }

    // 等待 panView iframe 加载完成
    await waitForIframeLoad(panViewIframe);

    const panViewDoc = panViewIframe.contentDocument || panViewIframe.contentWindow?.document;
    if (!panViewDoc) {
      throw new Error('无法访问 panView iframe 内容');
    }

    // 查找所有图片元素
    const anchorElements = panViewDoc.querySelectorAll('li[id^="anchor"]');
    if (anchorElements.length === 0) {
      throw new Error('未找到任何 PPT 图片');
    }

    // 从第一个图片提取基础 URL
    const firstImg = anchorElements[0].querySelector('img') as HTMLImageElement;
    if (!firstImg || !firstImg.src) {
      throw new Error('无法获取图片 URL');
    }

    console.log(`[PPT提取] 找到 ${anchorElements.length} 张图片`);

    // 提取基础 URL（去掉文件名部分）
    const baseUrl = firstImg.src.replace(/\/\d+\.png$/, '/');
    const pageCount = anchorElements.length;

    return {
      baseUrl,
      pageCount,
      fileName,
    };
  } catch (error) {
    console.error('提取 PPT 信息失败:', error);
    return null;
  }
}
