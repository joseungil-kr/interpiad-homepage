"""Real Chromium checks of Interpiad static PDF compression. No PDF uploads."""
import json, os, pathlib, re
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

BASE=os.getenv('PDF_COMPRESS_BASE','http://127.0.0.1:8765').rstrip('/')
OUT=pathlib.Path(os.getenv('PDF_COMPRESS_TEST_OUT','/tmp/interpiad-pdf-compress-test'))
OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name, ok, details=None):
    checks.append({'name':name,'pass':bool(ok),'details':details})
    if not ok: raise AssertionError(name+': '+str(details))
def create_test_pdf(page):
    return page.evaluate("""async () => {
      const pdf=await PDFLib.PDFDocument.create();
      const canvas=document.createElement('canvas');
      canvas.width=980;canvas.height=1180;
      const ctx=canvas.getContext('2d');
      const data=ctx.createImageData(canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y++){
        for(let x=0;x<canvas.width;x++){
          const i=(y*canvas.width+x)*4;
          const n=(x*17+y*29+(x*y)%251)%256;
          data.data[i]=n;data.data[i+1]=(n+x)%256;
          data.data[i+2]=(n+y)%256;data.data[i+3]=255;
        }
      }
      ctx.putImageData(data,0,0);
      const png=canvas.toDataURL('image/png');
      const image=await pdf.embedPng(png);
      const sheet=pdf.addPage([595.28,841.89]);
      sheet.drawText('Sample Invoice 123', {x:50,y:807,size:18});
      sheet.drawImage(image,{x:35,y:65,width:520,height:690});
      const b=await pdf.save();
      const transfer=new DataTransfer();
      transfer.items.add(new File([b],'sample-invoice.pdf',{type:'application/pdf'}));
      const control=document.getElementById('pdf-file');
      control.files=transfer.files;
      control.dispatchEvent(new Event('change',{bubbles:true}));
      return b.length;
    }""")
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    requests=[]
    page.on('request',lambda r: requests.append({'url':r.url,'method':r.method}))
    r=page.goto(BASE+'/tools/pdf-compress/',wait_until='networkidle')
    check('page responds 200',r.status==200,r.status)
    check('h1',page.locator('h1').inner_text()=='PDF 용량 줄이기')
    check('canonical',page.locator('link[rel=canonical]').get_attribute('href')=='https://interpiad.com/tools/pdf-compress/')
    check('vendor pdf-lib loaded',page.evaluate("typeof PDFLib!=='undefined'"))
    check('compressor code loaded',page.evaluate("typeof analyzePDF==='function' && typeof compressImages==='function'"))
    page.screenshot(path=str(OUT/'pdf-compress-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(250)
    check('mobile width no overflow',page.evaluate("document.documentElement.scrollWidth <= innerWidth+1"))
    page.screenshot(path=str(OUT/'pdf-compress-mobile.png'),full_page=True)
    check('input initially disabled',page.locator('#compress-button').is_disabled())
    check('file details initially hidden',page.locator('#file-info').is_hidden())
    check('cancel control initially hidden',page.locator('#cancel-button').is_hidden())
    # Wrong file type: no compression or upload
    page.evaluate("""() => {
      const f=new File(['invalid'], 'not-pdf.pdf',{type:'application/pdf'});
      const t=new DataTransfer();t.items.add(f);
      const i=document.getElementById('pdf-file');i.files=t.files;i.dispatchEvent(new Event('change',{bubbles:true}));
    }""")
    page.locator('#feedback').get_by_text('내용이 없는 PDF 파일입니다.').wait_for()
    check('invalid input rejected',page.locator('#compress-button').is_disabled())
    original_size=create_test_pdf(page)
    page.wait_for_function("!document.getElementById('compress-button').disabled")
    check('test PDF generated',original_size>100000,original_size)
    page.locator('#compress-button').click()
    page.locator('#result').wait_for(state='visible',timeout=120000)
    title=page.locator('#result-title').inner_text()
    check('meaningful compression',title=='PDF 압축 완료',title)
    check('download available',page.locator('#download-button').is_visible())
    with page.expect_download() as download:
        page.locator('#download-button').click()
    d=download.value
    output=OUT/'compressed-test.pdf'
    d.save_as(output)
    pdf=PdfReader(str(output))
    check('valid page count',len(pdf.pages)==1)
    text=pdf.pages[0].extract_text()
    check('text selectable and retained','Sample Invoice 123' in text,text[:100])
    w=float(pdf.pages[0].mediabox.width);h=float(pdf.pages[0].mediabox.height)
    check('page dimensions retained',abs(w-595.28)<0.5 and abs(h-841.89)<0.5,(w,h))
    check('bytes reduced',output.stat().st_size<original_size,{'old':original_size,'new':output.stat().st_size})
    check('no uploaded file request',all(r['method']=='GET' for r in requests),requests)
    check('no external network',all(r['url'].startswith(BASE+'/') for r in requests),requests)
    check('no local/session storage',page.evaluate("localStorage.length===0 && sessionStorage.length===0"))
    check('no cookies',len(page.context.cookies())==0)
    page.locator('#remove-file').click()
    check('reset clears selection',page.locator('#compress-button').is_disabled())
    check('reset hides output',page.locator('#result').is_hidden())
    browser.close()
print(json.dumps({'checks':len(checks),'passed':len(checks),'failures':0,'saved_test_pdf':str(OUT/'compressed-test.pdf')},ensure_ascii=False))
