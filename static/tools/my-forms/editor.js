import {api,element} from './common.js';
await new Promise(resolve=>{if(document.querySelector('#print-root [data-field]'))return resolve();const observer=new MutationObserver(()=>{if(document.querySelector('#print-root [data-field]')){observer.disconnect();resolve();}});observer.observe(document.querySelector('#print-root'),{childList:true,subtree:true});});
const panel=element('section','',document.querySelector('.toolbar'));
panel.className='personal-tools';const link=element('a','내 서식 관리',panel);link.href='/tools/my-forms/';link.target='_blank';link.rel='noopener';
const save=element('button','발행본 저장',panel);save.type='button';
const picker=element('button','거래처 불러오기',panel);picker.type='button';
const status=element('span','저장할 때만 로그인과 정보 전송이 필요합니다.',panel);status.setAttribute('role','status');
const params=new URLSearchParams(location.search),id=params.get('document');let version;
const fields=()=>[...document.querySelectorAll('#print-root [data-field]')];
function apply(values){for(const el of fields()){if(values[el.dataset.field]===undefined)continue;if(el.type==='checkbox')el.checked=values[el.dataset.field]==='true';else el.value=values[el.dataset.field];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}
if(id){try{const doc=await api('/api/documents/'+encodeURIComponent(id));const v=doc.versions.find(v=>v.version===Number(params.get('version')))||doc.versions[0];if(v.kind!==location.pathname.split('/')[2])throw Error('서식 종류가 다릅니다.');apply(v.fields);version=doc.versions[0].version;save.textContent='수정본을 새 버전으로 저장';status.textContent='버전 '+v.version+'을 불러왔습니다. 원본은 보존됩니다.';}catch(e){status.textContent=e.message;save.disabled=true;}}
picker.onclick=async()=>{try{const rows=await api('/api/customers');let select=panel.querySelector('select');if(select)select.remove();select=element('select','',panel);select.setAttribute('aria-label','거래처 선택');const placeholder=element('option','거래처 선택',select);placeholder.value='';for(const row of rows){const opt=element('option',row.name,select);opt.value=row.id;}select.onchange=()=>{const row=rows.find(r=>r.id===select.value);if(row)apply({buyer:row.name,buyerAddress:row.address,buyerPhone:row.phone,buyerContact:row.phone,buyerNo:row.registration});};}catch(e){status.textContent=e.message;}};
save.onclick=async()=>{save.disabled=true;try{
 await api('/api/session');if(document.querySelector('[aria-invalid="true"]')||document.body.classList.contains('form-invalid'))throw Error('입력 오류를 먼저 수정해 주세요.');
 const values=Object.fromEntries(fields().map(el=>[el.dataset.field,el.type==='checkbox'?String(el.checked):el.value]));
 const date=prompt('발행일 (YYYY-MM-DD)',/^\d{4}-\d{2}-\d{2}$/.test(values.writtenDate||'')?values.writtenDate:new Date().toISOString().slice(0,10));if(date===null)return;
 const number=prompt('발행 번호',values.slipNumber||'');if(number===null)return;
 const customer=prompt('거래처명',values.buyer||'');if(customer===null)return;
 const copy=document.querySelector('#print-root').cloneNode(true);copy.querySelectorAll('script').forEach(el=>el.remove());
 for(const el of copy.querySelectorAll('input,textarea,select,button')){const span=document.createElement('span');span.textContent=el.type==='checkbox'?(el.checked?'✓':'□'):el.tagName==='SELECT'?el.selectedOptions[0]?.textContent||'':el.value||el.textContent;el.replaceWith(span);}
 const styles=await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(async el=>{const r=await fetch(el.href);if(!r.ok)throw Error('서식 스타일을 보존하지 못했습니다.');return r.text();}));
 const snapshot='<!doctype html><html lang="ko"><meta charset="utf-8"><title>발행본</title><style>'+styles.join('\n')+'\n'+[...document.querySelectorAll('style')].map(e=>e.textContent).join('\n')+' .print-value{display:none!important} body{margin:0} </style><body>'+copy.outerHTML+'</body></html>';
 const result=await api('/api/documents'+(id?'/'+encodeURIComponent(id):''),id?'PUT':'POST',{kind:location.pathname.split('/')[2],date,number,customer,fields:values,snapshot,version});
 location.href='/tools/my-forms/?saved='+result.id;
 }catch(e){status.textContent=e.message;}finally{save.disabled=false;}};

if(params.has('customer')){try{const c=await api('/api/customers/'+encodeURIComponent(params.get('customer')));if(c.deleted)throw Error('휴지통의 거래처입니다.');apply({buyer:c.name,buyerAddress:c.address,buyerPhone:c.phone,buyerContact:c.phone,buyerNo:c.registration});}catch(e){status.textContent=e.message;}}
