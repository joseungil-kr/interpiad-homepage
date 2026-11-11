import {koreanWonText} from './korean-money.mjs';
import {quotationHTML} from './quotation.mjs';
import {contractHTML} from './employment-contract.mjs';
// In-memory only. No fetch, storage, cookies, telemetry or submission.
const quote=document.body.dataset.form==='quotation';
const root=document.getElementById('print-root');
const feedback=document.getElementById('feedback');
const blank=new URLSearchParams(location.search).get('blank')==='1';
root.innerHTML=quote?quotationHTML():contractHTML();
const fields=[...root.querySelectorAll('[data-field]')];
const get=k=>root.querySelector(`[data-field="${k}"]`);
const value=k=>get(k)?.value||'';
const numeric=s=>s.trim()===''?0:Number(s.replaceAll(',',''));
const won=n=>new Intl.NumberFormat('ko-KR').format(n);
let errors=[];
fields.forEach(el=>{
 if(el.type==='checkbox')return;
 const mirror=document.createElement('span');mirror.className='print-value';
 mirror.setAttribute('aria-hidden','true');el.after(mirror);
});
function show(k,n,empty=false){root.querySelectorAll(`[data-calc="${k}"]`).forEach(e=>e.textContent=empty?'':won(n));}
function synchronize(){
 errors=[];
 fields.forEach(el=>{
  el.removeAttribute('aria-invalid');
  if(el.type==='checkbox')return;
  el.nextElementSibling.textContent=el.tagName==='SELECT'?(el.value?el.selectedOptions[0].textContent:''):el.value;
  if(el.inputMode==='numeric'&&el.value!==''&&(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(el.value)||!Number.isSafeInteger(numeric(el.value)))){
   el.setAttribute('aria-invalid','true');errors.push(el.getAttribute('aria-label')+'에는 0 이상의 정수를 적어 주세요.');
  }
 });
 if(quote){
  let sum=0,complete=false;
  for(let i=0;i<15;i++){
   const q=value(`item-${i}-qty`),p=value(`item-${i}-price`);
   const both=q.trim()!==''&&p.trim()!=='';
   if((q.trim()==='')!==(p.trim()===''))errors.push((i+1)+'행의 수량과 단가를 모두 적어 주세요.');
   let amount=both?numeric(q)*numeric(p):0;
   if(!Number.isSafeInteger(amount)||amount<0){errors.push((i+1)+'행 금액을 확인해 주세요.');amount=0;}
   sum+=amount;complete=complete||both;
   show(`item-${i}-amount`,amount,!both||errors.length>0);
  }
  const tax=value('vatMode')==='exclusive'?Math.round(sum*.1):0;
  const grand=sum+tax,paid=numeric(value('paid'));
  const balance=grand-paid;
  if(!Number.isSafeInteger(grand)||!Number.isSafeInteger(balance))errors.push('계산 가능한 금액 범위를 넘었습니다.');
  if(paid>grand)errors.push('계약금이 합계금액을 초과했습니다.');
  for(const [key,n] of Object.entries({supply:sum,tax,grand,balance}))show(key,n,!complete||errors.length>0);
  root.querySelectorAll('[data-amount-korean]').forEach(el=>el.textContent=!complete||errors.length?'':(quote?koreanWonText(grand).split(' (₩')[0]:koreanWonText(grand)));
  root.querySelectorAll('[data-tax-caption]').forEach(el=>el.textContent=value('vatMode')==='exclusive'?'부가세 10% 가산':value('vatMode')==='exempt'?'부가세 미계산':'부가세 포함');
 }else{
  for(const key of ['startDate','endDate','writtenDate']){
   const v=value(key);if(!v)continue;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v){errors.push('날짜는 실제 날짜를 YYYY-MM-DD 형식으로 적어 주세요.');get(key).setAttribute('aria-invalid','true');}
  }
  if(value('startDate')&&value('endDate')&&value('startDate')>value('endDate'))errors.push('계약 종료일은 시작일보다 빠를 수 없습니다.');
  for(const key of ['startTime','endTime','breakStart','breakEnd'])if(value(key)&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value(key))) {errors.push('시간은 HH:MM 형식으로 적어 주세요.');get(key).setAttribute('aria-invalid','true');}
  if(value('payDay')&&(!/^\d{1,2}$/.test(value('payDay'))||+value('payDay')<1||+value('payDay')>31))errors.push('임금지급일은 1~31일로 적어 주세요.');
 }
 document.body.classList.toggle('form-invalid',errors.length>0);
 feedback.textContent=[...new Set(errors)].join(' ');
}
root.addEventListener('input',synchronize);root.addEventListener('change',synchronize);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
if(!blank&&get('writtenDate'))get('writtenDate').value=today;
synchronize();
document.getElementById('print-form').addEventListener('click',()=>{synchronize();if(errors.length){getInvalid()?.focus();feedback.scrollIntoView({block:'center'});return;}window.print();});
const getInvalid=()=>root.querySelector('[aria-invalid=true]');
window.addEventListener('beforeprint',synchronize);
document.getElementById('clear-form').addEventListener('click',()=>{
 if(!confirm('작성한 내용을 모두 지울까요? 보관하려면 취소한 뒤 PDF로 먼저 저장해 주세요.'))return;
 fields.forEach(el=>{if(el.type==='checkbox')el.checked=false;else if(el.tagName==='SELECT')el.selectedIndex=0;else el.value='';});
 if(!blank&&get('writtenDate'))get('writtenDate').value=today;synchronize();
});
if(blank&&new URLSearchParams(location.search).get('print')==='1')window.addEventListener('load',()=>setTimeout(()=>window.print(),350),{once:true});
