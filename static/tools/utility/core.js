const root=document.getElementById('utility-tool');
const groups={
'image-compress':'media','image-resize':'media','image-convert':'media','exif-remove':'media',
'calculator':'calculators','vat':'calculators','margin':'calculators','unit-convert':'calculators',
'discount':'calculators','dday':'calculators','fx':'calculators','loan':'calculators',
'roas':'calculators','seo-preview':'calculators','utm':'calculators','text-count':'calculators','color':'calculators',
'qr':'qr','timer':'timers','stopwatch':'timers','pomodoro':'timers',
'pdf-merge-split':'documents','image-to-pdf':'documents','duplicates':'documents'};
if(root){
 const key=root.dataset.tool;
 if(!Object.prototype.hasOwnProperty.call(groups,key)){root.textContent='지원하지 않는 도구입니다.';}
 else import('./'+groups[key]+'.js').then(m=>m.mount(root,key)).catch(e=>{
 console.error('Interpiad tool error',e);
 root.textContent='도구 실행에 필요한 파일을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
 });
}
