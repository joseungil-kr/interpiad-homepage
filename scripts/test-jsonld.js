const fs = require('fs');
const html = fs.readFileSync('public/blog/semi-vs-optimized-blog-cost/index.html', 'utf8');
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!match) {
  console.error("JSON-LD 태그를 찾을 수 없습니다.");
  process.exit(1);
}
try {
  const parsed = JSON.parse(match[1]);
  console.log("JSON-LD 파싱 성공! 타입 목록:");
  parsed['@graph'].forEach(g => console.log('  -', g['@type'], g.name || g.headline));
} catch (err) {
  console.error("JSON-LD 파싱 에러:", err.message);
  process.exit(1);
}
