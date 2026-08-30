const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'apps/web/src'));
let changedFiles = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // Remove redundant title attributes that were likely pasted or generated and caused duplicates
  newContent = newContent.replace(/<select\s+title="Select Option"/g, '<select');
  newContent = newContent.replace(/<button\s+title="Action"/g, '<button');
  newContent = newContent.replace(/<input\s+title="Input"/g, '<input');
  
  // Actually, sometimes it's `<select title="Select Option"` or `<button title="Action" `
  // Let's use a more robust regex just to remove `title="Select Option"` and `title="Action"` entirely.
  // We'll replace ` title="Select Option"` with ``
  newContent = newContent.replace(/\s+title="Select Option"/g, '');
  newContent = newContent.replace(/\s+title="Action"/g, '');
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
  }
});

console.log(`Updated ${changedFiles} files.`);
