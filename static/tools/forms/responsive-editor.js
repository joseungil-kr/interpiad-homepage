// Fit the original A4 sheet to the layout viewport. Keep its actual controls,
// calculations and print source; never replace the document with field cards.
function fitOriginalForm(){
 const root=document.getElementById('print-root');
 const paper=root?.querySelector('.print-sheet,.paper-form');
 if(!paper)return;
 let pending=false;
 function fit(){
  pending=false;
  const style=getComputedStyle(root);
  const available=root.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const width=paper.offsetWidth;
  if(available>0&&width>0){
   const scale=Math.min(1,Math.floor(available/width*100000)/100000);
   root.style.setProperty('--paper-fit-scale',String(scale));
   root.dataset.paperFitScale=String(scale);
  }
 }
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(fit);}};
 // Observe the layout width, not visualViewport: manual pinch zoom must remain
 // under the user's control and must not be cancelled by automatic refitting.
 new ResizeObserver(schedule).observe(root);
 window.addEventListener('resize',schedule);
 document.fonts?.ready.then(schedule);
 fit();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fitOriginalForm,{once:true});else fitOriginalForm();
