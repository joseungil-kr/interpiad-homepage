export function el(root,id){return root.querySelector('#'+id);}
export function set(root,id,value){el(root,id).textContent=String(value);}
export function msg(root,value,err){const node=el(root,'status');if(node){node.textContent=value;node.classList.toggle('is-error',!!err);}}
export function number(root,id){const n=Number(el(root,id).value);return Number.isFinite(n)?n:NaN;}
export function won(n){return Number.isFinite(n)?new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(n):'—';}
export function save(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function asBytes(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB';}
export function safeName(file,ext){return (file.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'-').slice(0,90)||'interpiad')+ext;}
export function fields(root,html){root.innerHTML=html+'<p id="status" class="it-status" role="status" aria-live="polite"></p>';}
export function two(n){return String(n).padStart(2,'0');}
export function fileLimit(file,max){if(!file)throw Error('파일을 선택해 주세요.');if(file.size>max)throw Error('파일이 너무 큽니다. 이 도구의 최대 용량은 '+asBytes(max)+'입니다.');}
