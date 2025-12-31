/**
 * 学习通 PPT 下载器
 * 从学习通网页中提取 PPT 预览图片并合成为 PDF
 */

import { DownloadButton } from './ui/download-button';
import { findPPTIframe } from './utils/iframe-helper';
import { extractPPTInfo } from './core/ppt-extractor';
import { generatePDF, savePDF } from './core/pdf-generator';

class XuexitongPPTDownloader {
  private downloadButton: DownloadButton | null = null;

  constructor() {
    this.init();
  }

  /**
   * 初始化下载器
   */
  private init(): void {
    // 等待页面加载完成后添加下载按钮
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.addDownloadButton());
    } else {
      this.addDownloadButton();
    }

    // 监听动态加载的 iframe
    this.observeIframes();
  }

  /**
   * 监听页面中动态加载的 iframe
   */
  private observeIframes(): void {
    const observer = new MutationObserver(() => {
      this.addDownloadButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * 处理下载按钮点击
   */
  private async handleDownload(): Promise<void> {
    if (!this.downloadButton) return;

    const pptIframe = findPPTIframe();
    if (!pptIframe) {
      alert('未找到 PPT 预览窗口');
      return;
    }

    this.downloadButton.updateState('正在获取信息...', true);

    try {
      // 提取 PPT 信息
      const pptInfo = await extractPPTInfo(pptIframe);
      if (!pptInfo) {
        alert('无法获取 PPT 信息，请确保 PPT 已完全加载');
        this.downloadButton.updateState('下载 PPT', false);
        return;
      }

      // 生成 PDF
      const pdfBlob = await generatePDF(pptInfo, (current, total) => {
        this.downloadButton?.updateState(`下载中 ${current}/${total}...`, true);
      });

      // 保存 PDF
      savePDF(pdfBlob, pptInfo.fileName);

      this.downloadButton.updateState('下载完成！', false);
      setTimeout(() => {
        this.downloadButton?.updateState('下载 PPT', false);
      }, 2000);

      console.log('PDF 生成完成:', pptInfo.fileName);
    } catch (error) {
      console.error('下载失败:', error);
      this.downloadButton.updateState('下载失败', false);

      setTimeout(() => {
        this.downloadButton?.updateState('下载 PPT', false);
      }, 2000);

      alert('下载失败，请查看控制台了解详情');
    }
  }

  /**
   * 添加下载按钮
   */
  private addDownloadButton(): void {
    // 避免重复添加按钮
    if (this.downloadButton?.isMounted()) {
      return;
    }

    // 查找 PPT iframe
    const pptIframe = findPPTIframe();
    if (!pptIframe) {
      return;
    }

    // 创建并添加下载按钮
    this.downloadButton = new DownloadButton(() => this.handleDownload());
    this.downloadButton.mount();
  }
}

// 启动下载器
new XuexitongPPTDownloader();
