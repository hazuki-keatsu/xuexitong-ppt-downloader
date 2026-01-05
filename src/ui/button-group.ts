/**
 * 按钮组 UI 组件
 * 封装下载按钮和停止按钮
 */

import { DownloadButton } from './download-button';
import { StopButton } from './stop-button';

export class ButtonGroup {
  private container: HTMLDivElement;
  private downloadButton: DownloadButton;
  private stopButton: StopButton;
  private targetDocument: Document;

  constructor(
    onDownload: () => void,
    onStop: () => void,
    targetDocument: Document = document
  ) {
    this.targetDocument = targetDocument;
    this.container = this.createContainer();
    
    // 创建下载按钮
    this.downloadButton = new DownloadButton(onDownload, targetDocument);
    this.setupButtonStyle(this.downloadButton.getElement());
    
    // 创建停止按钮
    this.stopButton = new StopButton(onStop, targetDocument);
    this.setupButtonStyle(this.stopButton.getElement());
    
    // 初始隐藏停止按钮
    this.stopButton.getElement().style.display = 'none';

    // 将按钮添加到容器
    this.container.appendChild(this.downloadButton.getElement());
    this.container.appendChild(this.stopButton.getElement());
  }

  /**
   * 创建容器元素
   */
  private createContainer(): HTMLDivElement {
    const div = this.targetDocument.createElement('div');
    div.className = 'Downloader ButtonGroup';
    div.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 4px;
      z-index: 9999;
      display: flex;
      gap: 8px;
      align-items: center;
    `;
    return div;
  }

  /**
   * 设置按钮样式以适应组布局
   */
  private setupButtonStyle(button: HTMLButtonElement): void {
    // 重置定位属性，使其遵循 Flex 布局
    button.style.position = 'static';
    button.style.bottom = 'auto';
    button.style.left = 'auto';
    button.style.margin = '0';
    // 移除阴影以免重叠或看起来奇怪（可选，视视觉效果而定）
    // button.style.boxShadow = 'none'; 
  }

  /**
   * 挂载组件
   */
  public mount(container?: HTMLElement | null): void {
    const target = container || this.targetDocument.body;
    
    // 如果有指定容器，且不是 body，可能需要调整容器的定位策略
    if (container) {
      this.container.style.position = 'absolute'; 
    } else {
      this.container.style.position = 'fixed';
    }

    if (target && !target.contains(this.container)) {
      target.appendChild(this.container);
    }
  }

  /**
   * 卸载组件
   */
  public unmount(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * 开始下载状态
   */
  public startDownload(): void {
    this.stopButton.getElement().style.display = 'block';
    this.stopButton.setText('停止');
  }

  /**
   * 结束下载状态
   */
  public finishDownload(): void {
    this.stopButton.getElement().style.display = 'none';
  }

  /**
   * 更新下载按钮状态
   */
  public updateDownloadState(text: string, disabled: boolean): void {
    this.downloadButton.updateState(text, disabled);
  }

  /**
   * 更新停止按钮文本
   */
  public updateStopText(text: string): void {
    this.stopButton.setText(text);
  }

  /**
   * 检查是否已挂载
   */
  public isMounted(): boolean {
    return !!(this.container.parentNode);
  }
}
