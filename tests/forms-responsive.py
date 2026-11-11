"""CI regression checks for all five responsive, in-memory form editors.
Run against an already-built Hugo site. Synthetic labels only; no real private data.
CSS-pixel viewport coverage is not a claim of testing physical Samsung hardware.
"""
import json
import os
import pathlib
import re
import sys
from contextlib import contextmanager

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

BASE = os.environ.get('FORM_TEST_BASE', 'http://127.0.0.1:8765').rstrip('/')
OUT = pathlib.Path(os.environ.get('FORM_TEST_OUT', '/tmp/interpiad-forms-qa')) / 'responsive'
OUT.mkdir(parents=True, exist_ok=True)
SLUGS = ['manual-invoice', 'manual-invoice-vertical', 'simple-receipt', 'quotation', 'employment-contract']
WIDTHS = [320, 360, 384, 412, 690, 768, 1024, 1199, 1200, 1440]
checks = []


def check(name, condition, detail=None):
    result = {'name': name, 'passed': bool(condition)}
    if detail is not None:
        result['detail'] = detail
    checks.append(result)
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)


@contextmanager
def scenario(name):
    """Keep independent scenarios running after assertions or browser exceptions."""
    try:
        yield
    except Exception as error:
        check(name, False, f'{type(error).__name__}: {error}')


def editor(page, key):
    return page.locator(f'[data-editor-field="{key}"]')


def source(page, key):
    return page.locator(f'#print-root [data-field="{key}"]')


def geometry(page, name):
    result = page.evaluate('''() => {
      const visible = e => !!e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const nodes = [...document.querySelectorAll('#responsive-editor, #responsive-editor *')].filter(visible);
      const bad = nodes.filter(e => {
        const r=e.getBoundingClientRect();
        return r.left < -1 || r.right > innerWidth+1 || (e.clientWidth>0 && e.scrollWidth>e.clientWidth+2);
      }).map(e => ({tag:e.tagName, field:e.dataset.editorField||'', class:e.className,
        client:e.clientWidth, scroll:e.scrollWidth, left:e.getBoundingClientRect().left, right:e.getBoundingClientRect().right}));
      const clipped = nodes.filter(e => e.matches('textarea,input,select')).filter(e => {
        const r=e.getBoundingClientRect();
        for(let p=e.parentElement;p && p.id!=='print-root';p=p.parentElement){
          const s=getComputedStyle(p), b=p.getBoundingClientRect();
          if(/hidden|clip|auto|scroll/.test(s.overflowX) && (r.left<b.left-1 || r.right>b.right+1)) return true;
        }
        return e.tagName==='TEXTAREA' && e.scrollHeight>e.clientHeight+2;
      }).map(e=>e.dataset.editorField);
      return {document:document.documentElement.scrollWidth, body:document.body.scrollWidth,
        width:innerWidth, bad, clipped};
    }''')
    check(name + ' document fits', result['document'] <= result['width'] + 1 and result['body'] <= result['width'] + 1, result)
    check(name + ' visible editor descendants never pan horizontally', not result['bad'], result['bad'])
    check(name + ' fields not clipped by overflow or height', not result['clipped'], result['clipped'])


