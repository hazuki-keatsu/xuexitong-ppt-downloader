/**
 * 停止按钮 UI 组件
 */

export class StopButton {
  private button: HTMLButtonElement;
  private onClick: () => void;
  private targetDocument: Document;
  private anchorElement?: HTMLElement;

  constructor(onClick: () => void, targetDocument: Document = document, anchorElement?: HTMLElement) {
    this.onClick = onClick;
    this.targetDocument = targetDocument;
    this.anchorElement = anchorElement;
    this.button = this.createButton();
  }

  /**
   * 创建停止按钮
   */
  private createButton(): HTMLButtonElement {
    const button = this.targetDocument.createElement('button');
    button.textContent = '停止';
    button.className = 'Downloader StopButton';
    button.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 4px;
      z-index: 9999;
      padding: 10px 16px;
      background: rgb(220, 53, 69);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
      transition: all 0.3s ease;
    `;

    // 添加悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.6)';
    }, { passive: true });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.4)';
    }, { passive: true });

    // 绑定点击事件
    button.addEventListener('click', () => {
      this.onClick();
    });

    return button;
  }

  /**
   * 更新按钮位置，使其位于锚点元素右侧4px
   */
  private updatePosition(): void {
    if (this.anchorElement) {
      // 使用 requestAnimationFrame 确保在渲染后再计算位置
      requestAnimationFrame(() => {
        // 如果和锚点在同一个容器，使用 offsetLeft 计算相对位置
        if (this.button.parentNode === this.anchorElement!.parentNode) {
          const left = this.anchorElement!.offsetLeft + this.anchorElement!.offsetWidth + 4;
          this.button.style.left = `${left}px`;
          // 复制锚点的 bottom 样式，保持垂直对齐
          this.button.style.bottom = this.anchorElement!.style.bottom || '4px';
        } else {
          // 降级方案：使用 getBoundingClientRect (针对不同容器的情况)
          const rect = this.anchorElement!.getBoundingClientRect();
          this.button.style.left = `${rect.right + 4}px`;
          this.button.style.bottom = '4px';
        }
      });
    }
  }

  /**
   * 添加按钮到页面
   */
  public mount(): void {
    // 优先挂载到锚点元素的父容器，以保持定位上下文一致
    const target = (this.anchorElement && this.anchorElement.parentNode) 
      ? this.anchorElement.parentNode 
      : this.targetDocument.body;

    if (target && !target.contains(this.button)) {
      target.appendChild(this.button);
      // 挂载后更新位置
      this.updatePosition();
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
   * 更新按钮文本
   */
  public setText(text: string): void {
    this.button.textContent = text;
  }

  /**
   * 获取按钮元素
   */
  public getElement(): HTMLButtonElement {
    return this.button;
  }
}
