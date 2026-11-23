import json,os,pathlib
from playwright.sync_api import sync_playwright
BASE=os.environ.get('PUBLIC_TEST_BASE','http://127.0.0.1:8899');OUT=pathlib.Path('qa-my-forms/public');OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,value):
 assert value,name
 checks.append(name)
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 check('management page 200',page.goto(BASE+'/tools/my-forms/').status==200)
 page.wait_for_function("document.querySelectorAll('#login [aria-disabled=true]').length===3")
 check('unconfigured providers unavailable',page.locator('#login [aria-disabled=true]').count()==3)
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':1000});check('no overflow '+str(width),page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(OUT/f'login-{width}.png'))
 status=page.request.get(BASE+'/api/auth-status');check('readiness API',status.status==200 and status.json()['providers']=={'google':False,'naver':False,'kakao':False})
 check('mock login unavailable',page.request.post(BASE+'/api/test-login',data={'account':'alpha'}).status==404)
 check('private storage fails closed without DB',page.request.get(BASE+'/api/documents').status==503)
 for slug in ['manual-invoice','manual-invoice-vertical','simple-receipt','quotation','employment-contract']:
  check(slug+' public HTTP 200',page.goto(BASE+'/tools/'+slug+'/').status==200);page.wait_for_selector('#print-root [data-field]');check(slug+' anonymous editor',page.locator('#print-form').is_enabled())
 check('no page errors',not errors);b.close()
(OUT/'checks.json').write_text(json.dumps({'base':BASE,'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'passed':len(checks)}))
