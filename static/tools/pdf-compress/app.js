/* Interpiad PDF compressor: only local, in-browser processing.
   Source engines: J.G.Moore's MIT-licensed image compressor + pdf-lib. */
(function () {
'use strict';
const el=id=>document.getElementById(id);
const input=el('pdf-file'),zone=el('drop-zone'),info=el('file-info');
const name=el('file-name'),size=el('file-size'),start=el('compress-button');
const remove=el('remove-file'),cancel=el('cancel-button'),feedback=el('feedback');
const progressBox=el('progress-area'),progress=el('progress'),pText=el('progress-label'),pNum=el('progress-number');
const result=el('result'),rTitle=el('result-title'),rBefore=el('before-size'),rAfter=el('after-size');
const saved=el('saved-percent'),rNote=el('result-note'),download=el('download-button');
let selected=null,busy=false,stopped=false,outputURL=null,selection=0;
const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const maxBytes=(mobile?12:40)*1048576;
const presets={quality:[85,220],balanced:[70,150],small:[48,96]};
const fmt=bytes=>bytes>=1048576?(bytes/1048576).toFixed(2)+' MB':bytes>=1024?Math.round(bytes/1024)+' KB':bytes+' B';
function notify(msg,error){feedback.textContent=msg||'';feedback.classList.toggle('error',!!error);}
function release(){if(outputURL){URL.revokeObjectURL(outputURL);outputURL=null;}download.removeAttribute('href');download.hidden=true;}
function clearResult(){release();result.hidden=true;progressBox.hidden=true;progress.value=0;pNum.textContent='0%';}
function show(frac,msg){
 if(stopped)throw new Error('CANCELLED');
 const n=Math.max(0,Math.min(100,Math.round(frac)));
 progressBox.hidden=false;progress.value=n;pNum.textContent=n+'%';pText.textContent=msg;
}
function isPDF(b){const s=new TextDecoder('latin1').decode(b);const i=s.indexOf('%PDF-');return i>=0&&i<1024;}
function outputName(file){
 const stem=file.replace(/\.pdf$/i,'').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').replace(/^\.+/,'').slice(0,75).trim();
 return (stem||'document')+'-compressed.pdf';
}
function reset(){
 if(busy)return;
 selection++;selected=null;input.value='';info.hidden=true;name.textContent='';size.textContent='';
 start.disabled=true;clearResult();notify('');
}
async function choose(file){
 if(busy)return;
 reset();const token=selection;
 if(!file)return;
 if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){notify('PDF 파일(.pdf)을 선택해 주세요.',true);return;}
 if(file.size<20){notify('내용이 없는 PDF 파일입니다.',true);return;}
 if(file.size>maxBytes){notify('이 기기에서는 '+(mobile?'12':'40')+'MB 이하 PDF를 선택해 주세요.',true);return;}
 try{
  const head=new Uint8Array(await file.slice(0,1024).arrayBuffer());
  if(token!==selection)return;
  if(!isPDF(head)){notify('PDF 형식이 확인되지 않습니다. 다른 파일을 선택해 주세요.',true);return;}
  selected=file;name.textContent=file.name;size.textContent=fmt(file.size)+' · 파일은 서버에 전송되지 않습니다';
  info.hidden=false;start.disabled=false;notify('압축 수준을 선택한 뒤 PDF 압축하기를 누르세요.');
 }catch(e){notify('파일을 읽지 못했습니다. 파일 접근 상태를 확인해 주세요.',true);}
}
function hasSignature(doc){
 const key=PDFLib.PDFName.of('ByteRange');
 return doc.context.enumerateIndirectObjects().some(pair=>{
  const o=pair[1],d=o&&o.dict&&typeof o.dict.has==='function'?o.dict:(o&&typeof o.has==='function'?o:null);
  return !!(d&&d.has(key));
 });
}
function userError(e){
 const s=(e&&e.message)||String(e);
 if(s==='CANCELLED')return '작업을 취소했습니다. 원본은 변경되지 않았습니다.';
 if(s==='SIGNED')return '전자서명된 PDF는 압축하면 서명이 무효화될 수 있어 처리하지 않습니다.';
 if(s==='PAGES')return '최대 150페이지까지 처리합니다. 파일을 나누어 시도해 주세요.';
 if(/Encrypt|password|encrypted/i.test(s))return '암호가 설정된 PDF는 압축할 수 없습니다.';
 if(/memory|allocation|canvas/i.test(s))return '기기 메모리 또는 이미지 처리 한도에 도달했습니다. 더 작은 파일로 시도해 주세요.';
 if(/Invalid|header|parse|PDFDocument|corrupt|failed to/i.test(s))return 'PDF 내용을 읽을 수 없습니다. 파일이 손상됐거나 지원하지 않는 형식일 수 있습니다.';
 return '압축 중 오류가 발생했습니다. 원본 PDF는 변경되지 않았습니다. 다른 파일 또는 수준으로 시도해 주세요.';
}
async function run(){
 if(!selected||busy)return;
 if(typeof PDFLib==='undefined'||typeof analyzePDF!=='function'||typeof compressImages!=='function'){
  notify('압축 라이브러리를 읽지 못했습니다. 페이지를 새로 열어 주세요.',true);return;
 }
 busy=true;stopped=false;start.disabled=true;remove.disabled=true;input.disabled=true;cancel.hidden=false;clearResult();notify('');
 try{
  show(2,'파일을 브라우저에서 읽는 중…');
  const file=selected,bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length>maxBytes||!isPDF(bytes.subarray(0,1024)))throw new Error('INVALID');
  show(9,'PDF 페이지를 확인하는 중…');
  const source=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});
  const pages=source.getPageCount();
  if(pages===0||pages>150)throw new Error('PAGES');
  if(hasSignature(source))throw new Error('SIGNED');
  const analysis=await analyzePDF(bytes,f=>show(10+f*20,'PDF 내부 이미지를 분석하는 중…'));
  const level=document.querySelector('input[name="level"]:checked');
  const preset=presets[level&&level.value]||presets.balanced;
  // Avoid creating massive canvases from unusually large image XObjects.
  analysis.images=analysis.images.filter(x=>x.width>0&&x.height>0&&x.width*x.height<=12000000);
  let out;
  if(analysis.images.length){
   out=await compressImages(bytes,analysis,preset[0],preset[1],f=>show(30+f*58,'PDF 이미지를 재압축하는 중…'));
  }else{
   show(65,'압축할 이미지가 없어 PDF 구조를 정리하는 중…');
   out=await source.save({useObjectStreams:true,updateFieldAppearances:false});
  }
  show(93,'PDF 결과를 검증하는 중…');
  const verified=await PDFLib.PDFDocument.load(out,{updateMetadata:false});
  if(verified.getPageCount()!==pages||out.byteLength<100||out.byteLength>bytes.byteLength*2)throw new Error('OUTPUT');
  show(100,'검증 완료');
  result.hidden=false;rBefore.textContent=fmt(bytes.length);rAfter.textContent=fmt(out.length);
  const reduced=bytes.length-out.length;
  if(reduced<=0){
   rTitle.textContent='용량이 더 줄어들지 않았습니다';saved.textContent='0%';
   rNote.textContent='이미 최적화된 PDF이거나 지원하지 않는 이미지 형식일 수 있습니다. 원본보다 큰 결과는 제공하지 않습니다. 원본을 그대로 사용하세요.';
  }else{
   rTitle.textContent='PDF 압축 완료';saved.textContent=(reduced/bytes.length*100).toFixed(1)+'% ↓';
   rNote.textContent=fmt(reduced)+' 줄었습니다. 저장 후 텍스트·이미지·페이지 배치가 정상인지 확인해 사용하세요.';
   outputURL=URL.createObjectURL(new Blob([out],{type:'application/pdf'}));
   download.href=outputURL;download.download=outputName(file.name);download.hidden=false;
  }
  notify('처리 완료. 원본 PDF는 변경되지 않았습니다.');
 }catch(e){result.hidden=true;notify(userError(e),(e&&e.message)!=='CANCELLED');}
 finally{busy=false;stopped=false;start.disabled=!selected;remove.disabled=false;input.disabled=false;cancel.hidden=true;progressBox.hidden=true;}
}
zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}});
['dragenter','dragover'].forEach(type=>zone.addEventListener(type,e=>{e.preventDefault();zone.classList.add('dragover');}));
['dragleave','drop'].forEach(type=>zone.addEventListener(type,e=>{e.preventDefault();zone.classList.remove('dragover');}));
zone.addEventListener('drop',e=>choose(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]));
input.addEventListener('change',()=>choose(input.files&&input.files[0]));
remove.addEventListener('click',reset);start.addEventListener('click',run);
cancel.addEventListener('click',()=>{stopped=true;notify('현재 처리 중인 단계가 끝나면 취소합니다.');});
})();
