// @ts-nocheck

interface GMXHRDetails {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  responseType?: 'text' | 'json' | 'blob' | 'arraybuffer';
  onload?: (response: any) => void;
  onerror?: (error: any) => void;
}

if (typeof window !== 'undefined') {
  window.GM_xmlhttpRequest = function (details: GMXHRDetails) {
    chrome.runtime.sendMessage(
      {
        type: 'GM_xmlhttpRequest',
        details: {
          url: details.url,
          method: details.method,
          headers: details.headers,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          if (details.onerror) details.onerror(chrome.runtime.lastError);
          return;
        }
        if (response && response.error) {
          if (details.onerror) details.onerror(response.error);
          return;
        }

        if (response) {
          const dataUrl = response.response;

          // Helper to convert dataURL to Blob
          const dataURLtoBlob = (dataurl: string) => {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
          };

          if (details.responseType === 'arraybuffer') {
            dataURLtoBlob(dataUrl)
              .arrayBuffer()
              .then((buffer) => {
                if (details.onload) {
                  details.onload({
                    status: response.status,
                    statusText: response.statusText,
                    response: buffer,
                    readyState: 4,
                  });
                }
              });
          } else if (details.responseType === 'blob') {
            const blob = dataURLtoBlob(dataUrl);
            if (details.onload) {
              details.onload({
                status: response.status,
                statusText: response.statusText,
                response: blob,
                readyState: 4,
              });
            }
          } else {
             // Fallback or other types if needed, but current usage is blob/arraybuffer
             if (details.onload) {
                details.onload({
                  status: response.status,
                  statusText: response.statusText,
                   // For text, we'd need to decode base64 manually if the background sends dataURL.
                   // Assuming blob usage for now as per analysis.
                  response: response.response, 
                  readyState: 4,
                });
             }
          }
        }
      }
    );
  };
  
  // Mock other GM functions if needed
  window.GM_getValue = function(key, def) { return def; }
  window.GM_setValue = function() {}
  window.GM_info = { script: { version: '1.0' } };
}
