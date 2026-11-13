"""Browser test: 25 local tools, math, uploads/downloads and mobile layout."""
import os, pathlib, json
from playwright.sync_api import sync_playwright
from pypdf import PdfReader
BASE=os.getenv("PDF_COMPRESS_BASE","http://127.0.0.1:8765").rstrip("/")
OUT=pathlib.Path(os.getenv("PDF_COMPRESS_TEST_OUT","/tmp/interpiad-pdf-compress-test"))
OUT.mkdir(parents=True,exist_ok=True)
KEYS=["image-compress","image-resize","image-convert","pdf-merge-split","exif-remove","image-to-pdf","calculator","vat","margin","unit-convert","discount","dday","fx","loan","qr","utm","roas","seo-preview","duplicates","text-count","color","timer","stopwatch","pomodoro"]
checks=[]
def check(label,yes):
    if not yes:raise AssertionError(label)
    checks.append(label)
def page_for(page,key):
    r=page.goto(BASE+"/tools/apps/"+key+"/",wait_until="domcontentloaded")
    check(key+" HTTP 200",r.status==200)
    page.locator("#status").wait_for(timeout=14000)
    check(key+" app is active",page.locator("#status").count()==1)
def image_upload(page,selector):
    page.evaluate("""id=>{
      const c=document.createElement('canvas');c.width=420;c.height=280;
      const x=c.getContext('2d');x.fillStyle='#177568';x.fillRect(0,0,420,280);
      x.fillStyle='white';x.font='40px sans-serif';x.fillText('INTERPIAD',40,150);
      const b=atob(c.toDataURL('image/png').split(',')[1]),a=new Uint8Array(b.length);
      for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);
      const dt=new DataTransfer();dt.items.add(new File([a],'photo.png',{type:'image/png'}));
      document.getElementById(id).files=dt.files;
    }""",selector)
