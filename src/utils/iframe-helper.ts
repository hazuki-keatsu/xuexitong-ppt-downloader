/**
 * iframe 辅助工具
 */

/**
 * 等待 iframe 加载完成
 */
export function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (iframe.contentDocument?.readyState === 'complete') {
      // 额外等待一小段时间确保内容渲染完成
      setTimeout(resolve, 500);
    } else {
      iframe.addEventListener(
        'load',
        () => {
          setTimeout(resolve, 500);
        },
        { once: true }
      );
    }
  });
}

/**
 * 查找包含 PPT 预览的 iframe
 */
export function findPPTIframe(): HTMLIFrameElement | null {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    const src = iframe.getAttribute('src');
    const className = iframe.className;
    // 查找包含 pdf/index.html 的 iframe 或者包含 insertdoc-online-ppt 类名的 iframe
    if (
      (src && src.includes('/ananas/modules/pdf/index.html')) ||
      (className && className.includes('insertdoc-online-ppt'))
    ) {
      return iframe;
    }
  }
  return null;
}
