/**
 * 下载按钮 UI 组件
 */

export class DownloadButton {
  private button: HTMLButtonElement;
  private onClick: () => void;
  private targetDocument: Document;

  constructor(onClick: () => void, targetDocument: Document = document) {
    this.onClick = onClick;
    this.targetDocument = targetDocument;
    this.button = this.createButton();
  }

  /**
   * 创建下载按钮
   */
  private createButton(): HTMLButtonElement {
    const button = this.targetDocument.createElement('button');
    button.textContent = '下载 PPT';
    button.className = 'Downloader Button';
    button.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 4px;
      z-index: 9999;
      padding: 10px 20px;
      background: rgb(51,103,213);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
    `;

    // 添加悬停效果（使用passive提升性能）
    button.addEventListener('mouseenter', () => {
      if (!button.disabled) {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      }
    }, { passive: true });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    }, { passive: true });

    // 绑定点击事件
    button.addEventListener('click', () => {
      if (!button.disabled) {
        this.onClick();
      }
    });

    return button;
  }

  /**
   * 添加按钮到页面
   * @param container 可选的容器元素，默认为 body
   */
  public mount(container?: HTMLElement | null): void {
    const target = container || this.targetDocument.body;
    if (target && !target.contains(this.button)) {
      target.appendChild(this.button);
    }
  }

  /**
   * 从页面移除按钮
   */
  public unmount(): void {
    if (this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }

  /**
   * 检查按钮是否已挂载
   */
  public isMounted(): boolean {
    const targetBody = this.targetDocument.body;
    return targetBody ? targetBody.contains(this.button) : false;
  }

  /**
   * 更新按钮文本
   */
  public setText(text: string): void {
    this.button.textContent = text;
  }

  /**
   * 设置按钮禁用状态
   */
  public setDisabled(disabled: boolean): void {
    this.button.disabled = disabled;
    this.button.style.opacity = disabled ? '0.6' : '1';
    this.button.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  /**
   * 更新按钮状态
   */
  public updateState(text: string, disabled: boolean): void {
    this.setText(text);
    this.setDisabled(disabled);
  }

  /**
   * 获取按钮元素（用于定位其他元素）
   */
  public getElement(): HTMLButtonElement {
    return this.button;
  }
}
