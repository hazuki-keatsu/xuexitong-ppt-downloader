/**
 * iframe 辅助工具
 */

/**
 * 等待 iframe 加载完成
 */
export function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (iframe.contentDocument?.readyState === 'complete') {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(), { timeout: 500 });
      } else {
        setTimeout(resolve, 100);
      }
    } else {
      iframe.addEventListener(
        'load',
        () => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => resolve(), { timeout: 500 });
          } else {
            setTimeout(resolve, 100);
          }
        },
        { once: true }
      );
    }
  });
}

/**
 * 递归查找所有包含 panView 的 iframe
 */
function findIframeRecursively(doc: Document, depth: number = 0, results: HTMLIFrameElement[] = []): HTMLIFrameElement[] {
  // 限制最大深度，防止无限递归
  if (depth > 5) return results;
  
  const iframes = doc.querySelectorAll('iframe');
  if (iframes.length === 0) return results;
  
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) continue;
      
      // 检查当前iframe是否包含panView
      const panView = iframeDoc.getElementById('panView');
      if (panView) {
        results.push(iframe);
        // 找到目标iframe后不再递归搜索子iframe
        continue;
      }
      
      // 继续递归查找该iframe内部的子iframe
      findIframeRecursively(iframeDoc, depth + 1, results);
      
    } catch (e) {
      // 跨域限制
    }
  }
  
  return results;
}

/**
 * 查找所有包含 PPT 预览的 iframe
 * 策略：递归查找所有包含 id="panView" 的 iframe
 */
export function findPPTIframes(): HTMLIFrameElement[] {
  
  // 策略1: 递归查找所有包含 panView 的 iframe
  const results = findIframeRecursively(document, 0, []);
  if (results.length > 0) {
    console.log(`[PPT下载器] 找到 ${results.length} 个 PPT iframe`);
    return results;
  }
  
  // 策略2: 使用属性匹配
  const allIframes = document.querySelectorAll('iframe');
  const matched: HTMLIFrameElement[] = [];
  
  for (const iframe of allIframes) {
    const src = iframe.getAttribute('src');
    const className = iframe.className;
    const jobid = iframe.getAttribute('jobid');
    const dataAttr = iframe.getAttribute('data');
    
    if (
      (src && src.includes('/ananas/modules/pdf/index.html')) ||
      (className && (className.includes('insertdoc-online-ppt') || className.includes('ans-attach-online'))) ||
      (jobid && dataAttr)
    ) {
      matched.push(iframe);
    }
  }
  
  if (matched.length > 0) {
    console.log(`[PPT下载器] 找到 ${matched.length} 个 PPT iframe`);
    return matched;
  }
  
  return [];
}
