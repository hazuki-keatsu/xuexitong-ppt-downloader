/**
 * 全局配置项
 */
export const CONFIG = {
  /** 单卷 PDF 生成的最大页数，超过此数值将自动分卷 */
  MAX_PAGES_PER_PDF: 500,
  /** 最大下载并发数 */
  BATCH_SIZE: 15,
  /** CPU 冷却时间 (ms) */
  CPU_COOLDOWN: 0,
  /** 图片压缩质量 (0-1) */
  IMAGE_QUALITY: 1
} as const;
