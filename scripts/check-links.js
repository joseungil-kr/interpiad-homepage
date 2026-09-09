const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      res = res.concat(walk(p));
    } else if (file === 'index.html') {
      res.push(p);
    }
  });
  return res;
}

const allHtml = walk('public');
const pageUrls = allHtml.map(f => {
  let rel = path.relative('public', f).split(path.sep).join('/');
  let urlPath = rel === 'index.html' ? '/' : '/' + rel.replace(/\/index\.html$/, '') + '/';
  return { file: f, url: urlPath };
});

const inLinks = {};
pageUrls.forEach(p => { inLinks[p.url] = 0; });

pageUrls.forEach(source => {
  const content = fs.readFileSync(source.file, 'utf8');
  const hrefs = [...content.matchAll(/href=["']?([^"'\s>]+)["']?/g)].map(m => m[1]);
  hrefs.forEach(rawH => {
    let h = rawH;
    if (h.startsWith('https://interpiad.com/')) {
      h = h.replace('https://interpiad.com', '');
    } else if (h.startsWith('http')) {
      return;
    }
    h = h.split('#')[0].split('?')[0];
    if (!h) return;
    if (!h.startsWith('/')) h = '/' + h;
    if (!h.endsWith('/') && !h.includes('.')) h = h + '/';
    try { h = decodeURIComponent(h); } catch(e){}
    if (inLinks[h] !== undefined && h !== source.url) {
      inLinks[h] = inLinks[h] + 1;
    }
  });
});

const orphans = [];
for (const [url, count] of Object.entries(inLinks)) {
  console.log(url.padEnd(55) + ': ' + count + ' incoming internal links');
  if (count === 0 && url !== '/') {
    orphans.push(url);
  }
}
console.log('\n================================');
console.log('Total Pages:', Object.keys(inLinks).length);
console.log('ORPHAN PAGES (0 incoming links):', orphans);
