// build.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./src/index.ts'], // 入口文件
  bundle: true,
  platform: 'browser', // 可以是 'node' 或 'browser'
  format: 'esm', // 輸出格式 'cjs' 或 'esm'
  outfile: './dist/picamera.esm.js', // 輸出文件
  sourcemap: true, // 生成 source map
}).catch(() => process.exit(1));