def pdf_upload(page):
    page.evaluate("""async()=>{
      const p=await PDFLib.PDFDocument.create();const one=p.addPage([595,842]);
      one.drawText('INTERPIAD',{x:50,y:700,size:20});
      const arr=await p.save(),dt=new DataTransfer();dt.items.add(new File([arr],'test.pdf',{type:'application/pdf'}));
      document.getElementById('pdf-files').files=dt.files;
    }""")
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
    ctx=browser.new_context(viewport={"width":1440,"height":900},accept_downloads=True)
    page=ctx.new_page()
    errors=[];requests=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.on("request",lambda r:requests.append((r.url,r.method)))
    page.goto(BASE+"/tools/apps/",wait_until="domcontentloaded")
    check("catalog 25 cards",page.locator("#it-catalog .tools-card").count()==25)
    page.locator("#it-catalog-query").fill("환율")
    check("catalog filtering",page.locator("#it-catalog .tools-card:visible").count()==1)
    page.locator("#it-catalog-query").fill("")
    page.locator("#it-catalog-group").select_option(label="일상·생산성")
    check("category filtering",page.locator("#it-catalog .tools-card:visible").count()==3)
    page.locator("#it-catalog-group").select_option(value="")
    for w in (1440,390,320):
        page.set_viewport_size({"width":w,"height":850})
        check("catalog "+str(w)+" no overflow",page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        if w in (1440,390):page.screenshot(path=str(OUT/("tools-25-"+str(w)+".png")),full_page=True)
    for key in KEYS:
        page_for(page,key)
        check(key+" canonical",page.locator("link[rel='canonical']").get_attribute("href")=="https://interpiad.com/tools/apps/"+key+"/")
        check(key+" active tools menu",page.locator("a[href='/tools/apps/'][aria-current='page']").count()>=1)
        page.set_viewport_size({"width":390,"height":850})
        check(key+" mobile",page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        page.set_viewport_size({"width":1440,"height":850})
    for key,expected in [("calculator","110"),("vat","121,000"),("margin","6,100"),("unit-convert","0.3"),("discount","24,000"),("dday","0일"),("loan","월 납입액"),("roas","333.33")]:
        page_for(page,key);page.locator("#run").click()
        check(key+" math",expected in page.locator("#output").inner_text())
    page_for(page,"utm");page.locator("#run").click()
    check("utm query", "utm_source=naver" in page.locator("#generated").input_value())
    page_for(page,"seo-preview");page.locator("#title").fill("샘플 제목")
    check("SEO interactive","샘플 제목"==page.locator("#seo-title").inner_text())
    page_for(page,"text-count");page.locator("#text").fill("안녕 세상")
    check("text count correct","5자" in page.locator("#output").inner_text())
    page_for(page,"color");page.locator("#hex").fill("#FF0000")
    check("hex to rgb","RGB 255, 0, 0" in page.locator("#output").inner_text())
    page_for(page,"fx")
    page.route("https://api.frankfurter.dev/v1/latest?*",lambda route:route.fulfill(status=200,content_type="application/json",body='{"amount":1,"base":"USD","date":"2026-11-12","rates":{"KRW":1450}}'))
    page.locator("#run").click()
    page.wait_for_function("document.querySelector('#output').textContent.includes('145,000')")
    check("FX local arithmetic","145,000" in page.locator("#output").inner_text())
    page.unroute("https://api.frankfurter.dev/v1/latest?*")
    page_for(page,"qr")
    check("QR canvas rendered",page.locator("#qr-code canvas").count()==1)
    with page.expect_download(timeout=20000) as dl:page.locator("#png").click()
    check("QR PNG download",dl.value.suggested_filename.endswith(".png"))
    for key in ("image-compress","image-convert","exif-remove"):
        page_for(page,key);image_upload(page,"file")
        if key=="image-convert":page.locator("#format").select_option("image/jpeg")
        page.locator("#run").click();page.locator("#download:not([hidden])").wait_for(timeout=20000)
        check(key+" downloadable",page.locator("#download").get_attribute("href").startswith("blob:"))
    page_for(page,"image-resize");image_upload(page,"files")
    page.locator("#run").click();page.locator("#results a").wait_for(timeout=20000)
    check("batch resize saves","420" in page.locator("#results a").inner_text())
    for mode in ("merge","split"):
        page_for(page,"pdf-merge-split");pdf_upload(page)
        if mode=="split":page.locator("#pdf-mode").select_option("split");page.locator("#pdf-range").fill("1")
        with page.expect_download(timeout=20000) as dl:page.locator("#run").click()
        path=OUT/("pdf-"+mode+".pdf");dl.value.save_as(path)
        check("PDF "+mode+" valid",len(PdfReader(str(path)).pages)==1)
    page_for(page,"image-to-pdf");image_upload(page,"images")
    with page.expect_download(timeout=20000) as dl:page.locator("#run").click()
    path=OUT/"images-as-pdf.pdf";dl.value.save_as(path)
    check("image PDF valid",len(PdfReader(str(path)).pages)==1)
    page_for(page,"duplicates")
    page.locator("#table-file").set_input_files({"name":"sample.csv","mimeType":"text/csv","buffer":b"name,id\nA,1\nA,1\nB,2\n"})
    with page.expect_download(timeout=20000) as dl:page.locator("#run").click()
    path=OUT/"clean.csv";dl.value.save_as(path)
    check("CSV duplicates removed",path.read_text(encoding="utf-8-sig").count("\n")==2)
    page_for(page,"duplicates")
    page.evaluate("""async()=>{
      const z=new JSZip();z.file('xl/worksheets/sheet1.xml','<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>name</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Bob</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Bob</t></is></c></row></sheetData></worksheet>');
      const b=await z.generateAsync({type:'blob'}),d=new DataTransfer();d.items.add(new File([b],'sample.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));document.getElementById('table-file').files=d.files;
    }""")
    with page.expect_download(timeout=20000) as dl:page.locator("#run").click()
    path=OUT/"clean-from-xlsx.csv";dl.value.save_as(path)
    check("XLSX dedup into CSV",path.read_text(encoding="utf-8-sig").replace("\r\n","\n").strip()=="name\nBob")
    page_for(page,"timer");page.locator("#minutes").fill("0");page.locator("#seconds").fill("2");page.locator("#seconds").press("Tab");page.locator("#start").click();page.wait_for_timeout(1120)
    check("timer running",page.locator("#clock").inner_text() in ("00:01","00:00"))
    page_for(page,"stopwatch");page.locator("#start").click();page.wait_for_timeout(130);page.locator("#lap").click()
    check("stopwatch lap",page.locator("#laps li").count()==1)
    page_for(page,"pomodoro");page.locator("#start").click();page.locator("#pause").click()
    check("pomodoro pause", "일시정지" in page.locator("#status").inner_text())
    check("JS no page errors",not errors)
    check("No same-origin POST uploads",not [r for r in requests if r[0].startswith(BASE) and r[1] not in ("GET","HEAD","OPTIONS")])
    ctx.close();browser.close()
print(json.dumps({"checks":len(checks),"passed":len(checks),"failed":0},ensure_ascii=False))

# Scoped follow-up regression probes; other test families remain unchanged.
import runpy
runpy.run_path('tests/utility-targeted-regressions.py')
