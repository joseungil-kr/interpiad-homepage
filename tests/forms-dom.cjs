// Run after `hugo`: NODE_PATH=<directory containing jsdom> node tests/forms-dom.cjs
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
let passed = 0;
const formScript=fs.readFileSync('static/tools/forms/korean-money.mjs','utf8').replace(/^export /gm,'')+'\n'+
 fs.readFileSync('static/tools/forms/forms.js','utf8').replace(/^import .*korean-money\.mjs['"];?\s*$/m,'');
const check = (label, value) => { assert.ok(value, label); passed++; };
for (const [slug, mode] of [['manual-invoice','invoice'],['manual-invoice-vertical','invoice-vertical'],['simple-receipt','receipt']]) {
 const rows=mode==='invoice-vertical'?10:15;
 const contactKey=mode==='invoice-vertical'?'buyerPhone':'buyerContact';
 const html = fs.readFileSync(`public/tools/${slug}/index.html`,'utf8');
 const dom = new JSDOM(html,{url:`https://interpiad.com/tools/${slug}/`,runScripts:'outside-only'});
 const w=dom.window,d=w.document; w.confirm=()=>true;w.print=()=>{w.printed=true;};
 w.eval(formScript);
 const el=s=>d.querySelector(s);
 const fill=(key,value)=>{const e=el(`[data-field="${key}"]`);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const calc=k=>el(`[data-calc="${k}"]`).textContent;
 check(`${mode} 2 copies`,d.querySelectorAll('.slip').length===2);
 check(`${mode} expected row count`,d.querySelectorAll('[data-line]').length===rows*2);
 fill('supplier','출력 테스트');fill(contactKey,'검수');
 check(`${mode} company mirror`,el('[data-mirror="supplier"]').textContent==='출력 테스트');
 check(`${mode} contact mirror`,el('[data-mirror="'+contactKey+'"]').textContent==='검수');
 check(mode+' blank amount cell',calc('item-0-amount')==='');
 fill('item-0-qty','1');fill('item-0-price','1594500');
 check(mode+' unit price formatting',el('[data-field="item-0-price"]').value==='1,594,500');
 check(mode+' formatted price mirror',el('[data-mirror="item-0-price"]').textContent==='1,594,500');
 if(mode!=='receipt')check(mode+' Korean full amount',d.querySelectorAll('[data-amount-korean]').length===2&&Array.from(d.querySelectorAll('[data-amount-korean]')).every(e=>e.textContent==='일백오십구만사천오백원 정 (₩1,594,500)'));
 fill('supplierAddress','경기 안산시 상록구 반석로 54 2층');
 check(mode+' address mirror',el('[data-mirror="supplierAddress"]').textContent==='경기 안산시 상록구 반석로 54 2층');
 fill('item-'+(rows-1)+'-name','마지막 품목');
 check(mode+' last item mirror',el('[data-mirror="item-'+(rows-1)+'-name"]').textContent==='마지막 품목');
 if(mode==='invoice-vertical'){
  fill('buyerNo','000-00-00000');
  check('vertical registration mirror',el('[data-mirror="buyerNo"]').textContent==='000-00-00000');
  check('vertical party tables',d.querySelectorAll('.vertical-party-table').length===2);
 }
 for(const other of ['manual-invoice','manual-invoice-vertical','simple-receipt'])check(mode+' nav '+other,!!el('.toolbar-nav a[href="/tools/'+other+'/"]'));
 fill('item-0-qty','3');fill('item-0-price','10,000');
 check(`${mode} numeric format`,calc('supply')==='30,000');
 fill('item-'+(rows-1)+'-qty','2');fill('item-'+(rows-1)+'-price','500');
 check(`${mode} last row`,calc('supply')==='31,000');
 fill('item-1-qty','not a number');fill('item-1-price','-500');
 check(`${mode} invalid numbers safe`,calc('supply')==='31,000');
 check(`${mode} invalid number warning`,el('#feedback').textContent.includes('정수'));
 el('#print-form').click();check(`${mode} invalid number blocks print`,w.printed!==true);
 fill('item-1-qty','1.5');check(`${mode} decimal not silently truncated`,el('[data-field="item-1-qty"]').getAttribute('aria-invalid')==='true');
 fill('item-1-qty','1e2');fill('item-1-price','100');check(`${mode} exponent excluded from total`,calc('supply')==='31,000');
 check(`${mode} invalid print state`,d.body.classList.contains('form-invalid'));
 fill('item-1-qty','');fill('item-1-price','');
 fill('supplier','<img src=x onerror=alert(1)>');
 check(`${mode} injection-safe`,el('[data-mirror="supplier"]').children.length===0);
 if(mode!=='receipt'){
  el('#vat-toggle').click();check('VAT',calc('tax')==='3,100');
  fill('previous','5000');fill('paid','10000');
  check('invoice total',el('[data-amount-korean]').textContent==='삼만사천일백원 정 (₩34,100)');check('claim total',calc('grand')==='39,100');check('balance',calc('balance')==='29,100');
  fill('paid','50000');check('overpayment warning',el('#feedback').textContent.includes('초과'));
  el('#vat-toggle').click();check('VAT off',calc('tax')==='0');
 }
 w.confirm=()=>false;
 el('#clear-form').click();check(mode+' cancelled clear retains input',el('[data-field="supplier"]').value!=='');
 w.confirm=()=>true;
 el('#clear-form').click();check(`${mode} clear input`,el('[data-field="supplier"]').value==='');check(`${mode} clear totals`,calc('supply')==='0');
 el('#print-form').click();check(`${mode} print invoked`,w.printed===true);
 check(`${mode} self canonical`,el('link[rel="canonical"]').href===`https://interpiad.com/tools/${slug}/`);
 const socialImage='https://interpiad.com/tools/images/'+slug+'-og.jpg';
 check(mode+' form-specific OG image',el('meta[property="og:image"]').content===socialImage);
 check(mode+' secure social image',el('meta[property="og:image:secure_url"]').content===socialImage);
 check(mode+' OG size and MIME',el('meta[property="og:image:width"]').content==='1200'&&el('meta[property="og:image:height"]').content==='630'&&el('meta[property="og:image:type"]').content==='image/jpeg');
 check(mode+' social image descriptions',el('meta[property="og:image:alt"]').content.length>15&&el('meta[name="twitter:image:alt"]').content===el('meta[property="og:image:alt"]').content);
 check(mode+' large Twitter card',el('meta[name="twitter:card"]').content==='summary_large_image'&&el('meta[name="twitter:image"]').content===socialImage);
 for(const variant of ['preview','og']){
  const bytes=fs.readFileSync('public/tools/images/'+slug+'-'+variant+'.jpg');
  check(mode+' '+variant+' JPEG exists',bytes.length>1000&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255);
 }

 check(`${mode} one h1`,d.querySelectorAll('h1').length===1);
 check(`${mode} public contact`,el('#form-contact').textContent.includes('010-2490-0555'));
 check(`${mode} custom price`,el('#business-options').textContent.includes('11,000원')&&el('#business-options').textContent.includes('300건'));
 const schema=Array.from(d.querySelectorAll('script[type="application/ld+json"]')).map(e=>JSON.parse(e.textContent));
 check(`${mode} free offer`,schema.find(e=>e['@type']==='WebApplication').offers.price==='0');
 check(`${mode} FAQ parity`,JSON.stringify(schema.find(e=>e['@type']==='FAQPage').mainEntity.map(e=>e.name))===JSON.stringify(Array.from(d.querySelectorAll('.guide-faq summary')).map(e=>e.textContent)));
 check(`${mode} no storage`,w.localStorage.length===0&&w.sessionStorage.length===0);
 check(`${mode} FAQ answers match visible copy`,JSON.stringify(schema.find(e=>e['@type']==='FAQPage').mainEntity.map(e=>e.acceptedAnswer.text))===JSON.stringify(Array.from(d.querySelectorAll('.guide-faq details p')).map(e=>e.textContent)));
 check(`${mode} friendly save guidance`,d.body.textContent.includes('창을 닫거나 새로고침하기 전에 PDF로 저장해 주세요.'));
 check(`${mode} tax document distinction`,d.body.textContent.includes('홈택스 등 별도 발급 서비스'));
 check(`${mode} no repeated vague disclaimers`,!['기준으로 안내','상담 항목','모든 세무 증빙 요건','세법상 요건','세금 신고가 이루어지지는'].some(text=>d.body.textContent.includes(text)));
 check(`${mode} free forms footer`,el('.form-footer a[href="/tools/"]').textContent==='무료업무서식');
 const blank=new JSDOM(html,{url:`https://interpiad.com/tools/${slug}/?blank=1`,runScripts:'outside-only'});
 blank.window.eval(formScript);
 check(`${mode} blank date`,blank.window.document.querySelector('[data-field="writtenDate"]').value==='');
 check(`${mode} blank totals`,blank.window.document.querySelector('[data-calc="supply"]').textContent==='');
 for(const file of ['public/sitemap.xml','public/index.xml','public/tools/index.xml'])check(`${slug} ${file}`,fs.readFileSync(file,'utf8').includes(`https://interpiad.com/tools/${slug}/`));
 dom.window.close();blank.window.close();
}
for(const file of ['public/index.html','public/tools/index.html']){
 const dom=new JSDOM(fs.readFileSync(file,'utf8'));
 const link=dom.window.document.querySelector('.site-footer a[href="/tools/"]');
 check(`${file} footer free forms link`,link&&link.textContent==='무료업무서식');
 if(file==='public/tools/index.html'){
  check('tools three cards',dom.window.document.querySelectorAll('.tools-card').length===3);
  const previews=[...dom.window.document.querySelectorAll('.tools-card .tools-preview img')];
  check('tools three distinct previews',previews.length===3&&new Set(previews.map(img=>img.src)).size===3);
  for(const img of previews){
   check('tools preview dimensions and alt',Number(img.width)>0&&Number(img.height)>0&&img.alt.length>15);
   check('tools preview lazy decoding',img.getAttribute('loading')==='lazy'&&img.getAttribute('decoding')==='async');
   const slug=img.getAttribute('src').split('/').pop().replace('-preview.jpg','');
   check('tools preview links to correct form',img.closest('a').getAttribute('href')==='/tools/'+slug+'/');
   check('tools preview source exists',fs.existsSync('public'+img.getAttribute('src')));
  }

  for(const slug of ['manual-invoice','manual-invoice-vertical','simple-receipt'])check('tools card '+slug,!!dom.window.document.querySelector('.tools-card a[href="/tools/'+slug+'/"]'));
 }
 dom.window.close();
}
console.log(JSON.stringify({passed,scope:'Local built HTML, schema, feed inclusion and form DOM logic; not browser layout or PDF rendering.'}));
