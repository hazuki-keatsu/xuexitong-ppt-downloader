
/**
 * Web Worker 逻辑主体
 * 注意：此函数会被序列化为字符串并在 Worker 中执行
 * 严禁引用外部作用域变量！
 */
export function pdfWorkerEntry() {
  // @ts-ignore - Worker 内部环境
  const ctx: any = self;
  
  let pdf: any = null;
  let pageWidth = 0;
  let pageHeight = 0;

  ctx.onmessage = function(e: MessageEvent) {
    const { type, payload } = e.data;

    try {
      if (type === 'INIT') {
        pageWidth = payload.width;
        pageHeight = payload.height;
        
        // @ts-ignore
        const { jsPDF } = (self as any).jspdf;
        pdf = new jsPDF({
          orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pageWidth, pageHeight]
        });

        // 添加第一页
        if (payload.firstPageData) {
          const format = payload.format || 'PNG';
          pdf.addImage(new Uint8Array(payload.firstPageData), format, 0, 0, pageWidth, pageHeight);
        }
        
        ctx.postMessage({ type: 'INIT_SUCCESS' });
        
      } else if (type === 'ADD_PAGE') {
        // 添加新页面
        pdf.addPage([pageWidth, pageHeight]);
        
        // 添加图片 
        const format = payload.format || 'PNG';
        pdf.addImage(new Uint8Array(payload.data), format, 0, 0, pageWidth, pageHeight);
        
        // 通知完成
        ctx.postMessage({ type: 'PAGE_ADDED', pageNum: payload.pageNum });
        
      } else if (type === 'FINISH') {
        const blob = pdf.output('blob');
        ctx.postMessage({ type: 'DONE', blob: blob });
        ctx.close();
      }
    } catch (err: any) {
      ctx.postMessage({ type: 'ERROR', error: err.toString() });
    }
  };
}
