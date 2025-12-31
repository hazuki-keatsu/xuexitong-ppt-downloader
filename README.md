# 学习通 PPT 下载器

> 一键下载学习通（超星）课程中的 PPT 课件为 PDF 文件

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-green)](https://www.tampermonkey.net/)

> [!NOTE]
> 请在合理的范围内使用本脚本！！
> 
> 脚本作者对于脚本使用者的任何行为不负任何责任，本仓库仅为仓库作者的学习目的而建立（即考试压力太大，不想复习，吃饱了撑着），如有任何侵犯您的合法权益的行为，请联系我进行修改，或者删除。

![Preview](./preview.png)

## 功能特性

- **自动识别**：自动检测页面中的所有 PPT 课件
- **原画质量**：保持原始 PNG 格式，无损画质
- **智能布局**：自动适配 PPT 原始尺寸
- **一键导出**：所有页面合并为单个 PDF 文件

## 安装

### 1. 安装浏览器扩展

首先需要安装用户脚本管理器，例如 [Tampermonkey](https://www.tampermonkey.net/)

### 2. 安装脚本

1. 下载 `dist/xuexitong-ppt-downloader.user.js`
2. 在 Tampermonkey 中 `管理面板->实用工具->导入->选择文件` 导入脚本
3. 启用脚本

## 使用方法

### 基本使用

1. 打开学习通课程页面
2. 等待 PPT 加载完成
3. 点击页面左下角自动出现的**下载 PPT**按钮
4. 等待下载和生成完成
5. PDF 文件将自动保存到浏览器默认下载目录

### 界面说明

- **下载 PPT**：初始状态，点击开始下载
- **正在获取信息...**：正在分析 PPT 页数和 URL
- **下载中 X/Y...**：显示当前下载进度（X=已完成，Y=总页数）
- **下载完成！**：PDF 生成完毕，已自动保存
- **下载失败**：出现错误，请查看控制台日志

### 多 PPT 支持

如果页面包含多个 PPT 课件，脚本会为每个课件添加独立的下载按钮。

## 项目结构

```
xuexitong-ppt-downloader/
├── src/
│   ├── index.ts                    # 主入口，脚本初始化和协调
│   ├── types.ts                    # TypeScript 类型定义
│   ├── core/                       # 核心业务逻辑
│   │   ├── ppt-extractor.ts        # PPT 信息提取器
│   │   └── pdf-generator.ts        # PDF 生成器（并发下载+合成）
│   ├── ui/                         # 用户界面组件
│   │   └── download-button.ts      # 下载按钮组件
│   └── utils/                      # 工具函数
│       ├── iframe-helper.ts        # iframe 查找和等待工具
│       └── image-downloader.ts     # 图片下载工具（支持并发）
├── dist/                           # 构建输出目录
│   └── xuexitong-ppt-downloader.user.js  # 最终用户脚本
├── package.json                    # 项目配置和依赖
├── tsconfig.json                   # TypeScript 配置
├── tsup.config.ts                  # 构建工具配置
└── README.md                       # 项目文档
```

## 工作原理

### 整体流程

```
1. 页面加载
   ↓
2. 脚本启动 (index.ts)
   ├── 监听 DOMContentLoaded
   ├── 启动 MutationObserver（监听动态加载）
   └── 启动定时重试器（最多 10 次）
   ↓
3. 查找 PPT iframe (iframe-helper.ts)
   ├── 递归搜索所有 iframe（最深 5 层）
   ├── 查找包含 id="panView" 的 iframe
   └── 使用 WeakMap 缓存已处理的 iframe
   ↓
4. 添加下载按钮 (download-button.ts)
   └── 在每个 PPT iframe 内部创建按钮
   ↓
5. 用户点击按钮
   ↓
6. 提取 PPT 信息 (ppt-extractor.ts)
   ├── 解析 data 属性获取文件名
   ├── 等待 panView iframe 加载
   ├── 查找所有 li[id="anchor"] 元素
   ├── 提取第一张图片 URL
   └── 计算总页数和 baseUrl
   ↓
7. 并发下载图片 (image-downloader.ts)
   ├── 批量下载（15 个并发，可自行修改源码调整）
   ├── 使用 GM_xmlhttpRequest 下载为 Blob
   └── 转换为 DataURL
   ↓
8. 生成 PDF (pdf-generator.ts)
   ├── 根据第一张图片确定页面尺寸
   ├── 分批处理（每批 15 张）
   ├── 每批暂停 20ms 降低 CPU 占用
   ├── 每 3 页 yield 一次，避免卡死
   └── 及时释放已处理的图片内存
   ↓
9. 保存文件
   └── 使用 Blob URL 触发浏览器下载
```

## 性能配置

可在 `src/core/pdf-generator.ts` 中调整性能参数：

```typescript
const BATCH_SIZE = 15;        // 并发下载数量（1-20）
const CPU_COOLDOWN = 20;      // 批次冷却时间（ms）
const YIELD_INTERVAL = 3;     // yield 间隔（页数）
```

## 注意事项

### 使用限制

1. **仅支持学习通平台**：脚本仅在 `https://*.chaoxing.com/mycourse/studentstudy*` 域名下生效
2. **需要完整加载**：确保 PPT 在页面中已完全加载后再下载
3. **大文件耗时**：50 页 PPT 约需 45-60 秒（取决于网络速度）
4. **浏览器要求**：建议使用 Chrome/Edge/Firefox 最新版

### 常见问题

#### Q1: 风扇狂转/电脑卡顿？

这是正常现象，这是多方面原因引起的：
1. `jspdf` 这个库性能过于累赘
2. 所有的图片下载之后都被放进了内存

#### Q2: 为什么不直接从内存中读取图片数据而是重新请求？

由于浏览器的安全模型，脚本没有办法绕过 CORS 直接从内存中读取跨域图片的像素数据。这是浏览器故意设计的安全机制，防止恶意脚本窃取用户的敏感图片数据。

### 安全说明

- 本脚本**不会**收集任何个人信息
- 所有操作在**本地浏览器**完成
- 不会向第三方服务器发送数据
- 开源代码，可自行审查

## 开发

### 环境要求

```bash
# 当前项目环境
$ node --version
v22.21.1

$ npm --version
10.9.4

$ pnpm --version
10.27.0
```

### 技术栈

- **TypeScript 5.9**：类型安全的 JavaScript
- **tsup**：零配置 TypeScript 打包工具
- **jsPDF**：浏览器端 PDF 生成库
- **Tampermonkey API**：用户脚本环境

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [jsPDF](https://github.com/parallax/jsPDF) - PDF 生成库
- [Tampermonkey](https://www.tampermonkey.net/) - 用户脚本管理器