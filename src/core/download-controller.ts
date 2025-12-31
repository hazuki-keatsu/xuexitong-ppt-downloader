/**
 * 下载控制器 - 用于管理下载任务的取消
 */

export class DownloadController {
  private aborted = false;
  private abortReason: string | null = null;

  /**
   * 检查是否已取消
   */
  get isAborted(): boolean {
    return this.aborted;
  }

  /**
   * 获取取消原因
   */
  get reason(): string | null {
    return this.abortReason;
  }

  /**
   * 取消下载
   */
  abort(reason = '用户取消'): void {
    this.aborted = true;
    this.abortReason = reason;
    console.log(`[下载控制器] 下载已取消: ${reason}`);
  }

  /**
   * 重置控制器状态
   */
  reset(): void {
    this.aborted = false;
    this.abortReason = null;
  }

  /**
   * 检查点：如果已取消则抛出错误
   * 在下载循环的关键位置调用此方法
   */
  throwIfAborted(): void {
    if (this.aborted) {
      throw new DownloadAbortedError(this.abortReason || '用户取消');
    }
  }
}

/**
 * 下载被取消的错误类型
 */
export class DownloadAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadAbortedError';
  }
}
