export async function api(path,method='GET',data){
 const session=method==='GET'?null:await api('/api/session');
 const response=await fetch(path,{method,headers:{'Content-Type':'application/json',...(session?{'X-CSRF-Token':session.csrf}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const result=await response.json();if(!response.ok)throw Error(response.status===401?'개인 저장·관리는 로그인이 필요합니다.':result.error);return result;
}
export const kinds={'manual-invoice':'거래명세표 가로','manual-invoice-vertical':'거래명세표 세로','simple-receipt':'간이영수증','quotation':'견적서','employment-contract':'근로계약서'};
export function element(tag,text,parent){const el=document.createElement(tag);el.textContent=text;parent?.append(el);return el;}
