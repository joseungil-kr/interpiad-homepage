import {el,fields,msg,number,won} from './helpers.js';
const F=(label,id,value,extra)=>'<label class="it-field">'+label+'<input id="'+id+'" type="number" inputmode="decimal" step="any" value="'+value+'" '+(extra||'')+'></label>';
const btn='<div class="it-actions"><button type="button" id="run">계산하기</button></div><div class="it-result" id="output" role="status" aria-live="polite">값을 입력한 다음 계산하기를 누르세요.</div>';
function out(root,t){el(root,'output').textContent=t;}
function fmt(n){return won(Math.round(n*100)/100);}
function finite(a){if(!a.every(Number.isFinite))throw Error('올바른 숫자를 입력해 주세요.');}
function calculator(root){
 fields(root,'<div class="it-fields">'+F('첫 번째 숫자','a','100')+F('두 번째 숫자','b','10')+'<label class="it-field">계산 방식<select id="op"><option value="add">더하기 +</option><option value="sub">빼기 −</option><option value="mul">곱하기 ×</option><option value="div">나누기 ÷</option><option value="percent">A의 B%</option><option value="change">A에서 B로 증감률</option></select></label></div>'+btn);
 el(root,'run').onclick=()=>{try{const a=number(root,'a'),b=number(root,'b');finite([a,b]);let result;switch(el(root,'op').value){case 'add':result=a+b;break;case 'sub':result=a-b;break;case 'mul':result=a*b;break;case 'div':if(!b)throw Error('0으로 나눌 수 없습니다.');result=a/b;break;case 'percent':result=a*b/100;break;case 'change':if(!a)throw Error('첫 번째 숫자가 0이면 증감률을 구할 수 없습니다.');result=(b-a)/Math.abs(a)*100;break;}out(root,'계산 결과: '+fmt(result)+(el(root,'op').value==='change'?'%':''));msg(root,'');}catch(e){msg(root,e.message,true);}};
}
function vat(root){
 fields(root,'<div class="it-fields"><label class="it-field">입력 금액 기준<select id="mode"><option value="base">부가세 별도 공급가액</option><option value="total">부가세 포함 합계</option></select></label>'+F('금액(원)','amount','110000','min="0"')+'</div>'+btn);
 el(root,'run').onclick=()=>{const amount=number(root,'amount');if(!Number.isFinite(amount)||amount<0){msg(root,'0 이상의 금액을 입력해 주세요.',true);return;}const base=el(root,'mode').value==='base'?Math.round(amount):Math.round(amount/1.1);const tax=el(root,'mode').value==='base'?Math.round(base*.1):Math.round(amount)-base;out(root,'공급가액 '+won(base)+'원 · 부가세 '+won(tax)+'원 · 합계 '+won(base+tax)+'원');msg(root,'원 단위 반올림 기준입니다.');};
}
function margin(root){
 fields(root,'<div class="it-fields">'+F('매입 원가(원)','cost','10000','min="0"')+F('판매가(원)','price','18000','min="0"')+F('포장·배송 등 추가비(원)','extra','1000','min="0"')+F('판매수수료(%)','fee','5','min="0" max="99"')+F('목표 마진율(%)','goal','30','min="-99" max="99"')+'</div>'+btn);
 el(root,'run').onclick=()=>{const cost=number(root,'cost'),price=number(root,'price'),extra=number(root,'extra'),fee=number(root,'fee')/100,goal=number(root,'goal')/100;if([cost,price,extra,fee,goal].some(n=>!Number.isFinite(n))||cost<0||price<=0||extra<0||fee<0||fee>=1){msg(root,'원가·수수료율·판매가를 확인해 주세요.',true);return;}const profit=price*(1-fee)-cost-extra,margin=profit/price*100,denominator=1-fee-goal;const target=denominator>0?(cost+extra)/denominator:null;out(root,'실제 이익 '+fmt(profit)+'원 · 마진율 '+fmt(margin)+'% · 목표 마진 판매가 '+(target===null?'계산 불가 (목표 마진과 수수료 합계가 100% 이상)':fmt(target)+'원 이상'));msg(root,'판매가 기준 수수료를 먼저 차감하고 계산합니다.');};
}
const sets={
 area:[['㎡ (제곱미터)',1],['평',3.3057851239669422],['ha (헥타르)',10000],['ft²',.09290304]],
 length:[['m (미터)',1],['cm',.01],['mm',.001],['km',1000],['inch',.0254],['ft',.3048]],
 weight:[['kg',1],['g',.001],['t',1000],['lb',.45359237]],
 volume:[['L (리터)',1],['mL',.001],['m³ (세제곱미터)',1000]]
};
function unitConvert(root){
 fields(root,'<div class="it-fields"><label class="it-field">종류<select id="kind"><option value="area">면적</option><option value="length">길이</option><option value="weight">무게</option><option value="volume">부피</option></select></label>'+F('변환할 값','value','1')+'<label class="it-field">원래 단위<select id="from"></select></label><label class="it-field">바꿀 단위<select id="to"></select></label></div><p class="it-hint">평에서 m³는 바로 환산할 수 없습니다. 아래에는 별도로 높이를 입력해 부피를 계산할 수 있습니다.</p><label class="it-field">면적의 높이(m · 부피 계산 시에만 사용)<input id="height" type="number" value="2.4" min="0" step="any"></label>'+btn);
 const refresh=()=>{const s=sets[el(root,'kind').value];for(const key of ['from','to']){const n=el(root,key);n.replaceChildren();s.forEach((v,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=v[0];n.add(opt);});}el(root,'to').value='1';};
 el(root,'kind').onchange=refresh;refresh();
 el(root,'run').onclick=()=>{const v=number(root,'value'),s=sets[el(root,'kind').value];if(!Number.isFinite(v)){msg(root,'숫자를 입력해 주세요.',true);return;}const inBase=v*s[Number(el(root,'from').value)][1],n=inBase/s[Number(el(root,'to').value)][1];let t=fmt(v)+' '+s[Number(el(root,'from').value)][0]+' = '+fmt(n)+' '+s[Number(el(root,'to').value)][0];if(el(root,'kind').value==='area'){const h=number(root,'height');if(h>=0&&Number.isFinite(h))t+=' · 높이 '+fmt(h)+'m일 때 부피 '+fmt(inBase*h)+'m³';}out(root,t);msg(root,'');};
}
function discount(root){
 fields(root,'<div class="it-fields">'+F('정가(원)','price','30000','min="0"')+F('할인율(%)','percent','20','min="0" max="100"')+'</div>'+btn);
 el(root,'run').onclick=()=>{const p=number(root,'price'),v=number(root,'percent');if(p<0||v<0||v>100||!Number.isFinite(p)||!Number.isFinite(v)){msg(root,'정가와 0~100% 할인율을 입력해 주세요.',true);return;}out(root,'할인액 '+fmt(p*v/100)+'원 · 할인 판매가 '+fmt(p*(1-v/100))+'원');msg(root,'');};
}
function dday(root){
 fields(root,'<div class="it-fields"><label class="it-field">시작일<input id="start" type="date"></label><label class="it-field">종료일<input id="end" type="date"></label></div>'+btn);
 const today=new Date();el(root,'start').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 el(root,'end').value=el(root,'start').value;
 el(root,'run').onclick=()=>{try{
  const parse=id=>{const m=el(root,id).value.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)throw Error('날짜를 입력해 주세요.');return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));};
  const diff=Math.round((parse('end')-parse('start'))/86400000),included=diff>=0?diff+1:Math.abs(diff)+1;
  out(root,'두 날짜 차이 '+Math.abs(diff)+'일 · '+(diff===0?'D-Day 오늘':diff>0?'D-'+diff:'D+'+(-diff))+' · 양 끝 날짜 포함 '+included+'일');msg(root,'');
 }catch(e){msg(root,e.message,true);}};
}
function loan(root){
 fields(root,'<div class="it-fields">'+F('대출 원금(원)','principal','10000000','min="0"')+F('연이율(%)','rate','4.5','min="0"')+F('상환 기간(개월)','months','36','min="1" max="600"')+'</div>'+btn);
 el(root,'run').onclick=()=>{const p=number(root,'principal'),r=number(root,'rate')/1200,n=number(root,'months');if(![p,r,n].every(Number.isFinite)||p<=0||r<0||!Number.isInteger(n)||n<1||n>600){msg(root,'원금·연이율·1~600개월 기간을 확인해 주세요.',true);return;}const monthly=r===0?p/n:p*r/(1-Math.pow(1+r,-n));out(root,'원리금균등 월 납입액 '+fmt(monthly)+'원 · 총 납입액 '+fmt(monthly*n)+'원 · 총 이자 '+fmt(monthly*n-p)+'원');msg(root,'고정금리와 매월 동일 상환일 가정이며 실제 금융기관 금액과 다를 수 있습니다.');};
}
function utm(root){
 fields(root,'<label class="it-field">원본 URL<input id="url" type="url" value="https://interpiad.com/" placeholder="https://example.com/page"></label><div class="it-fields"><label class="it-field">Source (출처)<input id="source" type="text" value="naver"></label><label class="it-field">Medium (매체)<input id="medium" type="text" value="social"></label><label class="it-field">Campaign (캠페인)<input id="campaign" type="text" value="autumn"></label><label class="it-field">Content (선택)<input id="content" type="text"></label></div>'+btn+'<label class="it-field">생성된 URL<textarea id="generated" rows="4" readonly></textarea></label><div class="it-actions"><button id="copy" class="it-secondary" type="button">URL 복사</button></div>');
 el(root,'run').onclick=()=>{try{
  const u=new URL(el(root,'url').value.trim());if(!/^https?:$/.test(u.protocol))throw Error('http 또는 https 주소만 입력해 주세요.');
  for(const id of ['source','medium','campaign','content']){const value=el(root,id).value.trim();if(id!=='content'&&!value)throw Error('Source, Medium, Campaign을 입력해 주세요.');if(value)u.searchParams.set('utm_'+id,value);else u.searchParams.delete('utm_'+id);}
  el(root,'generated').value=u.toString();msg(root,'링크가 생성됐습니다.');
 }catch(e){msg(root,e.message,true);}};
 el(root,'copy').onclick=async()=>{try{if(!el(root,'generated').value)throw Error('먼저 URL을 생성해 주세요.');await navigator.clipboard.writeText(el(root,'generated').value);msg(root,'URL을 복사했습니다.');}catch(e){msg(root,'복사에 실패했습니다. URL을 직접 선택해 복사하세요.',true);}};
}
function roas(root){
 fields(root,'<div class="it-fields">'+F('광고 매출(원)','sales','1000000','min="0"')+F('광고비(원)','spend','300000','min="0"')+F('상품 원가 합계(원)','goods','350000','min="0"')+F('배송·포장비 합계(원)','ship','50000','min="0"')+F('매출 대비 판매수수료(%)','fee','5','min="0" max="99"')+'</div>'+btn);
 el(root,'run').onclick=()=>{const sales=number(root,'sales'),spend=number(root,'spend'),goods=number(root,'goods'),ship=number(root,'ship'),fee=number(root,'fee')/100;if(![sales,spend,goods,ship,fee].every(Number.isFinite)||sales<=0||spend<=0||goods<0||ship<0||fee<0||fee>=1){msg(root,'매출·광고비는 0보다 크고 비용은 0 이상이어야 합니다.',true);return;}const net=sales*(1-fee)-goods-ship-spend,roas=sales/spend*100,contrib=(sales*(1-fee)-goods-ship)/sales,be=contrib>0?100/contrib:null;out(root,'ROAS '+fmt(roas)+'% · 광고 반영 순이익 '+fmt(net)+'원 · 현재 원가율 기준 손익분기 ROAS '+(be===null?'산출 불가':fmt(be)+'%'));msg(root,'환불·인건비 등 미입력 비용은 포함되지 않습니다.');};
}
function seoPreview(root){
 fields(root,'<label class="it-field">페이지 제목<input id="title" type="text" value="마케팅 무료 업무도구 | 인터피아드" maxlength="200"></label><label class="it-field">표시 URL<input id="url" type="url" value="https://interpiad.com/tools/apps/"></label><label class="it-field">메타 설명<textarea id="desc" rows="4" maxlength="500">설치·회원가입 없이 사용하는 무료 업무도구. 이미지·PDF·계산기·타이머를 브라우저에서 바로 사용하세요.</textarea></label><div class="it-result"><div id="length"></div><div class="it-preview-search"><small id="seo-url"></small><strong id="seo-title"></strong><p id="seo-desc"></p></div></div><p class="it-hint">검색엔진은 실제 표시 내용을 다르게 생성하거나 일부를 생략할 수 있습니다.</p>');
 const render=()=>{const title=el(root,'title').value,desc=el(root,'desc').value,url=el(root,'url').value;el(root,'length').textContent='제목 '+Array.from(title).length+'자 · 설명 '+Array.from(desc).length+'자';el(root,'seo-title').textContent=title;el(root,'seo-desc').textContent=desc;el(root,'seo-url').textContent=url;};
 ['title','url','desc'].forEach(k=>el(root,k).addEventListener('input',render));render();
}
function textCount(root){
 fields(root,'<label class="it-field">내용 입력<textarea id="text" rows="9" placeholder="글을 입력하거나 붙여넣으세요."></textarea></label><div class="it-result" id="output" role="status" aria-live="polite"></div><div class="it-actions"><button id="clear" class="it-secondary" type="button">내용 지우기</button></div>');
 const render=()=>{const s=el(root,'text').value;out(root,'공백 포함 '+Array.from(s).length+'자 · 공백 제외 '+Array.from(s.replace(/\s/g,'')).length+'자 · UTF-8 '+new TextEncoder().encode(s).length+'바이트 · 단어 '+(s.trim()?s.trim().split(/\s+/).length:0)+'개 · 줄 '+(s?s.split(/\r\n|\r|\n/).length:0)+'개');};
 el(root,'text').oninput=render;el(root,'clear').onclick=()=>{el(root,'text').value='';render();};render();
}
function color(root){
 fields(root,'<div class="it-fields"><label class="it-field">색상 선택<input id="picker" type="color" value="#0b756a"></label><label class="it-field">HEX 코드<input id="hex" type="text" value="#0B756A" maxlength="7"></label></div><div id="palette" class="it-toolbar" role="group" aria-label="밝기별 팔레트"></div><div id="output" class="it-result" role="status" aria-live="polite"></div><div class="it-actions"><button type="button" id="copy" class="it-secondary">HEX 복사</button></div>');
 const hsl=(r,g,b)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0,s=0,l=(max+min)/2;if(d){s=d/(1-Math.abs(2*l-1));switch(max){case r:h=((g-b)/d)%6;break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h*=60;if(h<0)h+=360;}return [Math.round(h),Math.round(s*100),Math.round(l*100)];};
 const render=()=>{const value=el(root,'hex').value.trim();if(!/^#[\da-fA-F]{6}$/.test(value)){msg(root,'HEX 코드는 #RRGGBB 여섯 자리로 입력하세요.',true);return;}const r=parseInt(value.slice(1,3),16),g=parseInt(value.slice(3,5),16),b=parseInt(value.slice(5,7),16),x=hsl(r,g,b);el(root,'picker').value=value;out(root,'HEX '+value.toUpperCase()+' · RGB '+r+', '+g+', '+b+' · HSL '+x[0]+'°, '+x[1]+'%, '+x[2]+'%');const pal=el(root,'palette');pal.replaceChildren();for(let l=20;l<=90;l+=10){const span=document.createElement('span');span.className='it-color';span.style.background='hsl('+x[0]+' '+x[1]+'% '+l+'%)';span.title='밝기 '+l+'%';pal.appendChild(span);}msg(root,'');};
 el(root,'hex').oninput=render;el(root,'picker').oninput=()=>{el(root,'hex').value=el(root,'picker').value;render();};
 el(root,'copy').onclick=async()=>{try{await navigator.clipboard.writeText(el(root,'hex').value);msg(root,'HEX 색상을 복사했습니다.');}catch(e){msg(root,'복사 실패: HEX를 직접 선택해 복사하세요.',true);}};render();
}
const currencyCodes=['KRW','USD','JPY','EUR','CNY','GBP','AUD','CAD','TWD','THB','VND'];
const currencyCache=new Map();
function fx(root){
 const options=currencyCodes.map(x=>'<option value="'+x+'">'+x+'</option>').join('');
 fields(root,'<div class="it-fields">'+F('변환할 금액','amount','100','min="0"')+'<label class="it-field">원래 통화<select id="from">'+options+'</select></label><label class="it-field">바꿀 통화<select id="to">'+options+'</select></label></div><p class="it-hint">무료 공개 기준환율 API를 버튼 클릭 시 조회합니다. 환전 수수료가 포함된 실제 적용환율과 다릅니다.</p>'+btn);
 el(root,'from').value='USD';el(root,'to').value='KRW';
 el(root,'run').onclick=async()=>{const amount=number(root,'amount'),from=el(root,'from').value,to=el(root,'to').value;if(!Number.isFinite(amount)||amount<0){msg(root,'0 이상의 금액을 입력해 주세요.',true);return;}if(from===to){out(root,fmt(amount)+' '+from+' = '+fmt(amount)+' '+to);msg(root,'같은 통화는 외부 조회가 필요 없습니다.');return;}
  const key=from+':'+to;try{msg(root,'참고환율 조회 중…');let data=currencyCache.get(key);if(!data||Date.now()-data.ts>3600000){
   const response=await fetch('https://api.frankfurter.dev/v1/latest?base='+encodeURIComponent(from)+'&symbols='+encodeURIComponent(to),{mode:'cors',credentials:'omit',cache:'default'});if(!response.ok)throw Error('환율 서비스가 일시적으로 응답하지 않습니다.');
   const json=await response.json();const rate=json.rates&&Number(json.rates[to]);if(!Number.isFinite(rate)||rate<=0)throw Error('해당 통화 조합의 환율을 찾지 못했습니다.');
   data={rate,date:json.date,ts:Date.now()};currencyCache.set(key,data);
  }
  out(root,fmt(amount)+' '+from+' = '+fmt(amount*data.rate)+' '+to+' · 기준환율 1 '+from+' = '+fmt(data.rate)+' '+to);msg(root,'기준일 '+data.date+' · 환전 수수료 미포함');}
  catch(e){msg(root,e.message,true);}
 };
}
export function mount(root,key){({calculator,vat,margin,'unit-convert':unitConvert,'discount':discount,'dday':dday,'loan':loan,'utm':utm,'roas':roas,'seo-preview':seoPreview,'text-count':textCount,'color':color,'fx':fx}[key]||(()=>{throw Error('도구가 아직 준비되지 않았습니다.');}))(root);}
