import fs from 'fs';
import path from 'path';

const webDir = path.join(process.cwd(), 'src', 'app');

function replaceInFile(filePath, search, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(search)) {
    content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

// 1. (account) paths
const accountDirs = [
  path.join(webDir, '(account)', 'hotel-bookings', 'page.tsx'),
  path.join(webDir, '(account)', 'recent-hotels', 'page.tsx'),
  path.join(webDir, '(account)', 'saved-hotels', 'page.tsx')
];
for (const file of accountDirs) {
  replaceInFile(file, 'href="/account"', 'href="/profile"');
}

// 2. support order
replaceInFile(
  path.join(webDir, '(account)', 'profile', 'orders', '[id]', 'page.tsx'),
  'href="/support/order/KS-2026-78432"',
  'href="/support/tickets"'
);

// 3. marketplace page policies
const marketplacePage = path.join(webDir, 'marketplace', 'page.tsx');
replaceInFile(marketplacePage, 'href="/terms"', 'href="#"');
replaceInFile(marketplacePage, 'href="/privacy"', 'href="#"');
replaceInFile(marketplacePage, 'href="/grievance"', 'href="#"');
replaceInFile(marketplacePage, 'href="/gst-policy"', 'href="#"');

// 4. home page
const homePage = path.join(webDir, 'page.tsx');
replaceInFile(homePage, 'href="/seller"', 'href="/seller/login"');
replaceInFile(homePage, 'href="/partner"', 'href="/seller/login"');
replaceInFile(homePage, 'href="/privacy"', 'href="#"');
replaceInFile(homePage, 'href="/terms"', 'href="#"');

// 5. seller grocery
replaceInFile(
  path.join(webDir, 'seller', 'grocery', '(portal)', 'layout.tsx'),
  'href="/seller/grocery/notifications"',
  'href="/seller/grocery/dashboard"' // fallback
);

replaceInFile(
  path.join(webDir, 'seller', 'grocery', '(public)', 'login', 'page.tsx'),
  'href="/forgot-password"',
  'href="/seller/login"'
);

// 6. package.json type module
const packageJsonPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (pkg.type !== 'module') {
  pkg.type = 'module';
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log('Added "type": "module" to package.json');
}

console.log('Done fixing links.');
