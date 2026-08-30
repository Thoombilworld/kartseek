import fs from 'fs';
import path from 'path';

const webDir = path.join(process.cwd(), 'src');
const sellerTaxiDir = path.join(webDir, 'app', 'seller', 'taxi');
const vendorTaxiDir = path.join(webDir, 'app', 'vendor', 'taxi');
const vendorDir = path.join(webDir, 'app', 'vendor');

// 1. Delete seller/taxi
if (fs.existsSync(sellerTaxiDir)) {
  fs.rmSync(sellerTaxiDir, { recursive: true, force: true });
  console.log('Deleted duplicate seller/taxi folder');
}

// 2. Move vendor/taxi to seller/taxi
if (fs.existsSync(vendorTaxiDir)) {
  fs.cpSync(vendorTaxiDir, sellerTaxiDir, { recursive: true });
  fs.rmSync(vendorTaxiDir, { recursive: true, force: true });
  console.log('Moved vendor/taxi to seller/taxi');
}

// 3. Delete empty vendor folder
if (fs.existsSync(vendorDir) && fs.readdirSync(vendorDir).length === 0) {
  fs.rmSync(vendorDir, { recursive: true, force: true });
  console.log('Deleted empty vendor folder');
}

// 4. Search and replace '/vendor/taxi' with '/seller/taxi'
function replaceInFiles(dir) {
  const files = fs.readdirSync(dir);
  let changedFiles = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      changedFiles += replaceInFiles(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      // replace all occurrences
      content = content.replace(/\/vendor\/taxi/g, '/seller/taxi');
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        changedFiles++;
      }
    }
  }
  return changedFiles;
}

const changes = replaceInFiles(webDir);
console.log(`Replaced /vendor/taxi with /seller/taxi in ${changes} files.`);
