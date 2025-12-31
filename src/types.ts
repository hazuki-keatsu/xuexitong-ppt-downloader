/**
 * PPT 信息接口
 */
export interface PPTInfo {
  baseUrl: string;
  pageCount: number;
  fileName: string;
}

/**
 * 图片信息接口
 */
export interface ImageInfo {
  url: string;
  width: number;
  height: number;
}
