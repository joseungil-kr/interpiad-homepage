import {el,fields,msg,two} from './helpers.js';
function timer(root){
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

function stopwatch(root){
 fields(root,'<div class="it-timer-display" id="clock" role="timer">00:00.00</div><div class="it-actions"><button id="start" type="button">시작</button><button id="pause" class="it-secondary" type="button">일시정지</button><button id="lap" class="it-secondary" type="button">랩 기록</button><button id="reset" class="it-secondary" type="button">초기화</button></div><ol id="laps" class="it-list" aria-label="랩타임 목록"></ol>');
 let run=false,startAt=0,elapsed=0,lastLap=0,timer=null;
 function now(){return elapsed+(run?performance.now()-startAt:0);}
 function format(n){const cs=Math.floor(n/10),m=Math.floor(cs/6000),s=Math.floor(cs/100)%60,h=cs%100;return two(m)+':'+two(s)+'.'+two(h);}
 function view(){el(root,'clock').textContent=format(now());}
 function stop(){if(run){elapsed=now();run=false;}clearInterval(timer);timer=null;view();}
 el(root,'start').onclick=()=>{if(run)return;run=true;startAt=performance.now();timer=setInterval(view,50);msg(root,'측정 중입니다.');};
 el(root,'pause').onclick=()=>{stop();msg(root,'일시정지했습니다.');};
 el(root,'lap').onclick=()=>{const current=now();if(!run&&current<=0){msg(root,'시작 버튼을 눌러 주세요.',true);return;}const items=el(root,'laps');if(items.children.length>=50){msg(root,'랩 기록은 최대 50개입니다.',true);return;}const li=document.createElement('li');li.textContent='구간 '+(items.children.length+1)+' · '+format(current-lastLap)+' · 누적 '+format(current);items.prepend(li);lastLap=current;};
 el(root,'reset').onclick=()=>{stop();elapsed=0;lastLap=0;el(root,'laps').replaceChildren();view();msg(root,'초기화했습니다.');};window.addEventListener('pagehide',stop,{once:true});
}
function pomodoro(root){
 fields(root,'<div class="it-fields"><label class="it-field">집중 시간(분)<input id="focus" type="number" min="1" max="180" value="25"></label><label class="it-field">휴식 시간(분)<input id="break" type="number" min="1" max="60" value="5"></label></div><h3 id="phase" style="text-align:center">집중 1회차</h3><div class="it-timer-display" id="clock" role="timer">25:00</div><div class="it-actions"><button id="start" type="button">시작</button><button id="pause" class="it-secondary" type="button">일시정지</button><button id="next" class="it-secondary" type="button">다음 단계</button><button id="reset" class="it-secondary" type="button">초기화</button></div><p class="it-hint">집중·휴식이 끝나면 다음 단계로 전환되지만 자동 시작은 하지 않습니다.</p>');
 let focus=true,round=1,remaining=1500000,deadline=0,timer=null,running=false;
 function duration(){const n=Number(el(root,focus?'focus':'break').value);if(!Number.isInteger(n)||n<1||n>(focus?180:60))throw Error('설정 가능한 시간 범위를 확인해 주세요.');return n*60000;}
 function view(){const sec=Math.ceil(remaining/1000);el(root,'clock').textContent=two(Math.floor(sec/60))+':'+two(sec%60);el(root,'phase').textContent=(focus?'집중 ':'휴식 ')+round+'회차';}
 function stop(){if(running){remaining=Math.max(0,deadline-Date.now());running=false;}clearInterval(timer);timer=null;view();}
 function next(){stop();focus=!focus;if(focus)round++;try{remaining=duration();view();msg(root,'다음 단계가 준비됐습니다. 시작을 눌러 주세요.');}catch(e){msg(root,e.message,true);}}
 function tick(){if(!running)return;remaining=Math.max(0,deadline-Date.now());view();if(remaining===0){next();msg(root,'시간이 끝났습니다. 다음 단계를 시작할 수 있습니다.');}}
 el(root,'start').onclick=()=>{if(running)return;try{if(remaining<=0)remaining=duration();deadline=Date.now()+remaining;running=true;timer=setInterval(tick,300);msg(root,'타이머를 실행합니다.');}catch(e){msg(root,e.message,true);}};
 el(root,'pause').onclick=()=>{stop();msg(root,'일시정지했습니다.');};el(root,'next').onclick=next;
 el(root,'reset').onclick=()=>{stop();focus=true;round=1;try{remaining=duration();view();msg(root,'집중 1회차로 초기화했습니다.');}catch(e){msg(root,e.message,true);}};
 el(root,'focus').onchange=()=>{if(!running&&focus){try{remaining=duration();view();}catch(e){msg(root,e.message,true);}}};
 el(root,'break').onchange=()=>{if(!running&&!focus){try{remaining=duration();view();}catch(e){msg(root,e.message,true);}}};
 window.addEventListener('pagehide',stop,{once:true});
}
export function mount(root,key){if(key==='timer')timer(root);else if(key==='stopwatch')stopwatch(root);else if(key==='pomodoro')pomodoro(root);else throw Error('지원하지 않는 타이머입니다.');}
