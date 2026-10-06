import yaml
import re

# Update _index.md
filepath = 'content/lecture/_index.md'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

parts = content.split('---', 2)
if len(parts) >= 3:
    frontmatter = parts[1]
    body = parts[2]
    data = yaml.safe_load(frontmatter)

    if 'timeline' in data and 'education' in data['timeline']:
        del data['timeline']['education']

    new_frontmatter = yaml.dump(data, allow_unicode=True, sort_keys=False)
    new_content = f"---\n{new_frontmatter}---{body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated _index.md")

# Update list.html
html_path = 'layouts/lecture/list.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'\s*<p class="lec-edu">\{\{ \$p\.timeline\.education \}\}</p>', '', html)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated list.html")
