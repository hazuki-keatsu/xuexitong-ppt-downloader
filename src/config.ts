/**
 * 全局配置项
 */
export const CONFIG = {
  /** 单卷 PDF 生成的最大页数，超过此数值将自动分卷 */
  MAX_PAGES_PER_PDF: 150,
  /** 最大下载并发数 */
  BATCH_SIZE: 10,
  /** CPU 冷却时间 (ms) */
  CPU_COOLDOWN: 50,
  /** 图片压缩质量 (0-1) */
  IMAGE_QUALITY: 0.8
} as const;
