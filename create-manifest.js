#!/usr/bin/env node

const fs = require('fs');

const buildDate = new Date();

const manifest = {
  name: process.env.APP_NAME,
  version: process.env.VERSION,
  build: process.env.BUILD_ID,
  buildDate: buildDate.toISOString(),
  indexFiles: []
};

/* read top level softphone-vendor-headsets file variations */
const files = fs.readdirSync('dist/');
files.forEach(file => {
  /* skip directories and non-js files */
  if (
    fs.lstatSync('dist/' + file).isDirectory()
  ) {
    return;
  }

  manifest.indexFiles.push({ file });
});

try {
  const files = fs.readdirSync('demo-app/dist');
  files.forEach(file => {
    if (fs.lstatSync('demo-app/dist/' + file).isDirectory()) {
      const dirFiles = fs.readdirSync('demo-app/dist/' + file);
      dirFiles.forEach(dirFile => {
        if (fs.lstatSync('demo-app/dist/' + file + '/' + dirFile).isDirectory()) {
          return;
        }
        manifest.indexFiles.push({
          file: '/demo-app/dist/' + file + '/' + dirFile
        });
      });
      return;
    }
    manifest.indexFiles.push({
      file: '/demo-app/dist/' + file
    });
  });
} catch (e) {
  // demo dir (examples don't exist)
}

fs.writeFileSync('./dist/manifest.json', JSON.stringify(manifest, null, 2), { encoding: 'utf8' });
