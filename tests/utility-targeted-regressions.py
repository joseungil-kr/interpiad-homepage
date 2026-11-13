"""Targeted browser regression probes for interpiad utility tools.

STAGE='baseline' captures real HEAD failures without making CI fail; after fixes,
switch STAGE='verify' to enforce the corrected behavior as a regression gate.
Do not run this against /tools/ forms, PDF compressor logic or GA code.
"""
import json
import os
import pathlib
from playwright.sync_api import sync_playwright

STAGE = "baseline"
ORIGINAL_HEAD = "3ffd600b1dd4bff51d4b2b9ed4756c1af69d31ac"
BASE = os.getenv("PDF_COMPRESS_BASE", "http://127.0.0.1:8765").rstrip("/")
OUT = pathlib.Path(os.getenv("PDF_COMPRESS_TEST_OUT", "/tmp/interpiad-pdf-compress-test"))
OUT.mkdir(parents=True, exist_ok=True)
results = []

def record(case, correct, detail):
    item = {"case": case, "correct": bool(correct), "detail": detail}
    results.append(item)
    print("TARGETED " + ("PASS" if correct else "REPRODUCED") + " " + json.dumps(item, ensure_ascii=False))

def open_tool(page, slug):
    resp = page.goto(BASE + "/tools/apps/" + slug + "/", wait_until="domcontentloaded")
    if not resp or resp.status != 200:
        raise AssertionError(slug + " page unavailable")
    page.locator("#status").wait_for(timeout=20000)

def make_image(page, element="file"):
    page.evaluate("""id => {
      const c=document.createElement('canvas'); c.width=320; c.height=240;
      const x=c.getContext('2d'); x.fillStyle='#167568'; x.fillRect(0,0,320,240);
      x.fillStyle='#fff'; x.font='36px sans-serif'; x.fillText('TEST',60,120);
      const b=atob(c.toDataURL('image/png').split(',')[1]);
      const arr=new Uint8Array(b.length);
      for(let i=0;i<b.length;i++) arr[i]=b.charCodeAt(i);
      const dt=new DataTransfer();dt.items.add(new File([arr],'valid.png',{type:'image/png'}));
      const input=document.getElementById(id);
      input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    }""", element)

def blank_numeric_cases(page):
    for slug, fid in [
        ("calculator", "a"), ("vat", "amount"), ("margin", "cost"),
        ("unit-convert", "value"), ("discount", "price"),
        ("loan", "principal"), ("roas", "sales"), ("fx", "amount")
    ]:
        open_tool(page, slug)
        if slug == "fx":
            page.locator("#to").select_option("USD")
        page.locator("#" + fid).fill("")
        page.locator("#run").click()
        status = page.locator("#status").inner_text()
        invalid = page.locator("#status").evaluate("(n) => n.classList.contains('is-error')")
        output = page.locator("#output").inner_text()
        record("empty_numeric:" + slug, invalid,
               {"input": fid, "status": status, "output": output[:140]})
    open_tool(page, "vat")
    page.locator("#amount").fill("0")
    page.locator("#run").click()
    record("literal_zero:vat_valid",
           not page.locator("#status").evaluate("(n) => n.classList.contains('is-error')") and
           "0원" in page.locator("#output").inner_text(),
           {"output": page.locator("#output").inner_text()})

def active_urls(page):
    return page.evaluate("window.__blobAudit ? [...window.__blobAudit.active] : []")

def media_single_case(page, slug):
    open_tool(page, slug)
    make_image(page)
    page.locator("#run").click()
    page.locator("#download:not([hidden])").wait_for(timeout=15000)
    old_href = page.locator("#download").get_attribute("href")
    page.locator("#file").set_input_files({
        "name": "broken.png", "mimeType": "image/png", "buffer": b"not-a-valid-image"
    })
    now_hidden = page.locator("#download").is_hidden()
    href_removed = not page.locator("#download").get_attribute("href")
    revoked = old_href not in active_urls(page)
    record("new_file_clears_result:" + slug,
           now_hidden and href_removed and revoked,
           {"hidden": now_hidden, "href_removed": href_removed,
            "old_url_revoked": revoked})
    page.locator("#run").click()
    page.locator("#status.is-error").wait_for(timeout=15000)
    hidden_after_error = page.locator("#download").is_hidden()
    url_after_error = page.locator("#download").get_attribute("href")
    preview_hidden = page.locator("#preview").is_hidden()
    record("conversion_failure_clears_result:" + slug,
           hidden_after_error and not url_after_error and preview_hidden and old_href not in active_urls(page),
           {"hidden": hidden_after_error, "href": url_after_error,
            "preview_hidden": preview_hidden, "active_urls": len(active_urls(page))})

