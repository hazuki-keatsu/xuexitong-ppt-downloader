# Change Log

## [0.3.0] - 2026-06-05

### Added
- 添加对页面`https://*.chaoxing.com/mooc2-ans/mycourse/stu*`的下载器按钮的完全支持。
- 为项目添加基本的 Lint 和 Format 命令。
- 为项目添加 CLAUDE.md 上下文文件。

### Fixed
- 修复了下载文件的后缀名匹配错误。

### Deprecated
- 移除了原有的`.eslintrc.js`的配置文件。

## [0.2.4] - 2026-06-02

### Fixed
- 添加页面`https://*.chaoxing.com/mooc2-ans/mycourse/stu*`进入脚本匹配项。

## [0.2.3] - 2026-01-15

### Fixed
- 修复了由于 SPA 路由导致的按钮没有正确挂载到页面中。

### Added
- 新增 Chrome/Edge 浏览器扩展支持。
- 新增 `extension` 构建流程，支持自动生成 `manifest.json`、`background.js` 和打包 ZIP。
- 新增构建产物自动备份功能，现在 `dist/extension/legacy` 目录下会保留历史版本的压缩包。
- 实现了 `GM_xmlhttpRequest` 的 polyfill，确保扩展版与油猴脚本版共享同一套核心逻辑。

## [0.2.2] - 2026-01-07

### Fixed
- 修复了下载超大页数 PPT (300+页) 时导致浏览器崩溃的问题 (`RangeError: Invalid string length`)。
- 修复了因内存溢出导致的下载链接生成失败问题。

### Changed
- **智能压缩**: 在下载过程中自动将 PNG 图片转码为 JPEG (质量 0.8)，显著降低内存占用和 PDF 文件体积 (减少约 90%)。
- **自动分卷**: 当 PPT 页数超过 150 页时，自动启动分卷模式 (生成 `Part1.pdf`, `Part2.pdf`...)，作为防止内存溢出的兜底方案。
- **分卷提示**: 对是否分卷添加了弹窗提示。
- 优化了 Worker 通信协议，支持动态传输图片格式。
- 将性能配置选项单独移动到独立的文件中。
- 给历史构建的脚本文件添加了版本备份。

## [0.2.1] - 2026-01-06

### Added
- 引入 Web Worker (`pdf-worker.ts`)处理 PDF 生成任务，将计算密集型操作移出主线程，解决生成时的页面卡顿问题。
- 新增 `process.env.JSPDF_SOURCE` 注入机制，以便在 Worker 中加载 jsPDF 库。

### Changed
- 重构 `PDFGenerator`，支持并发下载图片流并实时传输给 Worker。

## [0.1.x] - Before 2026-01-06

### Deprecated
- 给这个项目设计了基本的框架，但是由于在 js 单线程模型上跑高性能消耗的并发任务，所以性能非常差，[0.1.x]版本已被完全抛弃，请不要再使用！！！
