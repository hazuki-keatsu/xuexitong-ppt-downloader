import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 解决 ESModule 中 __dirname 缺失的问题（如果用 CommonJS 可直接用 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 package.json 并解析为对象
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
);

// 提取需要的字段（可根据需求调整）
const {
  version: pkgVersion,
  description: pkgDescription,
  author: pkgAuthor,
  license: pkgLicense,
  tampermonkey: tmConfig // 自定义的油猴配置
} = pkg;

// 动态生成油猴元信息
const userScriptMeta = `// ==UserScript==
// @name         学习通 PPT 下载器
// @namespace    ${tmConfig.namespace}
// @version      ${pkgVersion}
// @description  ${pkgDescription}
// @author       ${pkgAuthor}
// @match        ${tmConfig.match}
${tmConfig.grant.map((grant: any) => `// @grant        ${grant}`).join('\n')}
// @run-at       ${tmConfig.runAt}
// @license      ${pkgLicense}
// ==/UserScript==
`;

export default defineConfig({
  entry: {
    'xuexitong-ppt-downloader.user': 'src/index.ts',
  },
  format: ['iife'],
  outDir: 'dist',
  outExtension() {
    return {
      js: '.js',
    };
  },
  minify: true,
  sourcemap: false,
  banner: {
    js: userScriptMeta
  }
});