import { ChapterDownloader } from "./chapter-downloader";
import { ButtonGroup } from "../../ui/button-group";
import { findPPTIframes } from "../../utils/iframe-helper";
import { extractPPTInfo } from "../ppt-extractor";
import { generatePDF, savePDF } from "../pdf-generator";
import {
  DownloadController,
  DownloadAbortedError,
} from "../download-controller";

export class MaterialDownloader extends ChapterDownloader {
  constructor() {
    super();
    this.initMessageListener();
  }

  /**
   * 通过 message 事件监听文件切换
   * mooc2-ans 页面在切换文件时会 postMessage({cmd: ...})，以此作为重新挂载按钮的信号
   */
  private initMessageListener(): void {
    window.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg && typeof msg.cmd === "number") {
          setTimeout(() => this.addDownloadButton(), 500);
          setTimeout(() => this.addDownloadButton(), 1500);
        }
      } catch (_) {
        // 非 JSON 消息，忽略
      }
    });
  }

  /** DOM 查询去重，不依赖 WeakMap */
  protected addDownloadButton(): void {
    this.buttonGroups = this.buttonGroups.filter((bg) => bg.isMounted());

    const pptIframes = findPPTIframes();
    if (pptIframes.length === 0) return;

    let newButtonCount = 0;

    for (const pptIframe of pptIframes) {
      const iframeDoc =
        pptIframe.contentDocument || pptIframe.contentWindow?.document;
      if (!iframeDoc?.body) continue;

      // DOM 查询去重
      if (iframeDoc.querySelector(".Downloader.ButtonGroup")) continue;

      const nav = iframeDoc.getElementById("navigation");

      const buttonGroup = new ButtonGroup(
        () => this.handleDownload(pptIframe, buttonGroup),
        () => this.handleStop(buttonGroup),
        iframeDoc,
      );

      // 挂载到 navigation 的父节点下，与 navigation / panView 平级
      buttonGroup.mount((nav?.parentNode ?? iframeDoc.body) as HTMLElement);
      this.buttonGroups.push(buttonGroup);
      newButtonCount++;
    }

    if (newButtonCount > 0) {
      console.log(
        `[PPT下载器] 新增 ${newButtonCount} 个下载按钮，总计 ${this.buttonGroups.length} 个`,
      );
    }
  }

  protected async handleDownload(
    pptIframe: HTMLIFrameElement,
    buttonGroup: ButtonGroup,
  ): Promise<void> {
    if (this.tryGetRawFile(pptIframe)) {
      return;
    }

    const controller = new DownloadController();
    this.controllers.set(buttonGroup, controller);

    buttonGroup.startDownload();
    buttonGroup.updateDownloadState("正在获取信息...", true);

    try {
      const pptInfo = await extractPPTInfo(pptIframe);
      if (!pptInfo) {
        alert("无法获取 PPT 信息，请确保 PPT 已完全加载");
        buttonGroup.updateDownloadState("下载 PPT", false);
        buttonGroup.finishDownload();
        return;
      }

      // Material 页面从 panView 内部的 #fileInfoNameInput 获取文件名
      this.patchFileNameFromPanView(pptIframe, pptInfo);

      controller.throwIfAborted();

      const result = await generatePDF(
        pptInfo,
        (current, total) => {
          buttonGroup.updateDownloadState(
            `下载中 ${current}/${total}...`,
            true,
          );
        },
        controller,
      );

      if (Array.isArray(result)) {
        result.forEach((blob, index) => {
          const name = pptInfo.fileName.replace(/\.pdf$/i, "");
          const partName = `${name}_Part${index + 1}.pdf`;
          savePDF(blob, partName);
        });
      } else {
        savePDF(result, pptInfo.fileName);
      }

      buttonGroup.updateDownloadState("下载完成！", false);
      setTimeout(() => {
        buttonGroup.updateDownloadState("下载 PPT", false);
      }, 2000);

      console.log("PDF 生成完成:", pptInfo.fileName);
    } catch (error) {
      if (error instanceof DownloadAbortedError) {
        console.log("[PPT下载器] 下载已被用户取消");
        buttonGroup.updateDownloadState("已取消", false);
        setTimeout(() => {
          buttonGroup.updateDownloadState("下载 PPT", false);
        }, 1500);
      } else {
        console.error("下载失败:", error);
        buttonGroup.updateDownloadState("下载失败", false);
        setTimeout(() => {
          buttonGroup.updateDownloadState("下载 PPT", false);
        }, 2000);
        alert("下载失败，请查看控制台了解详情");
      }
    } finally {
      buttonGroup.finishDownload();
      this.controllers.delete(buttonGroup);
    }
  }

  /**
   * 从 panView 内部的 #fileInfoNameInput 获取文件名并覆盖 pptInfo.fileName
   */
  private patchFileNameFromPanView(
    pptIframe: HTMLIFrameElement,
    pptInfo: { fileName: string },
  ): void {
    try {
      const iframeDoc =
        pptIframe.contentDocument || pptIframe.contentWindow?.document;
      const panViewIframe = iframeDoc?.getElementById(
        "panView",
      ) as HTMLIFrameElement | null;
      const panViewDoc =
        panViewIframe?.contentDocument ||
        panViewIframe?.contentWindow?.document;
      const nameInput = panViewDoc?.getElementById(
        "fileInfoNameInput",
      ) as HTMLInputElement | null;

      if (nameInput?.value) {
        pptInfo.fileName = nameInput.value.replace(/\.[^.]+$/, "") + ".pdf";
      }
    } catch (e) {
      // 获取失败则保留 extractPPTInfo 返回的默认文件名
      console.log(
        `[MaterialDownloader][patchFileNameFromPanView] Fail to get file name: ${e}`,
      );
    }
  }
}
