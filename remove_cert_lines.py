import yaml

filepath = 'content/lecture/_index.md'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

parts = content.split('---', 2)
if len(parts) >= 3:
    frontmatter = parts[1]
    body = parts[2]
    data = yaml.safe_load(frontmatter)

    for cert in data['certs']['items']:
        if cert['id'] == 'makeshop':
            lines_to_remove = ["메이크샵 인터넷쇼핑몰전문 공인강사", "성명: 조승일"]
            cert['lines'] = [line for line in cert['lines'] if line not in lines_to_remove]
            break

    new_frontmatter = yaml.dump(data, allow_unicode=True, sort_keys=False)
    new_content = f"---{new_frontmatter}---{body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated _index.md")
else:
    print("Format error")
