import {el,fields,msg,fileLimit,asBytes,safeName,save} from './helpers.js';
const MAX=30*1024*1024;
const ownedURLs=new Set();
const versions=new WeakMap();
function ownedURL(blob){const url=URL.createObjectURL(blob);ownedURLs.add(url);return url;}
function releaseURL(url){if(url){URL.revokeObjectURL(url);ownedURLs.delete(url);}}
function clearSingle(root){
 const p=el(root,'preview'),a=el(root,'download'),stats=el(root,'stats');
 if(p){releaseURL(p.dataset.url);delete p.dataset.url;p.removeAttribute('src');p.hidden=true;}
 if(a){releaseURL(a.dataset.url);delete a.dataset.url;a.removeAttribute('href');a.removeAttribute('download');a.hidden=true;}
 if(stats){stats.textContent='';stats.hidden=true;}
}
function clearBatch(root){
 const list=el(root,'results');if(!list)return;
 for(const a of list.querySelectorAll('a[href^="blob:"]')){releaseURL(a.getAttribute('href'));a.removeAttribute('href');}
 list.replaceChildren();
}
function invalidate(root,mode='single'){
 const next=(versions.get(root)||0)+1;versions.set(root,next);
 if(mode==='batch')clearBatch(root);else clearSingle(root);
 return next;
}
function current(root,version){return versions.get(root)===version;}
window.addEventListener('pagehide',()=>{
 for(const url of ownedURLs)URL.revokeObjectURL(url);
 ownedURLs.clear();
},{once:true});
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
function preview(root,blob){const p=el(root,'preview'),url=ownedURL(blob);p.dataset.url=url;p.src=url;p.hidden=false;}
async function single(root,key){
 const version=invalidate(root);
 const file=el(root,'file').files[0];
 const quality=Number(el(root,'quality').value)/100;
 const type=el(root,'format').value;
 try{
  fileLimit(file,MAX);
  let width=0;
  if(key==='image-compress'){
   const raw=el(root,'max-width').value.trim();
   width=Number(raw);
   if(!raw||!Number.isInteger(width)||width<320||width>5000)throw Error('최대 가로폭은 320~5000px로 입력해 주세요.');
  }
  msg(root,'이미지 처리 중…');
  const original=await draw(file,width);
  if(!current(root,version))return;
  const blob=await encode(original.canvas,type,quality);
  if(!current(root,version))return;
  preview(root,blob);
  const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[type];
  const a=el(root,'download');a.dataset.url=ownedURL(blob);
  a.href=a.dataset.url;a.download=safeName(file,'-converted'+ext);a.hidden=false;
  const stats=el(root,'stats');stats.hidden=false;
  stats.textContent='원본 '+asBytes(file.size)+' · 결과 '+asBytes(blob.size)+' · '+original.w+' × '+original.h+'px'+(blob.size<file.size?' · 약 '+Math.round((1-blob.size/file.size)*100)+'% 감소':' · 원본보다 용량이 늘었습니다');
  msg(root,'완료됐습니다. 이미지와 결과 용량을 확인한 후 저장하세요.');
 }catch(e){if(current(root,version))msg(root,e.message,true);}
}
async function resize(root){
 const version=invalidate(root,'batch');
 const fileList=[...el(root,'files').files],raw=el(root,'width').value.trim(),width=Number(raw);
 if(!raw||!Number.isInteger(width)||width<32||width>5000){msg(root,'가로폭을 32~5000px 사이로 입력하세요.',true);return;}
 if(fileList.length>20){msg(root,'한 번에 최대 20장까지 처리할 수 있습니다.',true);return;}
 if(!fileList.length){msg(root,'이미지를 선택해 주세요.',true);return;}
 const list=el(root,'results');let done=0;
 for(const file of fileList){
  if(!current(root,version))return;
  const li=document.createElement('li');li.textContent=file.name+' · 처리 중';list.appendChild(li);
  try{
   const res=await draw(file,width);
   if(!current(root,version))return;
   const blob=await encode(res.canvas,'image/jpeg',.86);
   if(!current(root,version))return;
   const link=document.createElement('a');link.href=ownedURL(blob);
   link.download=safeName(file,'-'+res.w+'px.jpg');
   link.textContent='저장 ('+res.w+' × '+res.h+'px · '+asBytes(blob.size)+')';
   li.textContent=file.name+' — ';li.appendChild(link);done++;
  }catch(e){if(!current(root,version))return;li.textContent=file.name+' — '+e.message;}
 }
 if(current(root,version))msg(root,done+'개 이미지 처리가 완료됐습니다. 각 저장 링크를 눌러 내려받으세요.');
}
async function removeExif(root){
 const version=invalidate(root),file=el(root,'file').files[0];
 try{
  const res=await draw(file,0);
  if(!current(root,version))return;
  const type=file.type,blob=await encode(res.canvas,type,type==='image/jpeg'?.95:.93);
  if(!current(root,version))return;
  const ext=type==='image/jpeg'?'.jpg':type==='image/png'?'.png':'.webp';
  preview(root,blob);
  const a=el(root,'download');a.dataset.url=ownedURL(blob);
  a.href=a.dataset.url;a.download=safeName(file,'-clean'+ext);a.hidden=false;
  msg(root,'메타데이터 없이 새 이미지로 저장할 준비가 됐습니다. 화질과 파일 크기는 달라질 수 있습니다. ('+asBytes(blob.size)+')');
 }catch(e){if(current(root,version))msg(root,e.message,true);}
}
export function mount(root,key){
 if(key==='exif-remove'){
 fields(root,'<label class="it-field">사진 선택 (JPG·PNG·WebP, 최대 30MB)<input id="file" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="it-hint">이미지를 새로 인코딩해 일반적인 EXIF 및 GPS 정보를 제외합니다. 원본 대비 파일 크기·색상·화질이 달라질 수 있습니다.</p><div class="it-actions"><button id="run" type="button">정보 제거한 사진 만들기</button><a id="download" class="it-download" hidden>사진 저장</a></div><img id="preview" class="it-preview" alt="메타데이터 제거한 이미지" hidden>');
 el(root,'run').onclick=()=>removeExif(root);
 el(root,'file').addEventListener('change',()=>{invalidate(root);msg(root,'새 사진을 선택했습니다. 다시 실행해 주세요.');});return;
 }

 if(key==='image-resize'){
  fields(root,'<div class="it-fields"><label class="it-field">이미지 여러 장 (최대 20장 · 각 30MB)<input id="files" type="file" multiple accept="image/png,image/jpeg,image/webp"></label><label class="it-field">목표 가로 폭(px)<input id="width" type="number" value="1200" min="32" max="5000"></label></div><p class="it-hint">원본보다 큰 이미지는 확대하지 않습니다. 결과는 JPEG로 저장하며 투명 배경은 흰색으로 바뀝니다.</p><div class="it-actions"><button type="button" id="run">일괄 크기 변경</button></div><ol id="results" class="it-list"></ol>');
  el(root,'run').addEventListener('click',()=>resize(root));
 for(const id of ['files','width'])el(root,id).addEventListener(id==='files'?'change':'input',()=>{invalidate(root,'batch');msg(root,'입력값이 변경되었습니다. 다시 실행해 주세요.');});return;
 }
 const label=key==='image-compress'?'이미지 압축하기':'이미지 형식 변환하기';
 fields(root,'<div class="it-fields"><label class="it-field">이미지 선택 (30MB 이하)<input id="file" type="file" accept="image/png,image/jpeg,image/webp"></label><label class="it-field">결과 형식<select id="format"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label><label class="it-field">화질 (JPG·WebP)<input type="range" id="quality" min="30" max="100" value="82"></label>'+(key==='image-compress'?'<label class="it-field">최대 가로폭 (원본 이하면 유지)<input id="max-width" type="number" min="320" max="5000" value="1920"></label>':'')+'</div><p class="it-hint">PNG는 화질 슬라이더가 적용되지 않습니다. JPEG로 변환하면 투명한 배경은 흰색이 됩니다.</p><div class="it-actions"><button id="run" type="button">'+label+'</button><a id="download" class="it-download" hidden>변환 이미지 저장</a></div><p id="stats" class="it-result" hidden></p><img id="preview" class="it-preview" alt="변환 결과 미리보기" hidden>');
 el(root,'run').addEventListener('click',()=>single(root,key));
 for(const id of ['file','format','quality','max-width']){
  const control=el(root,id);if(control)control.addEventListener(id==='file'?'change':'input',()=>{invalidate(root);msg(root,'입력값이 변경되었습니다. 다시 실행해 주세요.');});
 }
}
