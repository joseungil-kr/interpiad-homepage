// Run after `hugo`: NODE_PATH=<directory containing jsdom> node tests/forms-dom.cjs
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
let passed = 0;
const check = (label, value) => { assert.ok(value, label); passed++; };
for (const [slug, mode] of [['manual-invoice','invoice'],['simple-receipt','receipt']]) {
 const html = fs.readFileSync(`public/tools/${slug}/index.html`,'utf8');
 const dom = new JSDOM(html,{url:`https://interpiad.com/tools/${slug}/`,runScripts:'outside-only'});
 const w=dom.window,d=w.document; w.confirm=()=>true;w.print=()=>{w.printed=true;};
 w.eval(fs.readFileSync('static/tools/forms/forms.js','utf8'));
 const el=s=>d.querySelector(s);
 const fill=(key,value)=>{const e=el(`[data-field="${key}"]`);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const calc=k=>el(`[data-calc="${k}"]`).textContent;
 check(`${mode} 2 copies`,d.querySelectorAll('.slip').length===2);
 check(`${mode} 30 rows`,d.querySelectorAll('[data-line]').length===30);
 fill('supplier','출력 테스트');fill('buyerContact','검수');
 check(`${mode} company mirror`,el('[data-mirror="supplier"]').textContent==='출력 테스트');
 check(`${mode} contact mirror`,el('[data-mirror="buyerContact"]').textContent==='검수');
 fill('item-0-qty','3');fill('item-0-price','10,000');
 check(`${mode} numeric format`,calc('supply')==='30,000');
 fill('item-14-qty','2');fill('item-14-price','500');
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
 if(mode==='invoice'){
  el('#vat-toggle').click();check('VAT',calc('tax')==='3,100');
  fill('previous','5000');fill('paid','10000');
  check('invoice total',calc('invoiceTotal')==='34,100');check('claim total',calc('grand')==='39,100');check('balance',calc('balance')==='29,100');
  fill('paid','50000');check('overpayment warning',el('#feedback').textContent.includes('초과'));
  el('#vat-toggle').click();check('VAT off',calc('tax')==='0');
 }
 el('#clear-form').click();check(`${mode} clear input`,el('[data-field="supplier"]').value==='');check(`${mode} clear totals`,calc('supply')==='0');
 el('#print-form').click();check(`${mode} print invoked`,w.printed===true);
 check(`${mode} self canonical`,el('link[rel="canonical"]').href===`https://interpiad.com/tools/${slug}/`);
 check(`${mode} one h1`,d.querySelectorAll('h1').length===1);
 check(`${mode} public contact`,el('#form-contact').textContent.includes('010-2490-0555'));
 check(`${mode} custom price`,el('#business-options').textContent.includes('11,000원')&&el('#business-options').textContent.includes('300건'));
 const schema=Array.from(d.querySelectorAll('script[type="application/ld+json"]')).map(e=>JSON.parse(e.textContent));
 check(`${mode} free offer`,schema.find(e=>e['@type']==='WebApplication').offers.price==='0');
 check(`${mode} FAQ parity`,JSON.stringify(schema.find(e=>e['@type']==='FAQPage').mainEntity.map(e=>e.name))===JSON.stringify(Array.from(d.querySelectorAll('.guide-faq summary')).map(e=>e.textContent)));
 check(`${mode} no storage`,w.localStorage.length===0&&w.sessionStorage.length===0);
 const blank=new JSDOM(html,{url:`https://interpiad.com/tools/${slug}/?blank=1`,runScripts:'outside-only'});
 blank.window.eval(fs.readFileSync('static/tools/forms/forms.js','utf8'));
 check(`${mode} blank date`,blank.window.document.querySelector('[data-field="writtenDate"]').value==='');
 check(`${mode} blank totals`,blank.window.document.querySelector('[data-calc="supply"]').textContent==='');
 for(const file of ['public/sitemap.xml','public/index.xml','public/tools/index.xml'])check(`${slug} ${file}`,fs.readFileSync(file,'utf8').includes(`https://interpiad.com/tools/${slug}/`));
 dom.window.close();blank.window.close();
}
console.log(JSON.stringify({passed,scope:'Local built HTML, schema, feed inclusion and form DOM logic; not browser layout or PDF rendering.'}));
