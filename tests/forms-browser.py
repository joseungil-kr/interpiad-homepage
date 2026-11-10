"""Run after Hugo build and a local HTTP server. Requires Playwright + Chromium.
FORM_TEST_BASE may point to production for the same read-only UI verification.
Never use real company/customer data in these tests.
"""
import json, os, pathlib, re, urllib.request, xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

BASE = os.environ.get('FORM_TEST_BASE', 'http://127.0.0.1:8765').rstrip('/')
OUT = pathlib.Path(os.environ.get('FORM_TEST_OUT', '/tmp/interpiad-forms-qa'))
OUT.mkdir(parents=True, exist_ok=True)
checks = []
def check(name, condition):
    assert condition, name
    checks.append(name)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('FORM_TEST_CHROMIUM'), args=['--no-sandbox'])
    for slug, mode, rows in [('manual-invoice', 'invoice', 15), ('manual-invoice-vertical', 'invoice-vertical', 10), ('simple-receipt', 'receipt', 15)]:
        page = browser.new_page(viewport={'width': 1440, 'height': 1100})
        errors, sent = [], []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('request', lambda req: sent.append((req.method, req.url)))
        response = page.goto(f'{BASE}/tools/{slug}/')
        page.wait_for_selector('.print-sheet')
        check(f'{mode}: HTTP 200', response.status == 200)
        check(f'{mode}: one h1', page.locator('h1').count() == 1)
        social_url = page.locator('meta[property="og:image"]').get_attribute('content')
        check(f'{mode}: unique absolute OG URL', social_url == f'https://interpiad.com/tools/images/{slug}-og.jpg')
        check(f'{mode}: Twitter image parity', page.locator('meta[name="twitter:image"]').get_attribute('content') == social_url)
        check(f'{mode}: large Twitter card', page.locator('meta[name="twitter:card"]').get_attribute('content') == 'summary_large_image')
        social_response = page.request.get(f'{BASE}/tools/images/{slug}-og.jpg')
        check(f'{mode}: social JPEG HTTP and MIME', social_response.status == 200 and social_response.headers['content-type'].split(';')[0] == 'image/jpeg')
        check(f'{mode}: valid social JPEG', social_response.body().startswith(bytes([255,216,255])))

        check(f'{mode}: self canonical', page.locator('link[rel=canonical]').get_attribute('href') == f'https://interpiad.com/tools/{slug}/')
        check(f'{mode}: two copies and {rows} rows each', page.locator('.slip').count() == 2 and page.locator('.item-table tbody tr').count() == rows * 2)
        for key, value in {'supplier': '출력 테스트', 'supplierAddress': '경기 안산시 상록구 반석로 54 2층', 'supplierNo': '000-00-00000', 'buyer': '문서 확인', ('buyerPhone' if mode == 'invoice-vertical' else 'buyerContact'): '검수', 'item-0-name': '테스트 품목', 'item-0-qty': '3', 'item-0-price': '10,000'}.items():
            page.locator(f'[data-field="{key}"]').fill(value)
        check(f'{mode}: exact mirroring', page.locator('[data-mirror=supplier]').inner_text() == '출력 테스트' and page.locator('[data-mirror=buyerPhone]' if mode == 'invoice-vertical' else '[data-mirror=buyerContact]').inner_text() == '검수')
        check(f'{mode}: grouped price', page.locator('[data-field=item-0-price]').input_value() == '10,000')
        check(f'{mode}: empty amount', page.locator('[data-calc=item-1-amount]').first.inner_text() == '')
        if mode != 'receipt':
            check(f'{mode}: Korean totals', page.locator('[data-amount-korean]').all_text_contents() == ['삼만원 정 (₩30,000)'] * 2)
        for other in ['manual-invoice', 'manual-invoice-vertical', 'simple-receipt']:
            check(f'{mode}: navigation to {other}', page.locator(f'.toolbar-nav a[href="/tools/{other}/"]').count() == 1)
        check(f'{mode}: calculation 30,000', page.locator('[data-calc=supply]').first.inner_text() == '30,000')
        page.locator(f'[data-field=item-{rows-1}-qty]').fill('2')
        page.locator(f'[data-field=item-{rows-1}-name]').fill('마지막 품목')
        page.locator(f'[data-field=item-{rows-1}-price]').fill('500')
        check(f'{mode}: last row included', page.locator('[data-calc=supply]').first.inner_text() == '31,000')
        if mode != 'receipt':
            page.locator('#vat-toggle').click()
            page.locator('[data-field=previous]').fill('5000')
            page.locator('[data-field=paid]').fill('10000')
            check(f'{mode}: tax 3,100', page.locator('[data-calc=tax]').first.inner_text() == '3,100')
            check(f'{mode}: current total 34,100', page.locator('[data-amount-korean]').first.inner_text() == '삼만사천일백원 정 (₩34,100)')
            check(f'{mode}: balance 29,100', page.locator('[data-calc=balance]').first.inner_text() == '29,100')
            page.locator('[data-field=paid]').fill('50000')
            check(f'{mode}: overpayment warning', '초과' in page.locator('#feedback').inner_text())
            page.locator('[data-field=paid]').fill('10000')
            page.locator('#vat-toggle').click()
            check(f'{mode}: toggle off', page.locator('[data-calc=tax]').first.inner_text() == '0')
        page.locator('[data-field=supplier]').fill('<img src=x onerror=alert(1)>')
        check(f'{mode}: input safely mirrored as text', page.locator('[data-mirror=supplier] img').count() == 0)
        page.locator('[data-field=supplier]').fill('출력 테스트')
        check(f'{mode}: no data transmission', all(method == 'GET' for method, url in sent) and not any('출력' in url or '검수' in url for method, url in sent))
        check(f'{mode}: no storage', page.evaluate('localStorage.length === 0 && sessionStorage.length === 0'))
        schemas = [json.loads(s) for s in page.locator('script[type="application/ld+json"]').all_text_contents()]
        app = next(s for s in schemas if s['@type'] == 'WebApplication')
        faq = next(s for s in schemas if s['@type'] == 'FAQPage')
        check(f'{mode}: free app schema', app['offers']['price'] == '0' and app['isAccessibleForFree'])
        check(f'{mode}: FAQ schema matches visible', [q['name'] for q in faq['mainEntity']] == page.locator('.guide-faq summary').all_text_contents())
        check(f'{mode}: contact and offer', '010-2490-0555' in page.locator('#form-contact').inner_text() and '11,000원' in page.locator('#business-options').inner_text() and '300건' in page.locator('#business-options').inner_text())
        page.screenshot(path=str(OUT / f'{mode}-desktop.png'), full_page=True)
        page.emulate_media(media='print')
        check(f'{mode}: print hides marketing', page.locator('.seo-guide').is_hidden() and page.locator('.brandbar').is_hidden())
        page.pdf(path=str(OUT / f'{mode}.pdf'), prefer_css_page_size=True, print_background=True)
        pdf = PdfReader(OUT / f'{mode}.pdf')
        check(f'{mode}: one-page PDF', len(pdf.pages) == 1)
        pdftext = pdf.pages[0].extract_text()
        compact = re.sub(r'\s+', '', pdftext)
        check(f'{mode}: both copies retain last row', compact.count('마지막품목') == 2)
        check(f'{mode}: both copies retain complete address', compact.count('경기안산시상록구반석로542층') == 2)
        check(f'{mode}: footer retained, no marketing in PDF', compact.count('인수자:') == 2 and '기업맞춤형' not in compact)
        width, height = float(pdf.pages[0].mediabox.width), float(pdf.pages[0].mediabox.height)
        check(f'{mode}: A4 orientation', (width > height) == (mode == 'invoice') and abs(max(width,height) - 842) < 3)
        page.emulate_media(media='screen')
        with page.expect_popup() as new:
            page.locator('#blank-pdf').click()
        blank = new.value
        blank.wait_for_selector('.print-sheet')
        check(f'{mode}: blank window does not alter original', page.locator('[data-field=supplier]').input_value() == '출력 테스트' and blank.locator('[data-field=supplier]').input_value() == '')
        check(f'{mode}: blank values and date', blank.locator('[data-field=writtenDate]').input_value() == '' and blank.locator('[data-calc=supply]').first.inner_text() == '')
        blank.close()
        page.on('dialog', lambda dialog: dialog.accept())
        page.locator('#clear-form').click()
        check(f'{mode}: clear resets input and totals', page.locator('[data-field=supplier]').input_value() == '' and page.locator('[data-calc=supply]').first.inner_text() == '0')
        page.evaluate('window.print = () => { window.__printRequested = true; }')
        page.locator('#print-form').click()
        check(f'{mode}: print button', page.evaluate('window.__printRequested === true'))
        page.set_viewport_size({'width': 390, 'height': 844})
        check(f'{mode}: mobile no body overflow', page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
        check(f'{mode}: form scrollable on mobile', page.locator('#print-root').evaluate('(el) => el.scrollWidth > el.clientWidth'))
        page.screenshot(path=str(OUT / f'{mode}-mobile.png'), full_page=True)
        check(f'{mode}: no JS errors', not errors)
        page.close()
    tools_page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    check('tools: HTTP 200', tools_page.goto(BASE + '/tools/').status == 200)
    hero = tools_page.locator('.tools-hero-image img')
    check('tools: descriptive alternative text', bool(hero.get_attribute('alt')))
    check('tools: image has intrinsic dimensions', hero.get_attribute('width') == '1672' and hero.get_attribute('height') == '941')
    check('tools: image loaded', hero.evaluate('(img) => img.complete && img.naturalWidth === 1672'))
    check('tools: exactly three form cards', tools_page.locator('.tools-card').count() == 3)
    for slug in ['manual-invoice', 'manual-invoice-vertical', 'simple-receipt']:
        preview = tools_page.locator(f'.tools-preview a[href="/tools/{slug}/"] img')
        preview.scroll_into_view_if_needed()
        preview.evaluate('(img) => img.decode()')
        check(f'tools: {slug} thumbnail loaded', preview.evaluate('(img) => img.complete && img.naturalWidth > 700 && img.naturalHeight > 600'))
        check(f'tools: {slug} thumbnail accessible', len(preview.get_attribute('alt')) > 15)
        check(f'tools: {slug} whole form retained', preview.evaluate('(img) => getComputedStyle(img).objectFit === "contain" && Math.abs(img.getBoundingClientRect().width / img.getBoundingClientRect().height - img.naturalWidth / img.naturalHeight) < .01'))

    check('tools: distinct accessible form links', tools_page.locator('.tools-card .btn .sr-only').count() == 3)
    check('tools: hero used for social image', 'business-forms-desk.jpg' in tools_page.locator('meta[property="og:image"]').get_attribute('content'))
    for width in [1440, 768, 390, 320]:
        tools_page.set_viewport_size({'width': width, 'height': 1000})
        check(f'tools: no overflow at {width}px', tools_page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
        check(f'tools: previews fit at {width}px', tools_page.locator('.tools-preview img').evaluate_all('(images) => images.length === 3 && images.every(img => {const r=img.getBoundingClientRect(); const p=img.parentElement.getBoundingClientRect(); return r.width > 100 && r.height > 100 && r.width <= p.width && r.height <= p.height;})'))

        check(f'tools: image visible at {width}px', hero.is_visible() and hero.bounding_box()['width'] > 200)
        tools_page.screenshot(path=str(OUT / f'tools-{width}.png'), full_page=True)
    for path in ['/', '/tools/']:
        for width in [1440, 390]:
            tools_page.set_viewport_size({'width': width, 'height': 1000})
            tools_page.goto(BASE + path)
            footer_link = tools_page.locator('.site-footer a[href="/tools/"]')
            check(f'{path}: footer link text at {width}px', footer_link.inner_text() == '무료업무서식')
            footer_link.scroll_into_view_if_needed()
            check(f'{path}: footer visible at {width}px', footer_link.is_visible())
            check(f'{path}: no footer overflow at {width}px', tools_page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
            tools_page.screenshot(path=str(OUT / f'footer-{path.strip("/") or "home"}-{width}.png'))
            footer_link.click()
            check(f'{path}: footer opens free forms at {width}px', tools_page.url.rstrip('/') == BASE + '/tools')
    tools_page.close()

    browser.close()

ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap = ET.fromstring(urllib.request.urlopen(BASE + '/sitemap.xml').read())
rss = ET.fromstring(urllib.request.urlopen(BASE + '/index.xml').read())
for slug in ['manual-invoice', 'manual-invoice-vertical', 'simple-receipt']:
    url = f'https://interpiad.com/tools/{slug}/'
    check(f'{slug}: in sitemap', url in [e.text for e in sitemap.findall('sm:url/sm:loc', ns)])
    check(f'{slug}: in RSS', url in [e.text for e in rss.findall('channel/item/link')])
    item = next(e for e in rss.findall('channel/item') if e.findtext('link') == url)
    check(f'{slug}: RSS has guide and contact', '11,000원' in item.findtext('description') and '010-2490-0555' in item.findtext('description'))
(OUT / 'checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2))
print(json.dumps({'passed':len(checks), 'checks':checks, 'artifacts':str(OUT)}, ensure_ascii=False))
