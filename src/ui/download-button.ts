/**
 * 下载按钮 UI 组件
 */

export class DownloadButton {
  private button: HTMLButtonElement;
  private onClick: () => void;

  constructor(onClick: () => void) {
    this.onClick = onClick;
    this.button = this.createButton();
  }

  /**
   * 创建下载按钮
   */
  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = '下载 PPT';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 350px;
      z-index: 9999;
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
    `;

    // 添加悬停效果
    button.addEventListener('mouseenter', () => {
      if (!button.disabled) {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      }
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });

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
   */
  public mount(): void {
    if (!document.body.contains(this.button)) {
      document.body.appendChild(this.button);
      console.log('学习通 PPT 下载按钮已添加');
    }
  }

  /**
   * 从页面移除按钮
   */
  public unmount(): void {
    if (document.body.contains(this.button)) {
      document.body.removeChild(this.button);
    }
  }

  /**
   * 检查按钮是否已挂载
   */
  public isMounted(): boolean {
    return document.body.contains(this.button);
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
}
