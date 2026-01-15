import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 jsPDF 源码
const jspdfPath = path.resolve(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js');
let jspdfSource = '';

try {
  jspdfSource = fs.readFileSync(jspdfPath, 'utf-8');
} catch (e) {
  console.error("Warning: Could not read jspdf source", e);
}

// 读取 package.json
const pkgPath = path.resolve(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const {
  version: pkgVersion,
  description: pkgDescription,
  name: pkgName,
  tampermonkey,
  extension
} = pkg;

// 确保版本号符合 Chrome 扩展规范 (x.y.z)
// 如果 version 是 unreleased，暂时使用 0.0.0 作为 manifest 版本，但文件夹备份仍用 unreleased
const extVersion = /^\d+\.\d+\.\d+$/.test(pkgVersion) ? pkgVersion : '0.0.0';

// Background JSContent
const backgroundJsContent = `
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GM_xmlhttpRequest') {
    fetch(request.details.url, {
      method: request.details.method || 'GET',
      headers: request.details.headers
    })
      .then(async response => {
        const contentType = response.headers.get('content-type');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({
            status: response.status,
            statusText: response.statusText,
            response: reader.result, // data:url base64
            contentType: contentType
          });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        sendResponse({
          error: error.message
        });
      });
    return true; // Keep channel open for async response
  }
});
`;

export default defineConfig({
  entry: {
    'content-script': 'src/extension/extension-entry.ts',
  },
  format: ['iife'],
  outDir: 'dist/extension/temp',
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
  clean: true,
  onSuccess: async () => {
    const outputDir = path.join(__dirname, 'dist', 'extension', 'temp');
    
    // 1. 生成 manifest.json
    const manifest = {
      manifest_version: 3,
      name: pkgName,
      version: extVersion,
      description: pkgDescription,
      icons: {
        "128": "icon.png"
      },
      permissions: [
        "storage"
      ],
      host_permissions: [
        "*://*.chaoxing.com/*",
        "*://*.cldisk.com/*"
      ],
      background: {
        service_worker: "background.js"
      },
      content_scripts: [
        {
          matches: Array.isArray(tampermonkey.match) ? tampermonkey.match : [tampermonkey.match],
          js: ["content-script.js"],
          run_at: "document_end"
        }
      ]
    };

    fs.writeFileSync(
      path.join(outputDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('✅ Generated manifest.json');

    // 2. 生成 background.js
    fs.writeFileSync(
      path.join(outputDir, 'background.js'),
      backgroundJsContent.trim()
    );
    console.log('✅ Generated background.js');

    // 3. 复制图标
    const iconSrc = path.join(__dirname, extension.icon);
    if (fs.existsSync(iconSrc)) {
      fs.copyFileSync(iconSrc, path.join(outputDir, 'icon.png'));
      console.log('✅ Copied icon.png');
    }

    // 4. 定义目录变量
    const extensionDir = path.dirname(outputDir); // dist/extension/temp
    const legacyDir = path.join(extensionDir, 'legacy'); // dist/extension/legacy

    if (!fs.existsSync(legacyDir)) {
      fs.mkdirSync(legacyDir, { recursive: true });
    }

    // 5. 压缩为 zip 并放到 extension 根目录
    const zipName = `${pkgName}.zip`;
    const zipPath = path.join(extensionDir, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    await new Promise<void>((resolve, reject) => {
      output.on('close', function() {
        console.log(`✅ Zip created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', function(err) {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(outputDir, false);
      archive.finalize();
    });

    // 6. 备份带版本号的 zip 到 legacy
    const versionZipName = `${pkgName}_${extVersion}.zip`;
    const versionZipPath = path.join(legacyDir, versionZipName);
    
    fs.copyFileSync(zipPath, versionZipPath);
    console.log(`✅ Backup created: ${versionZipPath}`);

    // 7. 删除临时构建目录
    // try {
    //   fs.rmSync(outputDir, { recursive: true, force: true });
    //   console.log(`✅ Cleaned up temporary directory: ${outputDir}`);
    // } catch (err) {
    //   console.error(`⚠️ Failed to clean up temporary directory: ${err}`);
    // }
  }
});