def run_form(browser, slug):
    page = browser.new_page(viewport={'width': 384, 'height': 900})
    page.set_default_timeout(10000)
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append({'method': request.method, 'url': request.url}))
    try:
        response = page.goto(f'{BASE}/tools/{slug}/')
        check(slug + ' HTTP 200', response is not None and response.status == 200)
        page.wait_for_selector('#responsive-editor')
        page.wait_for_load_state('networkidle')
        baseline = len(requests)
        key = 'employer' if slug == 'employment-contract' else 'supplier'
        marker = 'QA-Responsive'
        check(slug + ' one editor per original field', page.locator('[data-editor-field]').count() == page.locator('#print-root [data-field]').count())
        check(slug + ' original data-field namespace preserved', page.locator('#responsive-editor [data-field]').count() == 0)
        with scenario(slug + ' typing and composition'):
            field = editor(page, key)
            field.click()
            field.press_sequentially('QA-')
            check(slug + ' actual focus and typing', field.evaluate('(e)=>e===document.activeElement') and source(page, key).input_value() == 'QA-')
            field.evaluate('''e => {
              e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
              e.value='QA-한'; e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'한',inputType:'insertCompositionText'}));
              e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'}));
            }''')
            check(slug + ' synthetic IME composition retained', field.input_value() == 'QA-한' and source(page, key).input_value() == 'QA-한')
            field.fill('긴문자열ABCDEFG1234567890' * 2)
            for width in WIDTHS:
                with scenario(f'{slug} viewport {width}'):
                    page.set_viewport_size({'width': width, 'height': 900})
                    page.wait_for_timeout(60)
                    mobile = width < 1200
                    check(f'{slug} {width} editor visibility', page.locator('#responsive-editor').is_visible() == mobile)
                    check(f'{slug} {width} source visibility', page.locator('#print-root').is_visible() != mobile)
                    if mobile:
                        geometry(page, f'{slug} {width}')
                        check(f'{slug} {width} long text stays synchronized', field.input_value() == source(page, key).input_value())
                    else:
                        check(f'{slug} {width} desktop document fits', page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                    if width in [320, 384, 768]:
                        page.screenshot(path=str(OUT / f'{slug}-{width}.png'), full_page=True)
            # Real desktop source edit, followed by closed/open/folded editor checks.
            page.set_viewport_size({'width': 1440, 'height': 900})
            source(page, key).fill(marker)
            for width in [320, 690, 384, 768, 1199, 1200, 384]:
                page.set_viewport_size({'width': width, 'height': 900})
                check(f'{slug} resize {width} preserves source/editor values', field.input_value() == marker and source(page, key).input_value() == marker)
        with scenario(slug + ' calculations and controls'):
            page.set_viewport_size({'width': 384, 'height': 900})
            if slug == 'employment-contract':
                editor(page, 'insurance-0').check()
                check(slug + ' checkbox sync', source(page, 'insurance-0').is_checked())
                editor(page, 'payType').select_option('월급')
                check(slug + ' pay type sync', source(page, 'payType').input_value() == '월급')
                page.locator('.editor-contract-review summary').click()
                original = page.locator('#print-root .contract-section h3').all_text_contents()
                review = page.locator('.editor-contract-text h3').all_text_contents()
                check(slug + ' all ten contract clause headings retained', len(original) == 10 and original == review)
                check(slug + ' full fixed clause text retained', page.evaluate('''() => [...document.querySelectorAll('#print-root .contract-section p')].filter(e=>!e.querySelector('[data-field]')).every(e=>document.querySelector('.editor-contract-text').textContent.includes(e.textContent))'''))
                check(slug + ' contract review reflects input', marker in page.locator('.editor-contract-text').inner_text())
                geometry(page, slug + ' expanded clauses')
            else:
                editor(page, 'item-0-name').fill('QA-Item')
                editor(page, 'item-0-qty').fill('3')
                price = editor(page, 'item-0-price')
                price.fill('1000')
                price.focus()
                price.press('Home')
                price.press('ArrowRight')
                price.press('2')
                check(slug + ' middle numeric insertion', re.sub(r'\D', '', price.input_value()) == '12000' and source(page, 'item-0-price').input_value() == price.input_value())
                price.fill('10000')
                check(slug + ' source total 30000', page.locator('#print-root [data-calc=supply]').first.inner_text() == '30,000')
                if slug != 'simple-receipt':
                    editor(page, 'vatMode').select_option('exclusive' if slug == 'quotation' else 'tax')
                    total_key, expected_tax = ('grand', '33,000') if slug == 'quotation' else ('tax', '3,000')
                    check(slug + ' VAT source calculation', page.locator(f'#print-root [data-calc={total_key}]').first.inner_text() == expected_tax)
                    check(slug + ' VAT editor calculation', expected_tax in page.locator(f'[data-editor-total={total_key}]').inner_text())
                    if slug != 'quotation':
                        check(slug + ' original VAT button toggled', page.locator('#vat-toggle').get_attribute('aria-pressed') == 'true')
                for output in page.locator('[data-editor-total]').all():
                    total = output.get_attribute('data-editor-total')
                    expected = page.locator(f'#print-root [data-calc="{total}"]').first.inner_text()
                    check(f'{slug} mirrored output {total}', output.inner_text() == (expected + ' 원' if expected else '미입력'))
        with scenario(slug + ' mobile PDF'):
            editor(page, key).fill(marker)
            page.set_viewport_size({'width': 384, 'height': 900})
            page.emulate_media(media='print')
            check(slug + ' mobile print source visible editor hidden', page.locator('#print-root').is_visible() and page.locator('#responsive-editor').is_hidden())
            path = OUT / f'{slug}-mobile-a4.pdf'
            page.pdf(path=str(path), prefer_css_page_size=True, print_background=True)
            pdf = PdfReader(path)
            check(slug + ' PDF one page', len(pdf.pages) == 1)
            text = re.sub(r'\s+', '', ''.join(p.extract_text() for p in pdf.pages))
            copies = 2 if slug in SLUGS[:3] else 1
            check(slug + ' PDF synthetic label retained in every copy', text.count(marker) == copies, {'expected': copies, 'actual': text.count(marker)})
            w, h = float(pdf.pages[0].mediabox.width), float(pdf.pages[0].mediabox.height)
            check(slug + ' A4 dimensions and orientation', abs(min(w,h)-595)<3 and abs(max(w,h)-842)<3 and (w>h)==(slug=='manual-invoice'))
            page.emulate_media(media='screen')
        with scenario(slug + ' clear cancel and accept'):
            page.emulate_media(media='screen')
            editor(page, key).fill(marker)
            page.once('dialog', lambda dialog: dialog.dismiss())
            page.locator('#clear-form').click()
            check(slug + ' cancel clear preserves both', editor(page, key).input_value() == marker and source(page, key).input_value() == marker)
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#clear-form').click()
            check(slug + ' accept clear resets both', editor(page, key).input_value() == '' and source(page, key).input_value() == '')
            if slug == 'employment-contract':
                check(slug + ' clear resets both checkboxes', not editor(page, 'insurance-0').is_checked() and not source(page, 'insurance-0').is_checked())
        page.wait_for_timeout(300)
        check(slug + ' no network requests after input', len(requests) == baseline, requests[baseline:])
        check(slug + ' no local/session storage', page.evaluate('localStorage.length===0 && sessionStorage.length===0'))
        check(slug + ' no cookies saved', not page.context.cookies())
        check(slug + ' no JavaScript errors', not errors, errors)
    finally:
        page.close()


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('FORM_TEST_CHROMIUM'), args=['--no-sandbox'])
        try:
            for slug in SLUGS:
                with scenario(slug + ' load/run'):
                    run_form(browser, slug)
        finally:
            browser.close()
except Exception as error:
    check('browser initialization', False, f'{type(error).__name__}: {error}')
finally:
    failures = [c for c in checks if not c['passed']]
    report = {'base': BASE, 'coverage': 'Chromium CSS viewport emulation; synthetic IME events, not physical device or native IME testing', 'checks': checks, 'failures': failures, 'passed': len(checks)-len(failures), 'artifacts': str(OUT)}
    (OUT / 'checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({'passed': report['passed'], 'failures': len(failures), 'artifacts': str(OUT)}, ensure_ascii=False))
sys.exit(1 if failures else 0)
