import {el,fields,msg,two} from './helpers.js';
export function mount(root,key){
 if(key!=='timer')throw Error('지원하지 않는 타이머입니다.');
 fields(root,'<div class="it-fields"><label class="it-field">분 (0~999)<input id="minutes" type="number" min="0" max="999" value="5"></label><label class="it-field">초 (0~59)<input id="seconds" type="number" min="0" max="59" value="0"></label></div><div id="clock" class="it-timer-display" role="timer" aria-label="남은 시간">05:00</div><div class="it-actions"><button id="start" type="button">시작</button><button id="pause" class="it-secondary" type="button">일시정지</button><button id="reset" class="it-secondary" type="button">초기화</button></div><p class="it-hint">브라우저가 백그라운드일 때 알림이 늦어질 수 있습니다.</p>');
 let remain=300000,deadline=0,running=false,interval=null;
 function view(){const sec=Math.ceil(Math.max(0,remain)/1000);el(root,'clock').textContent=two(Math.floor(sec/60))+':'+two(sec%60);}
 function stop(){if(interval){clearInterval(interval);interval=null;}running=false;}
 function tick(){if(!running)return;remain=Math.max(0,deadline-Date.now());view();if(remain===0){stop();msg(root,'설정한 시간이 끝났습니다.');try{if('vibrate' in navigator)navigator.vibrate([180,100,180]);}catch(e){/* ignore */}}}
 function start(){if(running)return;if(remain<=0){reset();if(remain<=0)return;}deadline=Date.now()+remain;running=true;interval=setInterval(tick,200);msg(root,'카운트다운을 실행합니다.');}
 function pause(){if(running){tick();stop();msg(root,'일시정지했습니다.');}}
 function reset(){stop();const m=Number(el(root,'minutes').value),s=Number(el(root,'seconds').value);if(!Number.isInteger(m)||!Number.isInteger(s)||m<0||m>999||s<0||s>59||m*60+s<=0){remain=0;view();msg(root,'분·초를 올바르게 입력해 주세요.',true);return;}remain=(m*60+s)*1000;view();msg(root,'시간이 초기화됐습니다.');}
 el(root,'start').onclick=start;el(root,'pause').onclick=pause;el(root,'reset').onclick=reset;
 el(root,'minutes').onchange=reset;el(root,'seconds').onchange=reset;
 window.addEventListener('pagehide',stop,{once:true});
}
