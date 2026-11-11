"""Independent browser/PDF checks for quotation and fixed-term employment forms.
Uses synthetic test labels only. FORM_TEST_BASE supports production read-only verification.
"""
import json, os, pathlib, re
from playwright.sync_api import sync_playwright
from pypdf import PdfReader
from PIL import Image, ImageDraw, ImageFont
BASE=os.environ.get('FORM_TEST_BASE','http://127.0.0.1:8765').rstrip('/')
OUT=pathlib.Path(os.environ.get('FORM_TEST_OUT','/tmp/interpiad-forms-qa'));OUT.mkdir(parents=True,exist_ok=True)
GENERATE=os.environ.get('FORM_GENERATE_PREVIEWS')=='1'
checks=[]
def check(name,condition):
 if not condition: raise AssertionError(name)
 checks.append(name)
def fill(page,key,value):page.locator('[data-field="'+key+'"]').fill(value)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('FORM_TEST_CHROMIUM'),args=['--no-sandbox'])
 try:
  for slug in ['quotation','employment-contract']:
   page=b.new_page(viewport={'width':1440,'height':1000});errors=[];requests=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   page.on('request',lambda req:requests.append((req.method,req.url)))
   check(slug+' HTTP 200',page.goto(BASE+'/tools/'+slug+'/?blank=1').status==200)
   page.wait_for_selector('.paper-form');page.emulate_media(media='print')
   page.pdf(path=str(OUT/(slug+'-blank.pdf')),prefer_css_page_size=True)
   page.locator('.paper-form').screenshot(path=str(OUT/(slug+'-blank.png')))
   if GENERATE:
    image=Image.open(OUT/(slug+'-blank.png')).convert('RGB')
    image.save('static/tools/images/'+slug+'-preview.jpg',quality=92)
    image.thumbnail((360,550))
    og=Image.new('RGB',(1200,630),'#edf5f2');og.paste(image,(780+(360-image.width)//2,40))
    draw=ImageDraw.Draw(og)
    fontpath='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
    title=ImageFont.truetype(fontpath,54);body=ImageFont.truetype(fontpath,28)
    draw.text((65,135),'견적서' if slug=='quotation' else '근로계약서 (계약직)',font=title,fill='#123e37')
    draw.text((65,230),'온라인 무료 작성 · A4 인쇄',font=body,fill='#123e37')
    draw.text((65,285),'회원가입 없이 · PDF 저장',font=body,fill='#425453')
    draw.text((65,470),'인터피아드  interpiad.com',font=body,fill='#123e37')
    og.save('static/tools/images/'+slug+'-og.jpg',quality=92)
    og.save(OUT/(slug+'-og.jpg'),quality=92)
    Image.open(OUT/(slug+'-blank.png')).convert('RGB').save(OUT/(slug+'-preview.jpg'),quality=92)
   check(slug+' blank A4 one page',len(PdfReader(OUT/(slug+'-blank.pdf')).pages)==1)
   page.emulate_media(media='screen')
   if slug=='quotation':
    check('quotation 15 item rows',page.locator('.quotation-items tbody tr').count()==15)
    for k,v in {'buyer':'수신 테스트','supplier':'공급 테스트','supplierAddress':'서울시 테스트로 123 테스트빌딩 2층','item-0-name':'첫 품목 테스트','item-0-qty':'3','item-0-price':'10000','item-14-name':'마지막 품목','item-14-qty':'2','item-14-price':'500','paid':'10000','email':'test@example.com','remarks':'납기와 거래 조건 확인\n출력 마지막 문장'}.items():fill(page,k,v)
    check('quotation included total',page.locator('[data-calc=grand]').first.inner_text()=='31,000')
    page.select_option('[data-field=vatMode]','exclusive')
    check('quotation tax and balance',page.locator('[data-calc=grand]').first.inner_text()=='34,100' and page.locator('[data-calc=balance]').inner_text()=='24,100')
    check('quotation Korean total','삼만사천일백원' in page.locator('[data-amount-korean]').inner_text())
    for invalid in ['-1','1.5','1e2','9,99']:
     fill(page,'item-0-qty',invalid);check('quotation rejects '+invalid,page.locator('[data-field=item-0-qty]').get_attribute('aria-invalid')=='true')
    fill(page,'item-0-qty','3');fill(page,'paid','999999');check('quotation overpayment warning','초과' in page.locator('#feedback').inner_text());fill(page,'paid','10000')
    fill(page,'item-0-qty','');check('quotation incomplete row warning','모두' in page.locator('#feedback').inner_text());fill(page,'item-0-qty','3')
    token='마지막품목';signature='출력마지막문장'
   else:
    for k,v in {'employer':'사업주 테스트','worker':'근로자 테스트','startDate':'2026-11-01','endDate':'2027-10-31','workplace':'서울시 테스트로 123 사무실','duties':'서식 작성 및 출력 검수 업무','workdays':'월~금, 매일 09:00~18:00','startTime':'09:00','endTime':'18:00','breakStart':'12:00','breakEnd':'13:00','dailyHours':'8','weeklyHours':'40','salary':'2500000','bonus':'없음','allowances':'식대 월 200,000원','payCalculation':'월 기본급 및 해당 월 수당 합산','payDay':'25','holidayPayDay':'전일 지급','payMethod':'근로자 명의 계좌로 지급','weeklyHoliday':'일','otherHolidays':'관계 법령에 따름','insuranceException':'없음','company':'사업체 테스트','companyAddress':'서울시 테스트로 123 사무실','representative':'대표 테스트','workerName':'근로자 테스트','workerAddress':'서울시 테스트로 456','additionalTerms':'별도 합의사항 확인 완료'}.items():fill(page,k,v)
    page.select_option('[data-field=payType]','월급');page.check('[data-field=insurance-0]')
    fill(page,'startDate','2026-02-30');check('contract invalid date','날짜' in page.locator('#feedback').inner_text());fill(page,'startDate','2026-11-01')
    fill(page,'endDate','2025-01-01');check('contract date order','빠를' in page.locator('#feedback').inner_text());fill(page,'endDate','2027-10-31')
    fill(page,'payDay','32');check('contract payday validation','1~31' in page.locator('#feedback').inner_text());fill(page,'payDay','25')
    token='별도합의사항확인완료';signature='근로자테스트'
   check(slug+' no final errors',page.locator('#feedback').inner_text()=='')
   key='buyer' if slug=='quotation' else 'worker'
   fill(page,key,'<img src=x onerror=alert(1)>');check(slug+' safe text rendering',page.locator('.paper-form img').count()==0);fill(page,key,'출력 테스트')
   check(slug+' no saved private data',page.evaluate('localStorage.length===0&&sessionStorage.length===0'))
   check(slug+' no input transmission',all(method=='GET' for method,url in requests) and all('테스트' not in url and '2500000' not in url for method,url in requests))
   page.screenshot(path=str(OUT/(slug+'-desktop.png')),full_page=True)
   page.emulate_media(media='print');page.pdf(path=str(OUT/(slug+'-filled.pdf')),prefer_css_page_size=True)
   page.locator('.paper-form').screenshot(path=str(OUT/(slug+'-filled.png')))
   pdf=PdfReader(OUT/(slug+'-filled.pdf'));check(slug+' filled one page',len(pdf.pages)==1)
   text=re.sub(r'\s+','',pdf.pages[0].extract_text());check(slug+' last content retained',token in text and signature in text)
   check(slug+' no site chrome in print','기업맞춤형' not in text)
   w,h=float(pdf.pages[0].mediabox.width),float(pdf.pages[0].mediabox.height);check(slug+' A4 portrait',abs(w-595)<3 and abs(h-842)<3)
   page.emulate_media(media='screen')
   for width in [390,320]:
    page.set_viewport_size({'width':width,'height':844});check(slug+f' mobile {width} no body overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    page.screenshot(path=str(OUT/(slug+f'-mobile-{width}.png')),full_page=True)
   with page.expect_popup() as new:page.locator('#blank-pdf').click()
   blank=new.value;blank.wait_for_selector('.paper-form');check(slug+' blank popup preserves source',page.locator('[data-field="'+key+'"]').input_value()=='출력 테스트' and blank.locator('[data-field="'+key+'"]').input_value()=='');blank.close()
   page.on('dialog',lambda d:d.dismiss());page.locator('#clear-form').click();check(slug+' cancel clear keeps data',page.locator('[data-field="'+key+'"]').input_value()=='출력 테스트')
   page.remove_listener('dialog',page._impl_obj) if False else None
   page.evaluate('window.confirm=()=>true');page.locator('#clear-form').click();check(slug+' clear resets data',page.locator('[data-field="'+key+'"]').input_value()=='')
   page.evaluate('window.print=()=>window.__printed=true');page.locator('#print-form').click();check(slug+' print button invokes',page.evaluate('window.__printed===true'))
   check(slug+' no JS errors',not errors)
   check(slug+' canonical',page.locator('link[rel=canonical]').get_attribute('href')=='https://interpiad.com/tools/'+slug+'/')
   page.close()
 finally:
  b.close();(OUT/'document-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False))
