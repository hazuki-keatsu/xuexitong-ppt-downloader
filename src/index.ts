/**
 * 学习通 PPT 下载器主入口
 */

import { ChapterDownloader } from "./core/downloaders/chapter-downloader";
import { MaterialDownloader } from "./core/downloaders/material-downloader";

// mooc2-ans 页面需要 message 事件驱动的重挂载机制
if (location.href.includes("mooc2-ans")) {
  new MaterialDownloader();
} else {
  new ChapterDownloader();
}
