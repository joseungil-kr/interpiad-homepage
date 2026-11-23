import {api,kinds,element} from './common.js';
const status=document.querySelector('#status'),results=document.querySelector('#results'),search=document.querySelector('#search');let resource='documents';
const run=fn=>async()=>{try{await fn();}catch(e){status.textContent=e.message;}};
function button(label,parent,fn){const b=element('button',label,parent);b.type='button';b.onclick=run(fn);return b;}
function editor(row={}){const form=document.querySelector('#customer-editor');form.hidden=false;for(const key of ['name','address','phone','registration'])form.elements[key].value=row[key]||'';form.onsubmit=async e=>{e.preventDefault();await run(async()=>{await api('/api/customers'+(row.id?'/'+row.id:''),row.id?'PUT':'POST',{...Object.fromEntries(new FormData(form)),version:row.version});form.hidden=true;await load();})();};}
async function load(){for(const input of search.querySelectorAll('[name]')){const relevant=input.name==='trash'||(resource==='customers'?input.name==='name':input.name!=='name');input.disabled=!relevant;input.closest('label').hidden=!relevant;}const query=new URLSearchParams(new FormData(search));results.replaceChildren();const rows=await api('/api/'+resource+'?'+query);status.textContent=rows.length+'건';
 for(const row of rows){const card=element('article','',results);if(resource==='customers'){
 element('h2',row.name,card);element('p',[row.address,row.phone,row.registration].filter(Boolean).join(' · '),card);
 if(!row.deleted){button('수정',card,()=>editor(row));for(const [slug,label] of Object.entries(kinds)){if(slug==='employment-contract')continue;const a=element('a',label+' 새 작성',card);a.href='/tools/'+slug+'/?customer='+row.id;}}
 }else{const latest=row.versions[0];element('h2',kinds[row.kind]+' · '+latest.customer,card);element('p',latest.date+' · '+latest.number,card);
 for(const revision of row.versions){const line=element('p','버전 '+revision.version+' · '+revision.created+' ',card);button('열람·재출력',line,()=>{const viewer=document.querySelector('#viewer');viewer.hidden=false;viewer.querySelector('iframe').src='/api/documents/'+row.id+'/snapshot?version='+revision.version;viewer.scrollIntoView();});if(!row.deleted){const edit=element('a','이 버전으로 수정',line);edit.href='/tools/'+row.kind+'/?document='+row.id+'&version='+revision.version;}}}
 button(row.deleted?'복구':'휴지통으로',card,async()=>{if(!row.deleted&&!confirm('휴지통으로 옮길까요?'))return;await api('/api/'+resource+'/'+row.id+(row.deleted?'/restore':''),row.deleted?'POST':'DELETE');await load();});}}
search.onsubmit=e=>{e.preventDefault();run(load)();};document.querySelector('#documents').onclick=run(async()=>{resource='documents';await load();});document.querySelector('#customers').onclick=run(async()=>{resource='customers';await load();});document.querySelector('#add').onclick=()=>editor();
document.querySelector('#logout').onclick=run(async()=>{await api('/api/logout','POST');location.reload();});
document.querySelector('#reprint').onclick=()=>document.querySelector('#viewer iframe').contentWindow.print();
document.querySelector('#close-viewer').onclick=()=>document.querySelector('#viewer').hidden=true;
try{await api('/api/session');document.querySelector('#workspace').hidden=false;document.querySelector('#login').hidden=true;await load();}catch(e){status.textContent=e.message;}

try{const {providers}=await api('/api/auth-status');for(const [name,ready] of Object.entries(providers)){const a=document.querySelector('#login .provider-'+name);if(a&&!ready){a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.append(' · 연결 준비 중');}}}catch{}
