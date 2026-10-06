import os

with open('layouts/lecture/list.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove the featured section wrapper
html = html.replace('<section class="lec-sec lec-featured" aria-labelledby="lec-feat-title">', '{{ with $p.featured }}\n  <section class="lec-sec lec-featured" aria-labelledby="lec-feat-title">')
html = html.replace('</section>\n\n  <section class="lec-sec" aria-labelledby="lec-career-title">', '</section>\n  {{ end }}\n\n  <section class="lec-sec" aria-labelledby="lec-career-title">')

# Update cert HTML block to not be a button
old_cert = """        <figure class="lec-cert">
          {{ if $has }}
          <button type="button" class="lec-cert__thumb js-cert-open" data-target="cert-{{ .id }}" aria-haspopup="dialog">
            <img src="{{ $img | relURL }}" alt="{{ .alt }}" loading="lazy" decoding="async">
            <span class="lec-cert__zoom">클릭하여 확대</span>
          </button>
          <dialog class="lec-dialog" id="cert-{{ .id }}" aria-label="{{ .name }} 원본 보기">
            <form method="dialog"><button class="lec-dialog__close" aria-label="닫기">닫기 ✕</button></form>
            <img src="{{ $img | relURL }}" alt="{{ .alt }}" decoding="async">
          </dialog>
          {{ end }}"""

new_cert = """        <figure class="lec-cert">
          {{ if $has }}
          <div class="lec-cert__thumb" style="padding: 30px; cursor: default;">
            <img src="{{ $img | relURL }}" alt="{{ .alt }}" loading="lazy" decoding="async">
          </div>
          {{ end }}"""

html = html.replace(old_cert, new_cert)

with open('layouts/lecture/list.html', 'w', encoding='utf-8') as f:
    f.write(html)
    
print("Updated list.html")