def batch_case(page):
    open_tool(page, "image-resize")
    make_image(page, "files")
    page.locator("#run").click()
    page.locator("#results a").wait_for(timeout=15000)
    old_url = page.locator("#results a").get_attribute("href")
    page.locator("#width").fill("400")
    page.locator("#width").press("Tab")
    record("batch_setting_releases_old_blob",
           page.locator("#results a").count() == 0 and old_url not in active_urls(page),
           {"old_links": page.locator("#results a").count(), "old_url_revoked": old_url not in active_urls(page)})
    page.locator("#run").click()
    page.locator("#results a").wait_for(timeout=15000)
    urls_before = active_urls(page)
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    record("batch_pagehide_releases_blobs", len(active_urls(page)) == 0,
           {"before_pagehide": len(urls_before), "after_pagehide": len(active_urls(page))})

def media_format_change(page):
    open_tool(page, "image-convert")
    make_image(page)
    page.locator("#run").click()
    page.locator("#download:not([hidden])").wait_for(timeout=15000)
    old_url = page.locator("#download").get_attribute("href")
    page.locator("#format").select_option("image/jpeg")
    record("format_change_invalidates_download",
           page.locator("#download").is_hidden() and old_url not in active_urls(page),
           {"download_hidden": page.locator("#download").is_hidden(),
            "old_url_revoked": old_url not in active_urls(page)})

def timer_cases(page):
    open_tool(page, "timer")
    page.locator("#minutes").fill("0")
    page.locator("#seconds").fill("9")
    page.locator("#seconds").press("Tab")
    record("countdown_edit_before_start", page.locator("#clock").inner_text() == "00:09",
           {"display": page.locator("#clock").inner_text()})
    page.locator("#start").click()
    page.locator("#seconds").fill("12")
    page.locator("#seconds").press("Tab")
    record("countdown_edit_while_running", page.locator("#clock").inner_text() == "00:12",
           {"display": page.locator("#clock").inner_text()})
    page.locator("#pause").click()
    open_tool(page, "pomodoro")
    page.locator("#focus").fill("2")
    page.locator("#focus").press("Tab")
    record("pomodoro_focus_edit_before_start", page.locator("#clock").inner_text() == "02:00",
           {"display": page.locator("#clock").inner_text()})
    page.locator("#next").click()
    page.locator("#break").fill("3")
    page.locator("#break").press("Tab")
    record("pomodoro_break_edit_before_start", page.locator("#clock").inner_text() == "03:00",
           {"display": page.locator("#clock").inner_text()})
    page.locator("#next").click()
    record("pomodoro_next_cycle_uses_focus_edit", page.locator("#clock").inner_text() == "02:00",
           {"display": page.locator("#clock").inner_text()})

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 390, "height": 850}, accept_downloads=True)
    ctx.add_init_script("""(() => {
      const create=URL.createObjectURL.bind(URL);
      const revoke=URL.revokeObjectURL.bind(URL);
      const active=new Set();
      URL.createObjectURL=(...args)=>{const u=create(...args);active.add(u);return u;};
      URL.revokeObjectURL=(u)=>{active.delete(u);return revoke(u);};
      window.__blobAudit={active};
    })()""")
    page = ctx.new_page()
    blank_numeric_cases(page)
    for slug in ("image-compress", "image-convert", "exif-remove"):
        media_single_case(page, slug)
    media_format_change(page)
    batch_case(page)
    timer_cases(page)
    ctx.close()
    browser.close()

report = {
    "stage": STAGE, "source_head": ORIGINAL_HEAD,
    "total": len(results), "correct": sum(x["correct"] for x in results),
    "reproduced": [x["case"] for x in results if not x["correct"]],
    "excluded": [x["case"] for x in results if x["correct"]],
    "results": results
}
target = OUT / "utility-targeted-regressions.json"
target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print("TARGETED_REGRESSION_SUMMARY " + json.dumps({k: report[k] for k in ("stage","source_head","total","correct","reproduced","excluded")}, ensure_ascii=False))
if STAGE == "verify" and report["reproduced"]:
    raise AssertionError("Targeted regression cases failed: " + ", ".join(report["reproduced"]))
