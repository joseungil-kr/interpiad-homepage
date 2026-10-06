import re

# 1. Update list.html
with open('layouts/lecture/list.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<section class="lec-sec lec-sec--alt" aria-labelledby="lec-ver-title">', '{{ with $p.verify }}\n  <section class="lec-sec lec-sec--alt" aria-labelledby="lec-ver-title">')
html = html.replace('</section>\n\n  <section class="lec-sec lec-cta" aria-labelledby="lec-cta-title">', '</section>\n  {{ end }}\n\n  <section class="lec-sec lec-cta" aria-labelledby="lec-cta-title">')

with open('layouts/lecture/list.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update _index.md
with open('content/lecture/_index.md', 'r', encoding='utf-8') as f:
    md = f.read()

md = md.replace('GNB투자자문', 'GNB DESIGN')
md = md.replace('리벤코리아', '리셀유코리아')
md = md.replace('꽃이야기', '꽃이랑')
md = md.replace('경기 쇼핑몰CEO협의회 부회장', '경기 쇼핑몰CEO협의회 총무이사')

pattern = re.compile(r'verify:\n.*?cta:', re.DOTALL)
md = pattern.sub('cta:', md)

with open('content/lecture/_index.md', 'w', encoding='utf-8') as f:
    f.write(md)

print("Files updated successfully")
