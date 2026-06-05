# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

```bash
pnpm build          # Build both Tampermonkey userscript + Chrome extension
pnpm build:tamper   # Build only Tampermonkey userscript → dist/tampermonkey/
pnpm build:ext      # Build only Chrome/Edge extension → dist/extension/
```

Package manager is `pnpm@10`. Node >=22.

## Architecture

This is a dual-target project that downloads PPT courseware from 学习通 (chaoxing.com) as PDF files. It produces both a **Tampermonkey userscript** and a **Chrome/Edge extension** from the same core logic.

### Build system

Two `tsup` configs produce two IIFE bundles. Both inject the full `jspdf.umd.min.js` source at build time via `process.env.JSPDF_SOURCE` — this is needed because the PDF generation runs inside a Web Worker constructed from a Blob URL, where normal module imports aren't available.

- `tsup.tampermonkey.config.ts` — bundles `src/index.ts`, prepends `UserScript==` metadata banner read from `package.json.tampermonkey`
- `tsup.extension.config.ts` — bundles `src/extension/extension-entry.ts`, generates `manifest.json` (Manifest V3), an inline `background.js` service worker, copies the icon, and zips everything

### Runtime architecture

**Entry point** (`src/index.ts`): `XuexitongPPTDownloader` class. On load it:
1. Finds PPT iframes via `findPPTIframes()` (recursive search for `#panView`, up to 5 levels deep, plus attribute-based fallback)
2. Mounts a `ButtonGroup` (download + stop buttons) into each found iframe's document
3. Uses `WeakMap<HTMLIFrameElement, Document>` to detect iframe navigations (new Document object → re-add buttons)
4. Listens for SPA route changes (`popstate`/`hashchange` + monkey-patched `history.pushState`/`replaceState`) + `MutationObserver` + a 10-retry timer

**Download pipeline** (triggered by button click):
1. `ppt-extractor.ts` — reads the `data` attribute for the filename, waits for nested `#panView` iframe to load, counts `li[id^="anchor"]` elements for page count, derives `baseUrl` from the first image URL
2. `pdf-generator.ts` — downloads the first image to determine page dimensions, creates a Web Worker from the serialized `pdfWorkerEntry` function (+ injected jsPDF source), then concurrently downloads remaining images in batches
3. `image-downloader.ts` — downloads via `GM_xmlhttpRequest` (bypasses CORS), converts PNG→JPEG via `OffscreenCanvas`/`createImageBitmap`, reports back `ArrayBuffer` objects transferred to the Worker with zero-copy
4. `pdf-worker.ts` — receives `INIT` / `ADD_PAGE` / `FINISH` messages, calls jsPDF APIs, returns the final PDF Blob via `postMessage`
5. Files are saved by creating a Blob URL and clicking a temporary `<a>` element

**Extension polyfill** (`src/extension/extension-polyfill.ts`): In the extension build, `GM_xmlhttpRequest` is polyfilled using `chrome.runtime.sendMessage` to a background service worker that does `fetch()` and returns `data:` URLs. `GM_getValue`/`GM_setValue` are stubbed. The extension entry (`extension-entry.ts`) imports the polyfill before importing the main logic.

**Download cancellation** (`src/download-controller.ts`): Cooperative abort via `throwIfAborted()` checkpoints in the download loop. The stop button sets the flag, the loop breaks, and a `DownloadAbortedError` is caught.

### Key constraints

- **All image downloading MUST go through `GM_xmlhttpRequest`** (or the extension polyfill). Direct `fetch()`/`<img>` won't work because PPT images are cross-origin (hosted on `cldisk.com`).
- **The `pdfWorkerEntry` function is serialized with `.toString()`** and executed in a Worker — it cannot reference any outer-scope variables.
- **Zero-copy transfer**: `ArrayBuffer` objects are transferred to the Worker via the transfer list (second argument to `postMessage`), so they become unusable on the main thread after sending.
- **Page limit**: PDFs with >500 pages (configurable in `src/config.ts`) trigger a split/merge prompt to avoid `RangeError: Invalid string length` from jsPDF's string concatenation.
