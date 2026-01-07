import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 package.json 并解析为对象
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
);

// 读取 jsPDF 源码
const jspdfPath = path.resolve(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js');
const jspdfSource = fs.readFileSync(jspdfPath, 'utf-8');

const {
  version: pkgVersion,
  description: pkgDescription,
  author: pkgAuthor,
  license: pkgLicense,
  tampermonkey: tmConfig
} = pkg;

const userScriptMeta = `// ==UserScript==
// @name         学习通 PPT 下载器
// @namespace    ${tmConfig.namespace}
// @version      ${pkgVersion}
// @description  ${pkgDescription}
// @author       ${pkgAuthor}
// @match        ${tmConfig.match}
${tmConfig.grant.map((grant: any) => `// @grant        ${grant}`).join('\n')}
// @run-at       ${tmConfig.runAt}
// @updateURL    ${tmConfig.updateURL}
// @downloadURL  ${tmConfig.downloadURL}
// @homepageURL  ${tmConfig.homepageURL}
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
  define: {
    'process.env.JSPDF_SOURCE': JSON.stringify(jspdfSource)
  },
  banner: {
    js: userScriptMeta
  },
  onSuccess: async () => {
    const legacyDir = path.join(__dirname, 'dist', 'legacy');
    if (!fs.existsSync(legacyDir)) {
      fs.mkdirSync(legacyDir, { recursive: true });
    }
    // 这里的文件名需要跟 entry key + outExtension 对应
    const baseName = 'xuexitong-ppt-downloader.user.js';
    const srcPath = path.join(__dirname, 'dist', baseName);
    const destPath = path.join(legacyDir, baseName.replace('.user.js', `_${pkgVersion}.user.js`));
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Backup created: ${destPath}`);
    }
  }
});