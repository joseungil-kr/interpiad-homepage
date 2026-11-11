"""Regression checks for the original A4 sheets fitted to screen width.
Run against a built Hugo site. Uses synthetic data and Chromium CSS viewports,
not physical devices or native Korean IME. Print remains unscaled A4.
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
    try:
        yield
    except Exception as error:
        check(name, False, f'{type(error).__name__}: {error}')


def source(page, key):
    return page.locator(f'#print-root [data-field="{key}"]')


def settle(page, width):
    page.set_viewport_size({'width': width, 'height': 900})
    page.wait_for_timeout(150)


def geometry(page, name):
    result = page.evaluate('''() => {
      const root=document.querySelector('#print-root'), sheet=root.querySelector('.print-sheet,.paper-form');
      const r=root.getBoundingClientRect(), s=sheet.getBoundingClientRect(), css=getComputedStyle(root);
      const available=root.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
      const fields=[...root.querySelectorAll('[data-field]')];
      return {width:innerWidth, document:document.documentElement.scrollWidth, body:document.body.scrollWidth,
        rootClient:root.clientWidth, rootScroll:root.scrollWidth, available,
        sheet:{width:s.width,left:s.left,right:s.right,natural:sheet.offsetWidth},
        bounds:{left:r.left+parseFloat(css.paddingLeft),right:r.right-parseFloat(css.paddingRight)},
        proxies:document.querySelectorAll('#responsive-editor,[data-editor-field]').length,
        namespace:document.querySelectorAll('[data-field]').length===fields.length,
        unique:new Set(fields.map(e=>e.dataset.field)).size===fields.length,
        inaccessible:fields.filter(e=>{const b=e.getBoundingClientRect();return e.disabled||!e.getClientRects().length||b.width<=0||b.height<=0||getComputedStyle(e).visibility==='hidden'||!(e.getAttribute('aria-label')||e.labels?.length);}).map(e=>e.dataset.field),
        same:window.__qaOriginalFields.every((e,i)=>fields[i]===e)};
    }''')
    check(name + ' document/body have no horizontal overflow', result['document'] <= result['width'] + 1 and result['body'] <= result['width'] + 1, result)
    check(name + ' print root has no horizontal overflow', result['rootScroll'] <= result['rootClient'] + 1, result)
    s, bounds = result['sheet'], result['bounds']
    check(name + ' entire original sheet fits root', s['width'] > 0 and s['left'] >= bounds['left']-1 and s['right'] <= bounds['right']+1, result)
    if result['available'] < s['natural']:
        check(name + ' sheet uses available width', abs(s['width']-result['available']) <= 2, result)
    check(name + ' no card editor or duplicate field namespace', result['proxies'] == 0 and result['namespace'] and result['unique'], result)
    check(name + ' original field nodes retained', result['same'])
    check(name + ' original controls visible enabled and named', not result['inaccessible'], result['inaccessible'])


def run_form(browser, slug):
    page = browser.new_page(viewport={'width': 384, 'height': 900})
    page.set_default_timeout(10000)
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append({'method': request.method, 'url': request.url}))
    try:
        # Normal route is essential: blank=1 intentionally suppresses invoice totals.
        response = page.goto(f'{BASE}/tools/{slug}/')
        check(slug + ' HTTP 200', response is not None and response.status == 200)
        page.wait_for_selector('#print-root [data-field]')
        page.wait_for_load_state('networkidle')
        baseline = len(requests)
        viewport = page.locator('meta[name=viewport]').get_attribute('content').lower()
        check(slug + ' manual pinch zoom not restricted', 'maximum-scale' not in viewport and 'user-scalable=no' not in viewport and 'user-scalable=0' not in viewport, viewport)
        key = 'employer' if slug == 'employment-contract' else 'supplier'
        marker = 'QA-Fitted'
        page.evaluate("window.__qaOriginalFields=[...document.querySelectorAll('#print-root [data-field]')]")
        with scenario(slug + ' original typing and composition'):
            field = source(page, key)
            field.fill('')
            field.click()
            field.press_sequentially('QA-')
            check(slug + ' original receives actual focus and typing', field.evaluate('(e)=>e===document.activeElement') and field.input_value() == 'QA-')
            field.evaluate('''e => {
              e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
              e.value='QA-한';e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'한',inputType:'insertCompositionText'}));
              e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'}));
            }''')
            check(slug + ' synthetic IME retained in original', field.input_value() == 'QA-한')
            field.fill('긴문자열ABCDEFG1234567890' * 2)
            long_value = field.input_value()
            check(slug + ' long text entered', len(long_value) >= 20)
            for width in WIDTHS:
                with scenario(f'{slug} viewport {width}'):
                    settle(page, width)
                    check(f'{slug} {width} original visible', page.locator('#print-root').is_visible())
                    geometry(page, f'{slug} {width}')
                    check(f'{slug} {width} original value retained', field.input_value() == long_value)
                    if width in [320, 384, 768, 1440]:
                        page.screenshot(path=str(OUT / f'{slug}-{width}.png'), full_page=True)
            source(page, key).fill(marker)
            for width in [320, 690, 384, 768, 1199, 1200, 384]:
                settle(page, width)
                check(f'{slug} resize {width} preserves original value', source(page, key).input_value() == marker)
        with scenario(slug + ' original calculations and controls'):
            settle(page, 384)
            if slug == 'employment-contract':
                source(page, 'insurance-0').check()
                check(slug + ' original checkbox interactive', source(page, 'insurance-0').is_checked())
                source(page, 'payType').select_option('월급')
                check(slug + ' original select interactive', source(page, 'payType').input_value() == '월급')
                check(slug + ' ten original contract sections retained', page.locator('#print-root .contract-section h3').count() == 10)
            else:
                source(page, 'item-0-name').fill('QA-Item')
                source(page, 'item-0-qty').fill('3')
                price = source(page, 'item-0-price')
                price.fill('1000')
                price.focus()
                price.press('Home')
                price.press('ArrowRight')
                price.press('2')
                check(slug + ' middle numeric insertion', re.sub(r'\D', '', price.input_value()) == '12000')
                price.fill('10000')
                check(slug + ' original supply total 30000', page.locator('#print-root [data-calc=supply]').first.inner_text() == '30,000')
                if slug != 'simple-receipt':
                    if slug == 'quotation':
                        source(page, 'vatMode').select_option('exclusive')
                    else:
                        page.locator('#vat-toggle').click()
                        check(slug + ' original VAT toggle pressed', page.locator('#vat-toggle').get_attribute('aria-pressed') == 'true')
                    total_key, expected = ('grand', '33,000') if slug == 'quotation' else ('tax', '3,000')
                    values = page.locator(f'#print-root [data-calc={total_key}]').all_inner_texts()
                    check(slug + ' original VAT totals in every copy', bool(values) and all(v == expected for v in values), values)
            geometry(page, slug + ' after controls')
        with scenario(slug + ' mobile PDF'):
            source(page, key).fill(marker)
            settle(page, 384)
            page.emulate_media(media='print')
            check(slug + ' print original visible no editor', page.locator('#print-root').is_visible() and page.locator('#responsive-editor').count() == 0)
            print_geometry = page.locator('#print-root .print-sheet,#print-root .paper-form').evaluate('''e=>({zoom:getComputedStyle(e).zoom, transform:getComputedStyle(e).transform, width:e.getBoundingClientRect().width,natural:e.offsetWidth})''')
            check(slug + ' print scale reset', print_geometry['zoom'] in ['1','normal'] and print_geometry['transform'] == 'none' and abs(print_geometry['width']-print_geometry['natural']) <= 1, print_geometry)
            path = OUT / f'{slug}-mobile-a4.pdf'
            page.pdf(path=str(path), prefer_css_page_size=True, print_background=True)
            pdf = PdfReader(path)
            check(slug + ' PDF one page', len(pdf.pages) == 1)
            text = re.sub(r'\s+', '', ''.join(p.extract_text() for p in pdf.pages))
            copies = 2 if slug in SLUGS[:3] else 1
            check(slug + ' PDF label retained in every copy', text.count(marker) == copies, {'expected': copies, 'actual': text.count(marker)})
            w, h = float(pdf.pages[0].mediabox.width), float(pdf.pages[0].mediabox.height)
            check(slug + ' A4 dimensions and orientation', abs(min(w,h)-595)<3 and abs(max(w,h)-842)<3 and (w>h)==(slug=='manual-invoice'))
            page.emulate_media(media='screen')
            settle(page, 384)
            geometry(page, slug + ' screen fit restored after print')
        with scenario(slug + ' clear cancel and accept'):
            page.emulate_media(media='screen')
            source(page, key).fill(marker)
            page.once('dialog', lambda dialog: dialog.dismiss())
            page.locator('#clear-form').click()
            check(slug + ' cancel clear preserves original', source(page, key).input_value() == marker)
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#clear-form').click()
            check(slug + ' accept clear resets original', source(page, key).input_value() == '')
            if slug == 'employment-contract':
                check(slug + ' clear resets checkbox', not source(page, 'insurance-0').is_checked())
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
