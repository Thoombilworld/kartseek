import fs from 'fs';
import path from 'path';

const appDir = path.join(process.cwd(), 'src/app');

// Find all page.tsx files
function getPages(dir, pagesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getPages(filePath, pagesList);
    } else if (file === 'page.tsx') {
      let route = filePath.replace(appDir, '').replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
      if (route === '') route = '/';
      // remove (folder) route groups
      route = route.replace(/\/\([^)]+\)/g, '');
      pagesList.push(route);
    }
  }
  return pagesList;
}

const validRoutes = getPages(appDir);
// Also account for dynamic routes replacing [id] with generic regex
const routeRegexes = validRoutes.map(route => {
  let r = route.replace(/\[.*?\]/g, '[^/]+');
  return new RegExp(`^${r}$`);
});

// Now parse all tsx files for href="/..."
const badLinks = [];
function checkLinks(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      checkLinks(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hrefRegex = /href="(\/[^"]+)"/g;
      let match;
      while ((match = hrefRegex.exec(content)) !== null) {
        let link = match[1];
        // remove hash and query string
        link = link.split('#')[0].split('?')[0];
        // remove trailing slash
        if (link.endsWith('/') && link !== '/') link = link.slice(0, -1);
        
        let isValid = false;
        for (const regex of routeRegexes) {
          if (regex.test(link)) {
            isValid = true;
            break;
          }
        }
        
        if (!isValid) {
          badLinks.push({ file: filePath.replace(process.cwd(), ''), link });
        }
      }
    }
  }
}

checkLinks(appDir);
checkLinks(path.join(process.cwd(), 'src/components'));

// Deduplicate
const deduped = {};
for (const b of badLinks) {
  const key = `${b.file} -> ${b.link}`;
  if (!deduped[key]) {
    deduped[key] = { file: b.file, link: b.link, count: 0 };
  }
  deduped[key].count++;
}

console.log(`Found ${Object.keys(deduped).length} unique broken links!`);
Object.values(deduped).forEach(x => {
  console.log(`${x.file}: ${x.link} (${x.count} occurrences)`);
});
