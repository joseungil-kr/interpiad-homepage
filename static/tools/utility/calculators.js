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
export function mount(root,key){({calculator,vat,margin,'unit-convert':unitConvert}[key]||(()=>{throw Error('도구가 아직 준비되지 않았습니다.');}))(root);}
