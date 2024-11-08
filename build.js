const esbuild = require('esbuild');

const outdir = 'dist';

const options = {
  entryPoints: ['./src/index.ts'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: `${outdir}/picamera.js`,
  sourcemap: false,
}

async function run() {

  await esbuild.build(options);

  options.minify = true
  options.outfile = `${outdir}/picamera.min.js`;
  await esbuild.build(options)

  options.outfile = `${outdir}/picamera.esm.js`;
  options.format = 'esm';
  await esbuild.build(options);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
