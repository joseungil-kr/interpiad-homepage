import yaml

with open('content/lecture/_index.md', 'r', encoding='utf-8') as f:
    text = f.read()

parts = text.split('---')
if len(parts) >= 3:
    frontmatter = parts[1]
    data = yaml.safe_load(frontmatter)

    # 1. Add career item
    for group in data['career']['groups']:
        if group['title'] == "기업·창업 지원교육":
            group['items'].append("소상공인진흥원 마케팅 교육 강사")
            break

    # 2. Add cert items
    data['certs']['items'].append({
        'id': 'creative-economy',
        'name': '창조경제타운 중소기업 멘토',
        'lines': [
            '미래창조과학부 창조경제타운',
            '중소기업 멘토링 우수 멘토'
        ],
        'image': 'images/lecture/gov-logo.svg',
        'alt': '대한민국 정부 로고'
    })

    data['certs']['items'].append({
        'id': 'gsbc',
        'name': '중소기업 지원센터 멘토',
        'lines': [
            '경기도중소기업종합지원센터 (GSBC)',
            '인터넷 쇼핑몰 및 마케팅 전문 컨설팅 멘토'
        ],
        'image': 'images/lecture/gsbc-logo.svg',
        'alt': 'GSBC 로고'
    })

    new_frontmatter = yaml.dump(data, allow_unicode=True, sort_keys=False)
    new_text = f"---\n{new_frontmatter}---"
    
    with open('content/lecture/_index.md', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Markdown updated")
