/**
 * 学习通 PPT 下载器
 * 从学习通网页中提取 PPT 预览图片并合成为 PDF
 */

import { ButtonGroup } from './ui/button-group';
import { findPPTIframes } from './utils/iframe-helper';
import { extractPPTInfo } from './core/ppt-extractor';
import { generatePDF, savePDF } from './core/pdf-generator';
import { DownloadController, DownloadAbortedError } from './core/download-controller';

class XuexitongPPTDownloader {
  private buttonGroups: ButtonGroup[] = [];
  private controllers: Map<ButtonGroup, DownloadController> = new Map();
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

    this.observeIframes();
    
    this.startRetryTimer();
  }
  
  /**
   * 定期重试查找iframe和添加按钮
   */
  private startRetryTimer(): void {
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 2000;
    
    const timer = setInterval(() => {
      retryCount++;
      
      // 检查是否有按钮已挂载
      const hasButtons = this.buttonGroups.some(btn => btn.isMounted());
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
   * 监听页面中动态加载的 iframe
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
    buttonGroup: ButtonGroup,
    iframeDoc: Document
  ): Promise<void> {
    // 创建下载控制器
    const controller = new DownloadController();
    this.controllers.set(buttonGroup, controller);

    // 切换到下载状态
    buttonGroup.startDownload();
    buttonGroup.updateDownloadState('正在获取信息...', true);

    try {
      // 提取 PPT 信息
      const pptInfo = await extractPPTInfo(pptIframe);
      if (!pptInfo) {
        alert('无法获取 PPT 信息，请确保 PPT 已完全加载');
        buttonGroup.updateDownloadState('下载 PPT', false);
        buttonGroup.finishDownload();
        return;
      }

      // 检查是否已取消
      controller.throwIfAborted();

      // 生成 PDF (可能返回单个 Blob 或 Blob 数组)
      const result = await generatePDF(pptInfo, (current, total) => {
        buttonGroup.updateDownloadState(`下载中 ${current}/${total}...`, true);
      }, controller);

      // 保存 PDF
      if (Array.isArray(result)) {
        // 分卷保存
        result.forEach((blob, index) => {
          // 移除扩展名，加上后缀
          const name = pptInfo.fileName.replace(/\.pdf$/i, '');
          const partName = `${name}_Part${index + 1}.pdf`;
          savePDF(blob, partName);
        });
      } else {
        // 单个文件保存
        savePDF(result, pptInfo.fileName);
      }

      buttonGroup.updateDownloadState('下载完成！', false);
      setTimeout(() => {
        buttonGroup.updateDownloadState('下载 PPT', false);
      }, 2000);

      console.log('PDF 生成完成:', pptInfo.fileName);
    } catch (error) {
      // 处理取消错误
      if (error instanceof DownloadAbortedError) {
        console.log('[PPT下载器] 下载已被用户取消');
        buttonGroup.updateDownloadState('已取消', false);
        setTimeout(() => {
          buttonGroup.updateDownloadState('下载 PPT', false);
        }, 1500);
      } else {
        console.error('下载失败:', error);
        buttonGroup.updateDownloadState('下载失败', false);

        setTimeout(() => {
          buttonGroup.updateDownloadState('下载 PPT', false);
        }, 2000);

        alert('下载失败，请查看控制台了解详情');
      }
    } finally {
      // 结束下载状态
      buttonGroup.finishDownload();
      this.controllers.delete(buttonGroup);
    }
  }

  /**
   * 处理停止按钮点击
   */
  private handleStop(buttonGroup: ButtonGroup): void {
    const controller = this.controllers.get(buttonGroup);
    if (controller) {
      controller.abort('用户点击停止');
      buttonGroup.updateStopText('正在停止...');
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
    
    // 为每个 iframe 创建按钮
    for (const pptIframe of pptIframes) {
      // 使用 WeakMap 缓存，避免重复处理
      if (this.processedIframes.has(pptIframe)) continue;
      
      // 获取 iframe 的 document
      const iframeDoc = pptIframe.contentDocument || pptIframe.contentWindow?.document;
      if (!iframeDoc?.body) continue;
      
      // 尝试查找 navigation 容器
      const navContainer = iframeDoc.getElementById('navigation');
      
      // 创建并添加按钮组到 iframe 内部
      const buttonGroup = new ButtonGroup(
        () => this.handleDownload(pptIframe, buttonGroup, iframeDoc),
        () => this.handleStop(buttonGroup),
        iframeDoc
      );
      
      buttonGroup.mount(navContainer);
      this.buttonGroups.push(buttonGroup);
      this.processedIframes.set(pptIframe, true);
      newButtonCount++;
    }
    
    if (newButtonCount > 0) {
      console.log(`[PPT下载器] 新增 ${newButtonCount} 个下载按钮，总计 ${this.buttonGroups.length} 个`);
    }
  }
}

// 启动下载器
new XuexitongPPTDownloader();
