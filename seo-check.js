const fs = require('fs');
const path = require('path');
const dirs = ['content/blog', 'content/services', 'content/lecture'];
let results = [];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let score = 100;
  let issues = [];
  
  const parts = content.split('---');
  if (parts.length < 3) return;
  const frontmatter = parts[1];
  const body = parts.slice(2).join('---');
  
  if (!frontmatter.includes('summary:') && !frontmatter.includes('description:')) {
    score -= 20;
    issues.push('Missing summary/description');
  }
  
  const charCount = body.replace(/\s+/g, '').length;
  if (charCount < 500) {
    score -= 30;
    issues.push('Very low content length (<500 chars)');
  } else if (charCount < 1000) {
    score -= 15;
    issues.push('Low content length (<1000 chars)');
  }
  
  const h2Count = (body.match(/^##\s/gm) || []).length;
  if (h2Count === 0) {
    score -= 10;
    issues.push('No H2 headings');
  }

  results.push({
    file: filePath,
    score: score,
    charCount: charCount,
    issues: issues
  });
}

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file.endsWith('.md') && file !== '_index.md') {
        analyzeFile(path.join(dir, file));
      }
    });
  }
});

results.sort((a, b) => a.score - b.score || a.charCount - b.charCount);

console.log('--- SEO Analysis Results ---');
results.slice(0, 10).forEach(r => {
  console.log(`File: ${r.file} | Score: ${r.score} | Chars: ${r.charCount}`);
  console.log(`Issues: ${r.issues.join(', ')}`);
});
