// Responsive in-memory editing for the existing five A4 documents.
// Original fields remain the single calculation/print source. No network or storage.
function setupResponsiveEditor(){
 const root=document.getElementById('print-root');
 if(!root?.firstElementChild)return;
 const sourceFields=[...root.querySelectorAll('[data-field]')];
 const mode=document.body.dataset.form;
 const editor=document.createElement('section');editor.id='responsive-editor';editor.className='responsive-editor';editor.tabIndex=-1;
 editor.setAttribute('aria-label','화면 폭에 맞춘 서식 입력');
 const heading=document.createElement('h2');heading.textContent='내용 입력';editor.append(heading);
 const help=document.createElement('p');help.className='editor-intro';help.textContent='화면 크기에 맞춰 항목별로 입력하세요. 출력할 때는 기존 A4 양식으로 정리됩니다.';editor.append(help);
 const summary=document.createElement('section');summary.className='editor-totals';summary.setAttribute('aria-label','계산 결과');
 const totals=mode==='employment-contract'?[]:mode==='receipt'?[['grand','영수금액']]:[['supply',mode==='quotation'?'품목 합계':'공급가액'],['tax','부가세'],['grand',mode==='quotation'?'합계금액':'청구합계'],['balance','잔금']];
 const outputs=[];
 const bindOutput=(key,label,host)=>{const box=document.createElement('div'),caption=document.createElement('span'),out=document.createElement('output');caption.textContent=label;out.dataset.editorTotal=key;out.setAttribute('aria-label',label);out.setAttribute('aria-live','off');box.append(caption,out);host.append(box);outputs.push({key,out});};
 totals.forEach(([key,label])=>{if(root.querySelector('[data-calc="'+key+'"]'))bindOutput(key,label,summary);});
 if(totals.length)editor.append(summary);
 const grids=document.createElement('div');grids.className='editor-groups';editor.append(grids);
 const groups=new Map(),bindings=new Map(),composing=new Set();
 function groupFor(source){
  const key=source.dataset.field;
  const item=key.match(/^item-(\d+)-/);if(item)return '품목 '+(Number(item[1])+1);
  if(mode==='employment-contract'){
   if(source.closest('.contract-section'))return source.closest('.contract-section').querySelector('h3').textContent;
   if(source.closest('.signatures'))return '서명란 정보';
   return key==='writtenDate'?'계약 작성일':'계약 당사자';
  }
  if(key.startsWith('supplier'))return '공급자 정보';
  if(key.startsWith('buyer'))return mode==='quotation'?'수신처':'공급받는자 정보';
  if(['paid','previous','vatMode'].includes(key))return '세금 및 입금';
  if(['memo','remarks'].includes(key))return '비고 및 메모';
  if(['department','contact','email','phone','mobile','fax'].includes(key))return '담당자 연락처';
  return '기본 정보';
 }
 function getGroup(name){
  if(groups.has(name))return groups.get(name);
  const box=document.createElement('fieldset');box.className='editor-card';const legend=document.createElement('legend');legend.textContent=name;box.append(legend);
  const fields=document.createElement('div');fields.className='editor-fields';box.append(fields);grids.append(box);const group={box,fields};groups.set(name,group);return group;
 }
 function grow(control){if(control.tagName!=='TEXTAREA')return;control.style.height='auto';control.style.height=Math.max(46,control.scrollHeight+2)+'px';}
 for(const [index,source] of sourceFields.entries()){
  const key=source.dataset.field,group=getGroup(groupFor(source));
  const label=document.createElement('label');label.className='editor-field';label.htmlFor='editor-field-'+index;
  const title=document.createElement('span');title.className='editor-label';
  title.textContent=(source.getAttribute('aria-label')||key).replace(/^\d+번\s*/,'').replace(/\s*\d+행$/,'');
  let control;
  if(source.tagName==='BUTTON'){
   title.textContent='부가세 처리';control=document.createElement('select');
   for(const [v,t]of[['none','부가세를 더하지 않음'],['tax','부가세 10% 자동입력']]){const option=document.createElement('option');option.value=v;option.textContent=t;control.append(option);}
  }else if(source.tagName==='SELECT'){
   control=document.createElement('select');for(const option of source.options)control.append(option.cloneNode(true));
  }else if(source.type==='checkbox'){
   control=document.createElement('input');control.type='checkbox';label.classList.add('editor-checkbox');
  }else{
   // Textareas wrap long company names, addresses and numbers instead of panning sideways.
   control=document.createElement('textarea');control.rows=1;control.wrap='soft';
   if(source.maxLength>0)control.maxLength=source.maxLength;
   if(source.inputMode)control.inputMode=source.inputMode;
   control.spellcheck=false;
  }
  control.id=label.htmlFor;control.dataset.editorField=key;control.autocomplete='off';control.setAttribute('aria-label',title.textContent);
  control.setAttribute('aria-describedby','feedback');label.append(title,control);group.fields.append(label);bindings.set(key,{source,control});
  const transfer=event=>{
   if(source.tagName==='BUTTON'){
    if(source.value!==control.value)source.click();
   }else{
    if(source.type==='checkbox')source.checked=control.checked;else source.value=source.tagName==='INPUT'?control.value.replace(/\r?\n/g,' '):control.value;
    source.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:event.inputType||'insertText',data:event.data??null,isComposing:composing.has(control)}));
    if(event.type==='change')source.dispatchEvent(new Event('change',{bubbles:true}));
   }
   refresh();grow(control);
  };
  if(source.tagName==='INPUT'&&source.type!=='checkbox')control.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing)event.preventDefault();});
  control.addEventListener('input',transfer);control.addEventListener('change',transfer);
  control.addEventListener('compositionstart',()=>composing.add(control));
  control.addEventListener('compositionend',event=>{composing.delete(control);transfer(event);});
 }
 for(const [name,group]of groups){
  const row=name.match(/^품목 (\d+)$/);if(!row)continue;
  const index=Number(row[1])-1;const total=document.createElement('div');total.className='editor-row-total';
  bindOutput('item-'+index+'-amount','품목 금액',total);
  if(root.querySelector('[data-calc="item-'+index+'-tax"]'))bindOutput('item-'+index+'-tax','세액',total);
  group.box.append(total);
 }
 const contractMirrors=[];
 if(mode==='employment-contract'){
  const details=document.createElement('details');details.className='editor-contract-review';const title=document.createElement('summary');title.textContent='입력한 내용과 계약 조항 전체 확인';details.append(title);
  const copy=root.querySelector('.contract').cloneNode(true);
  copy.querySelectorAll('.print-value').forEach(el=>el.remove());
  copy.querySelectorAll('[data-field]').forEach(source=>{const out=document.createElement('span');out.className='editor-contract-value';contractMirrors.push({key:source.dataset.field,out});source.replaceWith(out);});
  [copy,...copy.querySelectorAll('*')].forEach(el=>{el.removeAttribute('id');el.removeAttribute('style');if(!el.classList.contains('editor-contract-value'))el.removeAttribute('class');});
  copy.className='editor-contract-text';details.append(copy);editor.append(details);
 }
 const print=document.createElement('button');print.type='button';print.className='editor-print';print.textContent='A4 출력하기 / PDF 저장';print.addEventListener('click',()=>document.getElementById('print-form').click());editor.append(print);
 root.before(editor);
 function refresh(resizeAll=false){
  for(const {source,control}of bindings.values()){
   const changed=control.value!==source.value;
   if(source.type==='checkbox')control.checked=source.checked;
   else if(control.value!==source.value&&!composing.has(control)){
    const old=control.value,cursor=control.selectionStart??old.length;
    control.value=source.value;
    if(document.activeElement===control&&control.tagName==='TEXTAREA'){
     const digits=old.slice(0,cursor).replace(/\D/g,'').length;
     let at=Math.min(cursor,control.value.length);
     if(source.inputMode==='numeric'){let seen=0;at=0;while(at<control.value.length&&seen<digits){if(/\d/.test(control.value[at]))seen++;at++;}}
     control.setSelectionRange(at,at);
    }
   }
   control.setAttribute('aria-invalid',source.getAttribute('aria-invalid')||'false');if(changed||resizeAll===true||!control.style.height)grow(control);
  }
  for(const {key,out}of outputs){const value=root.querySelector('[data-calc="'+key+'"]')?.textContent||'';out.textContent=value?value+' 원':'미입력';}
  for(const {key,out}of contractMirrors){const source=bindings.get(key)?.source;out.textContent=source?.type==='checkbox'?(source.checked?'☑':'□'):(source?.tagName==='SELECT'?(source.value?source.selectedOptions[0].textContent:'________'):(source?.value||'________'));}
 }
 root.addEventListener('input',refresh);root.addEventListener('change',refresh);root.addEventListener('click',refresh);
 const observer=new MutationObserver(refresh);observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-invalid']});
 document.getElementById('clear-form').addEventListener('click',refresh);
 document.getElementById('print-form').addEventListener('click',()=>{
  refresh();if(!matchMedia('(max-width:1199px)').matches||!document.body.classList.contains('form-invalid'))return;
  const invalid=[...bindings.values()].find(({source})=>source.getAttribute('aria-invalid')==='true');
  if(invalid){invalid.control.focus();invalid.control.scrollIntoView({block:'center'});}
 });
 const mq=matchMedia('(max-width:1199px)');
 const resize=()=>{document.querySelector('.form-skip')?.setAttribute('href',mq.matches?'#responsive-editor':'#print-root');refresh(true);};
 mq.addEventListener('change',resize);window.addEventListener('resize',resize);
 document.body.classList.add('responsive-form-ready');resize();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupResponsiveEditor,{once:true});else setupResponsiveEditor();
