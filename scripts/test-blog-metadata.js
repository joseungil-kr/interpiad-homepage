const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

const decode = value => value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code))).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function check(html, label, ga4 = false) {
  const blocks = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/g)];
  const nodes = blocks.flatMap(block => JSON.parse(block[1])['@graph'] || []);
  const article = nodes.find(node => node['@type'] === 'BlogPosting');
  assert(article, `${label}: missing BlogPosting`);
  assert.equal(article.headline, decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]).replace(/<[^>]*>/g, '').trim(), label);
  assert.equal(article.description, decode(html.match(/<meta\b[^>]*name\s*=\s*["']?description["']?\s+content\s*=\s*"([^"]*)"/)[1]), label);
  if (ga4) {
    assert.equal(article.author.name, '인터피아드 AI 사무실 웹개발 담당');
    assert.equal(article.author['@type'], 'Organization');
    assert(html.includes('작성·기술 보완: ' + article.author.name));
    assert(html.includes('같은 기간의 실제 접수 기록과 대조'));
    assert(html.includes('실행 순서'));
    assert(html.includes('/images/blog/ga4-website-inquiry-measurement.jpg'));
  }
}
async function main() {
  if (process.argv[2]) {
    const response = await fetch(process.argv[2]);
    assert.equal(response.status, 200);
    const html = await response.text();
    check(html, process.argv[2], true);
    fs.writeFileSync('../blog-update/qa-live.html', html);
    console.log('PASS: live GA4 metadata, author, answer, steps and image');
    return;
  }
  let count = 0;
  for (const entry of fs.readdirSync('public/blog', { withFileTypes: true })) {
    const file = path.join('public/blog', entry.name, 'index.html');
    if (!entry.isDirectory() || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('BlogPosting')) continue;
    check(html, entry.name, entry.name === 'ga4-website-inquiry-measurement');
    count++;
  }
  assert(count > 0);
  console.log(`PASS: ${count} blog posts have matching headline/description; GA4 author and answer checked`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
