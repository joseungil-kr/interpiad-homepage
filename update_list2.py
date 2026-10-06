import re

with open('layouts/lecture/list.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Make the figure horizontal and the thumb smaller
new_cert_html = '''        <figure class="lec-cert" style="display: flex; align-items: center; gap: 24px;">
          {{ if $has }}
          <div class="lec-cert__thumb" style="width: 80px; height: 80px; flex-shrink: 0; background: transparent; border: none; padding: 0;">
            <img src="{{ $img | relURL }}" alt="{{ .alt }}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: contain;">
          </div>
          {{ end }}
          <figcaption style="margin-top: 0;">'''

html = re.sub(r'<figure class="lec-cert">.*?<figcaption>', new_cert_html, html, flags=re.DOTALL)

with open('layouts/lecture/list.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('layouts updated')
