import {el,fields,msg} from './helpers.js';
export function mount(root,key){
 fields(root,'<label class="it-field">QR에 저장할 링크 또는 텍스트<textarea id="qr-text" rows="3" maxlength="1000" placeholder="https://example.com">https://interpiad.com/</textarea></label><p class="it-hint">링크 주소를 그대로 담는 정적 QR입니다. 인쇄 전에 휴대폰 카메라로 스캔하여 검증하세요. 개인정보나 인증정보는 입력하지 마세요.</p><div class="it-actions"><button type="button" id="make">QR 코드 만들기</button><button type="button" id="png" class="it-secondary" disabled>PNG 저장</button></div><div id="qr-code" style="margin:16px 0;width:256px;min-height:256px;background:#fff;max-width:100%" aria-label="생성된 QR 이미지"></div>');
 const maker=()=>{try{
  if(typeof QRCode==='undefined')throw Error('QR 코드를 만드는 라이브러리를 불러오지 못했습니다.');
  const str=el(root,'qr-text').value.trim();if(!str)throw Error('링크나 텍스트를 입력해 주세요.');
  if(new TextEncoder().encode(str).length>900)throw Error('QR 내용이 너무 깁니다. 간단한 URL로 줄여 주세요.');
  const box=el(root,'qr-code');box.replaceChildren();new QRCode(box,{text:str,width:256,height:256,colorDark:'#153d36',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  el(root,'png').disabled=false;msg(root,'QR 코드를 만들었습니다. 저장한 파일을 스캔해 확인하세요.');
 }catch(e){msg(root,e.message,true);}};
 el(root,'make').onclick=maker;el(root,'png').onclick=()=>{const canvas=el(root,'qr-code').querySelector('canvas');if(!canvas){msg(root,'먼저 QR을 생성해 주세요.',true);return;}const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='interpiad-static-qr.png';a.click();};
 maker();
}
