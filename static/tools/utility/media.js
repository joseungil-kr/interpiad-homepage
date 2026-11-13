import {el,fields,msg,fileLimit,asBytes,safeName,save} from './helpers.js';
const MAX=30*1024*1024;
async function draw(file,width){
 fileLimit(file,MAX);
 if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('JPG·PNG·WebP 이미지 파일을 선택해 주세요.');
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('이미지를 읽을 수 없습니다.'));img.src=url;});
  const oldW=image.naturalWidth,oldH=image.naturalHeight;
  if(!oldW||!oldH)throw Error('가로·세로 크기를 확인할 수 없습니다.');
  const scale=width?Math.min(1,width/oldW):1;
  const w=Math.max(1,Math.round(oldW*scale)),h=Math.max(1,Math.round(oldH*scale));
  if(w*h>17000000)throw Error('이미지 해상도가 너무 큽니다. 가로폭을 줄이거나 작은 파일을 선택해 주세요.');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw Error('이미지 처리를 시작하지 못했습니다.');
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,0,0,w,h);return {canvas,w,h,oldW,oldH};
 }finally{URL.revokeObjectURL(url);}
}
function encode(canvas,type,quality){
 if(type==='image/jpeg'){const merged=document.createElement('canvas');merged.width=canvas.width;merged.height=canvas.height;const ctx=merged.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,merged.width,merged.height);ctx.drawImage(canvas,0,0);canvas=merged;}
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('변환 결과를 만들지 못했습니다.')),type,quality));
}
function preview(root,blob){const p=el(root,'preview');if(p.dataset.url)URL.revokeObjectURL(p.dataset.url);const url=URL.createObjectURL(blob);p.dataset.url=url;p.src=url;p.hidden=false;}
async function single(root,key){
 const file=el(root,'file').files[0];
 const quality=Number(el(root,'quality').value)/100;
 const type=el(root,'format').value;
 try{
  fileLimit(file,MAX);msg(root,'이미지 처리 중…');
  const original=await draw(file,key==='image-compress'?Number(el(root,'max-width').value)||0:0);
  const blob=await encode(original.canvas,type,quality);
  preview(root,blob);
  const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[type];
  const a=el(root,'download');if(a.dataset.url)URL.revokeObjectURL(a.dataset.url);
  a.dataset.url=URL.createObjectURL(blob);a.href=a.dataset.url;a.download=safeName(file,'-converted'+ext);a.hidden=false;
  el(root,'stats').hidden=false;
  el(root,'stats').textContent='원본 '+asBytes(file.size)+' · 결과 '+asBytes(blob.size)+' · '+original.w+' × '+original.h+'px'+(blob.size<file.size?' · 약 '+Math.round((1-blob.size/file.size)*100)+'% 감소':' · 원본보다 용량이 늘었습니다');
  msg(root,'완료됐습니다. 이미지와 결과 용량을 확인한 후 저장하세요.');
 }catch(e){msg(root,e.message,true);}
}
async function resize(root){
 const fileList=[...el(root,'files').files];const width=Number(el(root,'width').value);
 if(!Number.isInteger(width)||width<32||width>5000){msg(root,'가로폭을 32~5000px 사이로 입력하세요.',true);return;}
 if(fileList.length>20){msg(root,'한 번에 최대 20장까지 처리할 수 있습니다.',true);return;}
 const list=el(root,'results');list.replaceChildren();
 if(!fileList.length){msg(root,'이미지를 선택해 주세요.',true);return;}
 let done=0;for(const file of fileList){
  const li=document.createElement('li');li.textContent=file.name+' · 처리 중';list.appendChild(li);
  try{const res=await draw(file,width);const blob=await encode(res.canvas,'image/jpeg',.86);const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=safeName(file,'-'+res.w+'px.jpg');link.textContent='저장 ('+res.w+' × '+res.h+'px · '+asBytes(blob.size)+')';li.textContent=file.name+' — ';li.appendChild(link);done++;}
  catch(e){li.textContent=file.name+' — '+e.message;}
 }
 msg(root,done+'개 이미지 처리가 완료됐습니다. 각 저장 링크를 눌러 내려받으세요.');
}
async function removeExif(root){
 const file=el(root,'file').files[0];
 try{
  const res=await draw(file,0);const type=file.type;
  const blob=await encode(res.canvas,type,type==='image/jpeg'?.95:.93);
  const ext=type==='image/jpeg'?'.jpg':type==='image/png'?'.png':'.webp';
  preview(root,blob);
  const anchor=el(root,'download');if(anchor.dataset.url)URL.revokeObjectURL(anchor.dataset.url);
  anchor.dataset.url=URL.createObjectURL(blob);anchor.href=anchor.dataset.url;anchor.download=safeName(file,'-clean'+ext);anchor.hidden=false;
  msg(root,'메타데이터 없이 새 이미지로 저장할 준비가 됐습니다. 화질과 파일 크기는 달라질 수 있습니다. ('+asBytes(blob.size)+')');
 }catch(e){msg(root,e.message,true);}
}
export function mount(root,key){
 if(key==='exif-remove'){
 fields(root,'<label class="it-field">사진 선택 (JPG·PNG·WebP, 최대 30MB)<input id="file" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="it-hint">이미지를 새로 인코딩해 일반적인 EXIF 및 GPS 정보를 제외합니다. 원본 대비 파일 크기·색상·화질이 달라질 수 있습니다.</p><div class="it-actions"><button id="run" type="button">정보 제거한 사진 만들기</button><a id="download" class="it-download" hidden>사진 저장</a></div><img id="preview" class="it-preview" alt="메타데이터 제거한 이미지" hidden>');
 el(root,'run').onclick=()=>removeExif(root);return;
 }

 if(key==='image-resize'){
  fields(root,'<div class="it-fields"><label class="it-field">이미지 여러 장 (최대 20장 · 각 30MB)<input id="files" type="file" multiple accept="image/png,image/jpeg,image/webp"></label><label class="it-field">목표 가로 폭(px)<input id="width" type="number" value="1200" min="32" max="5000"></label></div><p class="it-hint">원본보다 큰 이미지는 확대하지 않습니다. 결과는 JPEG로 저장하며 투명 배경은 흰색으로 바뀝니다.</p><div class="it-actions"><button type="button" id="run">일괄 크기 변경</button></div><ol id="results" class="it-list"></ol>');
  el(root,'run').addEventListener('click',()=>resize(root));return;
 }
 const label=key==='image-compress'?'이미지 압축하기':'이미지 형식 변환하기';
 fields(root,'<div class="it-fields"><label class="it-field">이미지 선택 (30MB 이하)<input id="file" type="file" accept="image/png,image/jpeg,image/webp"></label><label class="it-field">결과 형식<select id="format"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label><label class="it-field">화질 (JPG·WebP)<input type="range" id="quality" min="30" max="100" value="82"></label>'+(key==='image-compress'?'<label class="it-field">최대 가로폭 (원본 이하면 유지)<input id="max-width" type="number" min="320" max="5000" value="1920"></label>':'')+'</div><p class="it-hint">PNG는 화질 슬라이더가 적용되지 않습니다. JPEG로 변환하면 투명한 배경은 흰색이 됩니다.</p><div class="it-actions"><button id="run" type="button">'+label+'</button><a id="download" class="it-download" hidden>변환 이미지 저장</a></div><p id="stats" class="it-result" hidden></p><img id="preview" class="it-preview" alt="변환 결과 미리보기" hidden>');
 el(root,'run').addEventListener('click',()=>single(root,key));
}
