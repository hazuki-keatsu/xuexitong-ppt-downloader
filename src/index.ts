/**
 * 学习通 PPT 下载器
 * 从学习通网页中提取 PPT 预览图片并合成为 PDF
 */

import { DownloadButton } from './ui/download-button';
import { StopButton } from './ui/stop-button';
import { findPPTIframes } from './utils/iframe-helper';
import { extractPPTInfo } from './core/ppt-extractor';
import { generatePDF, savePDF } from './core/pdf-generator';
import { DownloadController, DownloadAbortedError } from './core/download-controller';

class XuexitongPPTDownloader {
  private downloadButtons: DownloadButton[] = [];
  private stopButtons: Map<DownloadButton, StopButton> = new Map();
  private controllers: Map<DownloadButton, DownloadController> = new Map();
  private processedIframes = new WeakMap<HTMLIFrameElement, boolean>();
  private mutationTimeout: number | null = null;

  constructor() {
    this.init();
  }

  /**
   * 初始化下载器
   */
  private init(): void {
    console.log('[PPT下载器] 脚本已启动');
    
    // 等待页面加载完成后添加下载按钮
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.addDownloadButton();
      });
    } else {
      this.addDownloadButton();
    }

    // 监听动态加载的 iframe
    this.observeIframes();
    
    // 定期重试（针对动态加载的内容）
    this.startRetryTimer();
  }
  
  /**
   * 定期重试查找iframe和添加按钮
   */
  private startRetryTimer(): void {
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 1000; // 每秒重试一次
    
    const timer = setInterval(() => {
      retryCount++;
      
      // 检查是否有按钮已挂载
      const hasButtons = this.downloadButtons.some(btn => btn.isMounted());
      if (hasButtons) {
        clearInterval(timer);
        return;
      }
      
      this.addDownloadButton();
      
      if (retryCount >= maxRetries) {
        clearInterval(timer);
      }
    }, retryInterval);
  }

  /**
   * 监听页面中动态加载的 iframe（带节流）
   */
  private observeIframes(): void {
    const observer = new MutationObserver(() => {
      // 节流：300ms内多次变化只触发一次
      if (this.mutationTimeout) {
        clearTimeout(this.mutationTimeout);
      }
      this.mutationTimeout = window.setTimeout(() => {
        this.addDownloadButton();
        this.mutationTimeout = null;
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * 处理下载按钮点击
   */
  private async handleDownload(
    pptIframe: HTMLIFrameElement,
    button: DownloadButton,
    iframeDoc: Document
  ): Promise<void> {
    // 创建下载控制器
    const controller = new DownloadController();
    this.controllers.set(button, controller);

    // 创建并显示停止按钮（锚定在下载按钮右侧）
    const stopButton = new StopButton(() => {
      controller.abort('用户点击停止');
      stopButton.setText('正在停止...');
    }, iframeDoc, button.getElement());
    stopButton.mount();
    this.stopButtons.set(button, stopButton);

    button.updateState('正在获取信息...', true);

    try {
      // 提取 PPT 信息
      const pptInfo = await extractPPTInfo(pptIframe);
      if (!pptInfo) {
        alert('无法获取 PPT 信息，请确保 PPT 已完全加载');
        button.updateState('下载 PPT', false);
        this.cleanupStopButton(button);
        return;
      }

      // 检查是否已取消
      controller.throwIfAborted();

      // 生成 PDF（传入控制器）
      const pdfBlob = await generatePDF(pptInfo, (current, total) => {
        button.updateState(`下载中 ${current}/${total}...`, true);
      }, controller);

      // 保存 PDF
      savePDF(pdfBlob, pptInfo.fileName);

      button.updateState('下载完成！', false);
      setTimeout(() => {
        button.updateState('下载 PPT', false);
      }, 2000);

      console.log('PDF 生成完成:', pptInfo.fileName);
    } catch (error) {
      // 处理取消错误
      if (error instanceof DownloadAbortedError) {
        console.log('[PPT下载器] 下载已被用户取消');
        button.updateState('已取消', false);
        setTimeout(() => {
          button.updateState('下载 PPT', false);
        }, 1500);
      } else {
        console.error('下载失败:', error);
        button.updateState('下载失败', false);

        setTimeout(() => {
          button.updateState('下载 PPT', false);
        }, 2000);

        alert('下载失败，请查看控制台了解详情');
      }
    } finally {
      // 清理停止按钮和控制器
      this.cleanupStopButton(button);
      this.controllers.delete(button);
    }
  }

  /**
   * 清理停止按钮
   */
  private cleanupStopButton(button: DownloadButton): void {
    const stopButton = this.stopButtons.get(button);
    if (stopButton) {
      stopButton.unmount();
      this.stopButtons.delete(button);
    }
  }

  /**
   * 添加下载按钮
   */
  private addDownloadButton(): void {
    // 查找所有 PPT iframe
    const pptIframes = findPPTIframes();
    if (pptIframes.length === 0) return;
    
    let newButtonCount = 0;
    
    // 为每个iframe创建按钮
    for (const pptIframe of pptIframes) {
      // 使用WeakMap缓存，避免重复处理
      if (this.processedIframes.has(pptIframe)) continue;
      
      // 获取iframe的document
      const iframeDoc = pptIframe.contentDocument || pptIframe.contentWindow?.document;
      if (!iframeDoc?.body) continue;
      
      // 创建并添加下载按钮到iframe内部
      const button = new DownloadButton(
        () => this.handleDownload(pptIframe, button, iframeDoc),
        iframeDoc
      );
      button.mount();
      this.downloadButtons.push(button);
      this.processedIframes.set(pptIframe, true);
      newButtonCount++;
    }
    
    if (newButtonCount > 0) {
      console.log(`[PPT下载器] 新增 ${newButtonCount} 个下载按钮，总计 ${this.downloadButtons.length} 个`);
    }
  }
}

// 启动下载器
new XuexitongPPTDownloader();
