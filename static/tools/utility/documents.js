import {el,fields,msg,fileLimit,asBytes,safeName,save} from './helpers.js';
const MAX_PDF=40*1024*1024;
function pdf(){if(!window.PDFLib)throw Error('PDF 편집 라이브러리를 불러오지 못했습니다.');return PDFLib.PDFDocument;}
function parsePages(s,max){
 const seen=new Set(),result=[];
 for(const token of s.split(',')){
  const m=token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw Error('페이지 범위를 1-3,5처럼 입력해 주세요.');
  const a=Number(m[1]),b=m[2]?Number(m[2]):a;
  if(a<1||b<a||b>max||b-a>300)throw Error('1부터 '+max+' 사이의 올바른 페이지를 지정하세요.');
  for(let i=a;i<=b;i++)if(!seen.has(i)){seen.add(i);result.push(i-1);}
 }
 if(!result.length)throw Error('페이지를 선택해 주세요.');return result;
}
async function merge(root){
 const fs=[...el(root,'pdf-files').files],mode=el(root,'pdf-mode').value;
 try{
  if(!fs.length)throw Error('PDF 파일을 선택해 주세요.');
  if(fs.length>10)throw Error('한 번에 최대 PDF 10개를 처리합니다.');
  if(mode==='split'&&fs.length!==1)throw Error('페이지 추출은 PDF 하나만 선택해 주세요.');
  const output=await pdf().create();let pages=0;
  for(const f of fs){
   fileLimit(f,MAX_PDF);
   if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf')throw Error('PDF 파일만 사용할 수 있습니다.');
   const source=await pdf().load(await f.arrayBuffer());
   const indices=mode==='split'?parsePages(el(root,'pdf-range').value,source.getPageCount()):source.getPageIndices();
   pages+=indices.length;if(pages>300)throw Error('합친 문서가 300페이지를 초과합니다.');
   const copies=await output.copyPages(source,indices);
   copies.forEach(x=>output.addPage(x));
  }
  const bytes=await output.save({useObjectStreams:true});
  save(new Blob([bytes],{type:'application/pdf'}),mode==='split'?'interpiad-pages.pdf':'interpiad-merged.pdf');
  msg(root,pages+'페이지 PDF를 저장했습니다. 파일을 열어 구성과 서명을 확인하세요. ('+asBytes(bytes.length)+')');
 }catch(e){msg(root,e.message,true);}
}
function mergePage(root){
 fields(root,'<div class="it-fields"><label class="it-field">작업 종류<select id="pdf-mode"><option value="merge">여러 PDF 합치기</option><option value="split">PDF 페이지 추출</option></select></label><label class="it-field">PDF 선택 (파일당 40MB, 최대 10개)<input id="pdf-files" type="file" accept=".pdf,application/pdf" multiple></label><label class="it-field">추출 페이지 (페이지 추출 시)<input id="pdf-range" type="text" value="1-3" placeholder="1-3,5,7"></label></div><p class="it-hint">병합은 선택한 파일 순서대로 처리합니다. 추출은 PDF 1개를 선택하세요. 총 300페이지 이하를 권장합니다.</p><div class="it-actions"><button id="run" type="button">PDF 만들고 다운로드</button></div>');
 el(root,'run').onclick=()=>merge(root);
}
async function jpegFromFile(f){
 fileLimit(f,20*1024*1024);
 if(!/^image\/(jpeg|png|webp)$/.test(f.type))throw Error('JPG·PNG·WebP 이미지만 처리할 수 있습니다.');
 if(f.type==='image/jpeg'||f.type==='image/png')return {bytes:await f.arrayBuffer(),type:f.type};
 const url=URL.createObjectURL(f);
 try{const im=await new Promise((res,rej)=>{const image=new Image();image.onload=()=>res(image);image.onerror=()=>rej(Error('이미지를 열 수 없습니다.'));image.src=url;});
  const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
  if(canvas.width*canvas.height>17000000)throw Error('이미지 해상도가 너무 큽니다.');
  const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(im,0,0);
  const b=await new Promise(res=>canvas.toBlob(res,'image/jpeg',.9));if(!b)throw Error('WebP를 PDF용 이미지로 바꾸지 못했습니다.');
  return {bytes:await b.arrayBuffer(),type:'image/jpeg'};
 }finally{URL.revokeObjectURL(url);}
}
async function imagePDF(root){
 try{
  const fs=[...el(root,'images').files];if(!fs.length||fs.length>15)throw Error('이미지 1~15장을 선택해 주세요.');
  const doc=await pdf().create();
  for(const f of fs){
   const data=await jpegFromFile(f);
   const image=data.type==='image/png'?await doc.embedPng(data.bytes):await doc.embedJpg(data.bytes);
   const size=doc.addPage([595.28,841.89]);const maxW=535.28,maxH=781.89,scale=Math.min(maxW/image.width,maxH/image.height);
   const w=image.width*scale,h=image.height*scale;
   size.drawImage(image,{x:(595.28-w)/2,y:(841.89-h)/2,width:w,height:h});
  }
  const out=await doc.save();save(new Blob([out],{type:'application/pdf'}),'interpiad-images.pdf');
  msg(root,fs.length+'페이지 PDF를 저장했습니다. ('+asBytes(out.length)+')');
 }catch(e){msg(root,e.message,true);}
}
function imagePage(root){
 fields(root,'<label class="it-field">JPG·PNG·WebP 사진 선택 (최대 15장)<input id="images" type="file" multiple accept="image/jpeg,image/png,image/webp"></label><p class="it-hint">파일 선택 순서대로 A4 세로 페이지에 원본 비율을 유지해 배치합니다. 사진 속 글자는 이미지 그대로 포함됩니다.</p><div class="it-actions"><button id="run" type="button">PDF 만들고 다운로드</button></div>');
 el(root,'run').onclick=()=>imagePDF(root);
}
export function mount(root,key){if(key==='pdf-merge-split')mergePage(root);else if(key==='image-to-pdf')imagePage(root);else throw Error('지원하지 않는 문서 도구입니다.');}
