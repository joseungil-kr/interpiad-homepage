"""Regression coverage for separated Interpiad tools/forms menus and SVG thumbnails."""
import json
import os
import pathlib
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright

BASE=os.getenv("PDF_COMPRESS_BASE","http://127.0.0.1:8765").rstrip("/")
OUT=pathlib.Path(os.getenv("PDF_COMPRESS_TEST_OUT","/tmp/interpiad-pdf-compress-test"))
OUT.mkdir(parents=True, exist_ok=True)
passed=[]
def ck(name,condition,details=None):
    if not condition:
        raise AssertionError(f"{name}: {details}")
    passed.append(name)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":1440,"height":1000})
    response=page.goto(BASE+"/tools/apps/",wait_until="networkidle")
    ck("tools listing HTTP 200",response.status==200,response.status)
    ck("tools title",page.locator("h1").inner_text()=="무료 업무도구")
    ck("tools single card",page.locator(".tools-grid .tools-card").count()==1)
    ck("tools card PDF target",page.locator(".tools-grid .tools-card a[href='/tools/pdf-compress/']").count()==3)
    icon=page.locator(".tools-preview--icon img")
    ck("thumbnail count",icon.count()==1)
    ck("thumbnail has meaningful alt","PDF" in icon.get_attribute("alt"))
    ck("thumbnail loaded with 1200x900 geometry",
       icon.evaluate("(e)=>e.complete && e.naturalWidth===1200 && e.naturalHeight===900"))
    ck("tools category selected",page.locator(".tools-category-nav a[aria-current='page']").inner_text()=="무료 업무도구")
    ck("forms category link",page.locator(".tools-category-nav a[href='/tools/']").count()==1)
    sheet=page.request.get(BASE+"/tools/images/tool-thumbnail-design-sheet.svg")
    ck("design sheet served",sheet.status==200,sheet.status)
    raw=sheet.body()
    ck("design sheet XML",ET.fromstring(raw).tag.endswith("svg"))
    ck("design sheet palette",b"#0B756A" in raw and b"#C69D60" in raw)
    design=browser.new_page(viewport={"width":1700,"height":1150})
    render=design.goto(BASE+"/tools/images/tool-thumbnail-design-sheet.svg",wait_until="load")
    ck("design sheet renders in browser",render.status==200,render.status)
    design.screenshot(path=str(OUT/"tool-icon-design-sheet.png"),full_page=True)
    design.close()
    page.screenshot(path=str(OUT/"free-tools-desktop.png"),full_page=True)
    for width in (1440,1080,1024,768,390,320):
        page.set_viewport_size({"width":width,"height":900})
        page.wait_for_timeout(160)
        ck(f"tool list {width} no overflow",page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        ck(f"tool list {width} thumbnail contained",
           icon.evaluate("(e)=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.width>0&&r.left>=p.left-2&&r.right<=p.right+2;}"))
        if width==390:
            page.screenshot(path=str(OUT/"free-tools-mobile.png"),full_page=True)
    forms=browser.new_page(viewport={"width":1440,"height":1000})
    response=forms.goto(BASE+"/tools/",wait_until="networkidle")
    ck("forms list HTTP 200",response.status==200,response.status)
    ck("forms list still five",forms.locator(".tools-grid .tools-card").count()==5)
    ck("forms preview remains original screenshot",forms.locator(".tools-grid .tools-preview img[src$='-preview.jpg']").count()==5)
    ck("PDF promotion banner removed from forms",forms.locator(".tools-pdf-link").count()==0)
    ck("forms category selected",forms.locator(".tools-category-nav a[aria-current='page']").inner_text()=="무료 업무서식")
    ck("forms link to tool category",forms.locator(".tools-category-nav a[href='/tools/apps/']").count()==1)
    forms.screenshot(path=str(OUT/"free-forms-menu-desktop.png"),full_page=True)
    homepage=browser.new_page(viewport={"width":1440,"height":900})
    homepage.goto(BASE+"/",wait_until="networkidle")
    ck("global nav tool link",homepage.locator(".site-nav > ul > li > a[href='/tools/apps/']").count()==1)
    ck("global nav form link",homepage.locator(".site-nav > ul > li > a[href='/tools/']").count()==1)
    ck("footer tool link",homepage.locator(".site-footer__links a[href='/tools/apps/']").count()==1)
    ck("footer form link",homepage.locator(".site-footer__links a[href='/tools/']").count()==1)
    for width in (1440,1120,1080,1024,768,390,320):
        homepage.set_viewport_size({"width":width,"height":900})
        homepage.wait_for_timeout(180)
        ck(f"global nav {width} no overflow",homepage.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        if width<=1080:
            toggle=homepage.locator("#nav-toggle")
            ck(f"hamburger present at {width}",toggle.is_visible())
            toggle.click()
            ck(f"hamburger expanded at {width}",toggle.get_attribute("aria-expanded")=="true")
            ck(f"mobile menu both links at {width}",homepage.locator(".site-nav a[href='/tools/apps/']").is_visible() and homepage.locator(".site-nav a[href='/tools/']").is_visible())
            toggle.click()
        else:
            ck(f"desktop menu both links at {width}",homepage.locator(".site-nav a[href='/tools/apps/']").is_visible() and homepage.locator(".site-nav a[href='/tools/']").is_visible())
    detail=browser.new_page(viewport={"width":390,"height":844})
    detail.goto(BASE+"/tools/pdf-compress/",wait_until="networkidle")
    ck("PDF page category nav",detail.locator(".site-head nav a[href='/tools/apps/'][aria-current='page']").count()==1)
    ck("PDF page form nav",detail.locator(".site-head nav a[href='/tools/']").count()==1)
    ck("PDF page no mobile overflow",detail.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    ck("PDF engine still loads",detail.evaluate("typeof PDFLib!=='undefined' && typeof compressImages==='function'"))
    form=browser.new_page(viewport={"width":390,"height":844})
    form.goto(BASE+"/tools/quotation/",wait_until="networkidle")
    ck("form page category nav",form.locator(".brandbar nav a[href='/tools/apps/']").count()==1)
    ck("form page original root",form.locator("#print-root .print-sheet,#print-root .paper-form").count()==1)
    browser.close()
print(json.dumps({"passed":len(passed),"failed":0,"checks":passed},ensure_ascii=False))
