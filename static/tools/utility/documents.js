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
function parseCSV(text,delimiter){
 const rows=[];let row=[],cell='',quotes=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quotes){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quotes=false;else cell+=c;}else{if(c==='"'&&cell==='')quotes=true;else if(c===delimiter){row.push(cell);cell='';}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}else if(c==='\r'){if(text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}}
 if(quotes)throw Error('CSV 따옴표가 올바르게 닫히지 않았습니다.');
 if(row.length||cell!==''){row.push(cell);rows.push(row);}
 return rows;
}
function xmlValues(document,name){return [...document.getElementsByTagName(name)];}
async function parseXLSX(file){
 if(typeof JSZip==='undefined')throw Error('XLSX 읽기 라이브러리를 불러오지 못했습니다.');
 const zip=await JSZip.loadAsync(file);
 const ss=zip.file('xl/sharedStrings.xml');let strings=[];
 if(ss){const txt=await ss.async('string');if(txt.length>15000000)throw Error('XLSX 공유 문자열이 너무 큽니다.');const doc=new DOMParser().parseFromString(txt,'application/xml');strings=xmlValues(doc,'si').map(n=>xmlValues(n,'t').map(t=>t.textContent).join(''));}
 const path=Object.keys(zip.files).find(n=>/^xl\/worksheets\/sheet[0-9]+\.xml$/.test(n));
 if(!path)throw Error('XLSX 첫 번째 워크시트를 읽지 못했습니다.');
 const xml=await zip.file(path).async('string');if(xml.length>25000000)throw Error('워크시트가 너무 큽니다.');
 const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('XLSX 시트 XML을 읽을 수 없습니다.');
 const rows=[];for(const row of xmlValues(doc,'row')){
  const values=[];for(const c of xmlValues(row,'c')){const name=c.getAttribute('r')||'',letters=name.match(/^[A-Z]+/);if(!letters)continue;let ix=0;for(const char of letters[0])ix=ix*26+char.charCodeAt(0)-64;ix--;if(ix>2000)throw Error('열 수가 너무 많습니다.');let value='';const v=xmlValues(c,'v')[0];if(c.getAttribute('t')==='s')value=strings[Number(v?.textContent)]||'';else if(c.getAttribute('t')==='inlineStr')value=xmlValues(c,'t').map(n=>n.textContent).join('');else value=v?.textContent||'';values[ix]=value;}
  if(values.length)rows.push(Array.from({length:values.length},(_,i)=>values[i]||''));
  if(rows.length>50000)throw Error('한 번에 최대 5만 행까지 처리합니다.');
 }
 return rows;
}
function encodeCSV(rows){
 const clean=v=>{const s=String(v??'');if(/^-?\d+(?:\.\d+)?$/.test(s.trim()))return s;return /^[\s]*[=+\-@]/.test(s)?"'"+s:s;};
 return '\uFEFF'+rows.map(row=>row.map(v=>{const s=clean(v);return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\r\n');
}
async function duplicates(root){
 try{
  const f=el(root,'table-file').files[0];fileLimit(f,15*1024*1024);
  const xlsx=/\.xlsx$/i.test(f.name),csv=/\.csv$/i.test(f.name);
  if(!xlsx&&!csv)throw Error('CSV 또는 XLSX 파일을 선택해 주세요.');
  msg(root,'파일을 분석 중입니다…');
  let rows;
  if(xlsx)rows=await parseXLSX(f);else{
   const text=(await f.text()).replace(/^\uFEFF/,'');
   const header=(text.split(/\r\n|\n|\r/,1)[0]||'');
   const delimiter=header.includes('\t')?'\t':header.split(';').length>header.split(',').length?';':',';
   rows=parseCSV(text,delimiter);
  }
  if(rows.length>50000)throw Error('한 번에 최대 5만 행까지 처리합니다.');
  if(!rows.length)throw Error('파일에 데이터가 없습니다.');
  const seen=new Set(),unique=[],first=el(root,'has-header').checked;
  if(first)unique.push(rows.shift());
  for(const r of rows){const key=JSON.stringify(r.map(v=>String(v).trim()));if(!seen.has(key)){seen.add(key);unique.push(r);}}
  const removed=rows.length-(unique.length-(first?1:0));
  save(new Blob([encodeCSV(unique)],{type:'text/csv;charset=utf-8'}),'interpiad-deduplicated.csv');
  msg(root,removed+'개 중복행 제거 · '+unique.length+'개 행을 CSV로 저장했습니다. XLSX 입력 시 셀 서식과 다른 시트는 저장되지 않습니다.');
 }catch(e){msg(root,e.message,true);}
}
function duplicatesPage(root){
 fields(root,'<label class="it-field">CSV 또는 XLSX 선택 (15MB 이하)<input id="table-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label><label class="it-field"><input id="has-header" type="checkbox" checked> 첫 줄을 머리글로 보존</label><p class="it-hint">첫 번째 시트를 읽어 모든 칸이 완전히 같은 행을 제거합니다. XLSX도 결과는 UTF-8 CSV로 저장되며 서식·수식은 보존되지 않습니다. CSV 수식 주입 방지를 위해 = + - @로 시작하는 값은 텍스트로 보호합니다.</p><div class="it-actions"><button id="run" type="button">중복 제거 CSV 저장</button></div>');el(root,'run').onclick=()=>duplicates(root);
}
export function mount(root,key){if(key==='pdf-merge-split')mergePage(root);else if(key==='image-to-pdf')imagePage(root);else if(key==='duplicates')duplicatesPage(root);else throw Error('지원하지 않는 문서 도구입니다.');}
