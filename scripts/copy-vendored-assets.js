/* `tsc` only emits TypeScript output, so the vendored HP Poly Call Control SDK (a
 * prebuilt ES module plus its wasm payload) has to be copied into each build output
 * by hand. The sdk resolves its wasm with
 * `new URL('call_control_sdk.wasm', import.meta.url)`, so the files must land directly
 * beside one another, mirroring their layout under react-app/src. */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const relativeDir = path.join(
  'src', 'library', 'services', 'vendor-implementations', 'hp', 'call-control-sdk'
);
const sourceDir = path.join(repoRoot, 'react-app', relativeDir);

/* mirrors the `outDir`s used by the build:src and build:es scripts */
const outputDirs = ['dist/cjs', 'dist/es'];
const assets = ['call_control_sdk.js', 'call_control_sdk.wasm', 'LICENSE.md'];

let copied = 0;

for (const outputDir of outputDirs) {
  const destinationDir = path.join(repoRoot, outputDir, relativeDir);

  if (!fs.existsSync(path.join(repoRoot, outputDir))) {
    continue;
  }

  fs.mkdirSync(destinationDir, { recursive: true });

  for (const asset of assets) {
    const source = path.join(sourceDir, asset);

    if (!fs.existsSync(source)) {
      throw new Error(`Vendored asset is missing: ${path.relative(repoRoot, source)}`);
    }

    fs.copyFileSync(source, path.join(destinationDir, asset));
    copied++;
  }
}

if (!copied) {
  throw new Error('No build output found to copy vendored assets into; run tsc first.');
}

console.log(`copied ${copied} vendored asset(s) into ${outputDirs.join(', ')}`);
