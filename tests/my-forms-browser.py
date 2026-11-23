import json,pathlib
from playwright.sync_api import sync_playwright
from pypdf import PdfReader
BASE='http://127.0.0.1:8877';OUT=pathlib.Path('qa-my-forms/personal');OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(label,value):
 assert value,label
 checks.append(label)
with sync_playwright() as p:
 browser=p.chromium.launch()
 a=browser.new_context();b=browser.new_context();page=a.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/tools/my-forms/');check('anonymous sees three providers',page.locator('#login .ongi-login-providers a').count()==3)
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});check('login width '+str(width),page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(OUT/f'login-{width}.png'))
 for context,account in [(a,'alpha'),(b,'beta')]:check(account+' synthetic login',context.request.post(BASE+'/api/test-login',data={'account':account},headers={'Origin':BASE}).status==200)
 page.reload();page.locator('#add').click()
 for key,value in {'name':'SYNTHETIC Customer A','address':'Synthetic Address 54','phone':'000-0000-0000','registration':'000-00-00000'}.items():page.locator('#customer-editor [name='+key+']').fill(value)
 page.locator('#customer-editor button').click();page.locator('#customers').click();page.get_by_role('heading',name='SYNTHETIC Customer A').last.wait_for()
 customer=a.request.get(BASE+'/api/customers').json()[-1];check('customer created',customer['name']=='SYNTHETIC Customer A')
 for slug in ['manual-invoice','manual-invoice-vertical','simple-receipt','quotation','employment-contract']:
  page.goto(BASE+'/tools/'+slug+'/?customer='+customer['id']);page.wait_for_selector('#print-root [data-field]');page.wait_for_timeout(500)
  if slug!='employment-contract':check(slug+' auto fill',page.locator('[data-field=buyer]').input_value()=='SYNTHETIC Customer A')
  page.remove_listener('dialog',dialog_handler) if 'dialog_handler' in locals() else None
  dialog_handler=lambda d:d.accept(d.default_value)
  page.on('dialog',dialog_handler)
  page.get_by_role('button',name='발행본 저장',exact=True).click();page.wait_for_url('**/tools/my-forms/?saved=*')
  identifier=page.url.split('saved=')[1];data=a.request.get(BASE+'/api/documents/'+identifier).json();check(slug+' snapshot saved',len(data['versions'][0]['snapshot'])>10000)
  check(slug+' denied to beta',b.request.get(BASE+'/api/documents/'+identifier).status==404)
  view=a.new_page();view.goto(BASE+'/api/documents/'+identifier+'/snapshot?version=1');view.emulate_media(media='print');view.pdf(path=str(OUT/(slug+'-saved.pdf')),prefer_css_page_size=True)
  pdf=PdfReader(str(OUT/(slug+'-saved.pdf')));check(slug+' saved A4 single page',len(pdf.pages)==1)
  if slug!='employment-contract':check(slug+' saved customer text','SYNTHETIC Customer A' in pdf.pages[0].extract_text())
  view.screenshot(path=str(OUT/(slug+'-snapshot.png')));view.close()
  page.goto(BASE+'/tools/'+slug+'/?document='+identifier+'&version=1');page.wait_for_selector('button:has-text("수정본을 새 버전으로 저장")');page.get_by_role('button',name='수정본을 새 버전으로 저장').click();page.wait_for_url('**/tools/my-forms/?saved=*');check(slug+' version appended',len(a.request.get(BASE+'/api/documents/'+identifier).json()['versions'])==2)
 page.goto(BASE+'/tools/my-forms/');page.locator('#customers').click();page.get_by_role('button',name='수정',exact=True).last.click();page.locator('#customer-editor [name=name]').fill('SYNTHETIC Changed');page.locator('#customer-editor button').click();page.get_by_role('heading',name='SYNTHETIC Changed').last.wait_for()
 documents=a.request.get(BASE+'/api/documents').json();check('customer change preserves prior document',any(d['versions'][-1]['customer']=='SYNTHETIC Customer A' for d in documents))
 page.get_by_role('button',name='휴지통으로',exact=True).last.click();page.locator('[name=trash]').select_option('1');page.locator('#search button').click();page.get_by_role('button',name='복구',exact=True).last.click();page.locator('[name=trash]').select_option('0');page.locator('#search button').click();page.get_by_role('heading',name='SYNTHETIC Changed').last.wait_for();check('UI trash and restore',True)
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});check('manager width '+str(width),page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(OUT/f'manager-{width}.png'))
 check('beta list isolated',b.request.get(BASE+'/api/documents').json()==[]);check('no JS errors',errors==[])
 browser.close()
(OUT/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'passed':len(checks)}))
