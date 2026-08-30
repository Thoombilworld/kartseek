/**
 * Batch convert remaining dark-theme pages to Tailwind light theme.
 * Each page gets its inline styles replaced with Tailwind classes.
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', 'seller', 'marketplace');

function convertPage(relPath) {
  const filePath = path.join(BASE, relPath);
  if (!fs.existsSync(filePath)) return console.log(`SKIP: ${relPath}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. Replace root dark wrapper with light
  content = content
    // Root wrapper: remove minHeight/dark bg/color/padding
    .replace(/<div style=\{\{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1\.5rem' \}\}>/g,
      '<div className="space-y-6">')
    .replace(/<div style=\{\{ minHeight: '100vh', background: '#0f1021', color: '#e6e6e6', padding: '1\.5rem' \}\}>/g,
      '<div className="space-y-6">')
    .replace(/<div style=\{\{ minHeight: '100vh', background: '#0e0e1a', color: '#e6e6e6', padding: '1\.5rem' \}\}>/g,
      '<div className="space-y-6">')
    
    // Inner max-width container
    .replace(/<div style=\{\{ maxWidth: '([\d]+)px', margin: '0 auto' \}\}>/g,
      '<div className="space-y-6">')
    
    // Back link
    .replace(/style=\{\{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0\.85rem', marginBottom: '0\.5rem', display: 'block' \}\}/g,
      'className="text-sm text-slate-500 hover:text-blue-600 mb-2 block"')
    
    // h1 headings
    .replace(/style=\{\{ fontSize: '1\.6rem', fontWeight: 700, marginBottom: '1\.5rem' \}\}/g,
      'className="text-2xl font-black text-slate-900 mb-1"')
    .replace(/style=\{\{ fontSize: '1\.6rem', fontWeight: 700, marginBottom: '1rem' \}\}/g,
      'className="text-2xl font-black text-slate-900 mb-1"')
    
    // Sub headings
    .replace(/style=\{\{ fontSize: '0\.95rem', color: '#8b8b9e', marginBottom: '0\.75rem' \}\}/g,
      'className="text-sm font-bold text-slate-500 mb-3"')
    .replace(/style=\{\{ fontWeight: 600, marginBottom: '0\.5rem' \}\}/g,
      'className="font-bold text-slate-800 mb-2"')
    .replace(/style=\{\{ fontWeight: 600, marginBottom: '0\.2rem' \}\}/g,
      'className="font-bold text-slate-800 mb-1"')
    .replace(/style=\{\{ fontWeight: 600, marginBottom: '0\.75rem' \}\}/g,
      'className="font-bold text-slate-800 mb-3"')
    .replace(/style=\{\{ fontWeight: 600 \}\}/g,
      'className="font-bold text-slate-800"')
    
    // Replace cardStyle variable declaration
    .replace(/const cardStyle: React\.CSSProperties = \{ background: 'rgba\(255,255,255,0\.04\)', border: '1px solid rgba\(255,255,255,0\.08\)', borderRadius: '14px', padding: '1\.25rem', marginBottom: '1\.25rem' \};/g,
      "const cardClass = 'bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-sm';")
    
    // cardStyle usage (simple)
    .replace(/style=\{cardStyle\}/g, 'className={cardClass}')
    
    // Spread cardStyle with extra props — convert to className + style
    .replace(/style=\{\{ \.\.\.cardStyle,\s*textAlign:\s*'center'(?:,\s*background:\s*'[^']*')?\s*\}\}/g,
      "className={`${cardClass} text-center`}")
    .replace(/style=\{\{ \.\.\.cardStyle,\s*display:\s*'grid',\s*gridTemplateColumns:\s*'repeat\(([^)]+)\)',\s*gap:\s*'([^']+)'\s*\}\}/g,
      (m, cols, gap) => `className={\`\${cardClass}\`} style={{ display: 'grid', gridTemplateColumns: 'repeat(${cols})', gap: '${gap}' }}`)
    .replace(/style=\{\{ \.\.\.cardStyle,\s*display:\s*'flex',\s*justifyContent:\s*'space-between',\s*alignItems:\s*'center'\s*\}\}/g,
      "className={`${cardClass} flex justify-between items-center`}")
    .replace(/style=\{\{ \.\.\.cardStyle,\s*border:\s*'1px solid rgba\(239,68,68,[^']+\)',\s*background:\s*'rgba\(239,68,68,[^']+\)'\s*\}\}/g,
      "className=\"bg-red-50 border border-red-200 rounded-xl p-5 mb-5\"")
    .replace(/style=\{\{ \.\.\.cardStyle,([^}]*)\}\}/g,
      (m, rest) => `className={cardClass} style={{ ${rest.trim()} }}`)
    
    // Table borders
    .replace(/borderBottom: '2px solid rgba\(255,255,255,0\.08\)'/g,
      "borderBottom: '2px solid #e2e8f0'")
    .replace(/borderBottom: '1px solid rgba\(255,255,255,0\.04\)'/g,
      "borderBottom: '1px solid #f1f5f9'")
    
    // Text colors
    .replace(/color: '#8b8b9e'/g, "color: '#64748b'")
    .replace(/color: '#e6e6e6'/g, "color: '#1e293b'")
    
    // Backgrounds
    .replace(/background: 'rgba\(255,255,255,0\.04\)'/g, "background: '#ffffff'")
    .replace(/background: 'rgba\(255,255,255,0\.08\)'/g, "background: '#f1f5f9'")
    .replace(/background: 'rgba\(255,255,255,0\.15\)'/g, "background: '#e2e8f0'")
    .replace(/border: '1px solid rgba\(255,255,255,0\.08\)'/g, "border: '1px solid #e2e8f0'")
    .replace(/border: '1px solid rgba\(255,255,255,0\.04\)'/g, "border: '1px solid #f1f5f9'")
    .replace(/border: '1px solid rgba\(255,255,255,0\.15\)'/g, "border: '1px solid #cbd5e1'")
    
    // Button primary
    .replace(/background: '#6366f1'/g, "background: '#3b82f6'")
    .replace(/background: 'linear-gradient\(135deg, #6366f1, #8b5cf6\)'/g, "background: '#3b82f6'")
    .replace(/color: '#a78bfa'/g, "color: '#3b82f6'")
    .replace(/border: '1px solid rgba\(99,102,241,0\.3\)'/g, "border: '1px solid #93c5fd'")
    .replace(/background: 'rgba\(99,102,241,0\.1\)'/g, "background: '#dbeafe'")
    
    // Alert backgrounds
    .replace(/background: 'rgba\(107,203,119,0\.06\)'/g, "background: '#f0fdf4'")
    .replace(/background: 'rgba\(107,203,119,0\.15\)'/g, "background: '#dcfce7'")
    .replace(/background: 'rgba\(251,191,36,0\.06\)'/g, "background: '#fffbeb'")
    .replace(/background: 'rgba\(251,191,36,0\.15\)'/g, "background: '#fef3c7'")
    .replace(/background: 'rgba\(239,68,68,0\.06\)'/g, "background: '#fef2f2'")
    .replace(/background: 'rgba\(239,68,68,0\.15\)'/g, "background: '#fee2e2'")
    .replace(/background: 'rgba\(239,68,68,0\.04\)'/g, "background: '#fef2f2'")
    .replace(/background: 'rgba\(239,68,68,0\.1\)'/g, "background: '#fee2e2'")
    
    // Border colors for alerts
    .replace(/border: '1px solid rgba\(239,68,68,0\.2\)'/g, "border: '1px solid #fca5a5'")
    .replace(/border: '1px solid rgba\(239,68,68,0\.3\)'/g, "border: '1px solid #fca5a5'")
    .replace(/border: '1px solid rgba\(251,191,36,0\.2\)'/g, "border: '1px solid #fcd34d'")
    .replace(/border: '1px solid rgba\(107,203,119,0\.2\)'/g, "border: '1px solid #86efac'")
    
    // Score circle colors stay the same (functional)
    // Functional colors remain: #6bcb77 → keep, #f87171 → keep, #fbbf24 → keep
  ;
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`FIXED: ${relPath}`);
}

// List of remaining dark pages
const PAGES = [
  'settings/notifications/page.tsx',
  'returns/policy/page.tsx',
  'gst/compliance/page.tsx',
  'payouts/manage/page.tsx',
  'warehouses/manage/page.tsx',
  'insights/buy-box/page.tsx',
  'insights/demographics/page.tsx',
  'insights/forecasting/page.tsx',
  'products/bulk-edit/page.tsx',
  'products/bulk-upload/import-export/page.tsx',
  'bundles/page.tsx',
  'fbk/page.tsx',
  'labels/page.tsx',
  'manifests/page.tsx',
  'translations/page.tsx',
];

console.log('Converting dark pages to light theme...\n');
for (const p of PAGES) convertPage(p);
console.log('\nDone!');
