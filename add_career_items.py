import yaml
import sys

filepath = 'content/lecture/_index.md'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

parts = content.split('---', 2)
if len(parts) >= 3:
    frontmatter = parts[1]
    body = parts[2]
    data = yaml.safe_load(frontmatter)

    new_items = [
        "한국금거래소 (본점) 마케팅 교육",
        "한국금거래소 (대리점) 마케팅 교육",
        "압구정 XX헤어 대리점 마케팅 교육",
        "스카이차 연합 마케팅 교육",
        "누수 인테리어 예비창업자 마케팅 교육"
    ]

    for group in data['career']['groups']:
        if group['title'] == "업종별 실무교육":
            group['items'].extend(new_items)
            break

    new_frontmatter = yaml.dump(data, allow_unicode=True, sort_keys=False)
    new_content = f"---{new_frontmatter}---{body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated _index.md")
else:
    print("Format error")
