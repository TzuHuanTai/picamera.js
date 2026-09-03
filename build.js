const esbuild = require('esbuild');

// React is a peer dependency, so it is never bundled: two copies of it in one page break hooks.
const external = ['react', 'react/jsx-runtime'];

const base = {
  bundle: true,
  platform: 'browser',
  sourcemap: false,
  external,
};

// The main entry also ships script-tag builds for the CDN. The subpaths are for bundlers and
// Node, which reach ESM here or the tsc CommonJS output under build/ through the exports map.
const bundles = [
  { in: 'src/index.ts', out: 'dist/index.js', format: 'iife' },
  { in: 'src/index.ts', out: 'dist/index.min.js', format: 'iife', minify: true },
  { in: 'src/index.ts', out: 'dist/index.esm.js', format: 'esm' },
  { in: 'src/gamepad/index.ts', out: 'dist/gamepad.esm.js', format: 'esm' },
  { in: 'src/gamepad/react/index.ts', out: 'dist/gamepad-react.esm.js', format: 'esm' },
];

// Not under dist/: that directory ships, and a test bundle has no business there.
const tests = [
  { in: 'test/ipc-body.test.ts', out: '.test-build/ipc-body.cjs' },
  { in: 'test/gamepad.test.ts', out: '.test-build/gamepad.cjs' },
  { in: 'test/gamepad-react.test.tsx', out: '.test-build/gamepad-react.cjs' },
];

async function run() {
  for (const bundle of bundles) {
    await esbuild.build({
      ...base,
      entryPoints: [bundle.in],
      outfile: bundle.out,
      format: bundle.format,
      minify: bundle.minify === true,
    });
  }

  if (process.argv.includes('--test')) {
    for (const test of tests) {
      await esbuild.build({
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        entryPoints: [test.in],
        outfile: test.out,
      });
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
