const search=document.getElementById('it-catalog-query');
const category=document.getElementById('it-catalog-group');
const count=document.getElementById('it-catalog-count');
const cards=[...document.querySelectorAll('#it-catalog .tools-card')];
function filter(){const q=(search.value||'').trim().toLocaleLowerCase('ko-KR'),g=category.value;let visible=0;for(const c of cards){const show=(!g||c.dataset.group===g)&&(!q||c.textContent.toLocaleLowerCase('ko-KR').includes(q));c.hidden=!show;if(show)visible++;}count.textContent='표시 '+visible+'개 / 전체 '+cards.length+'개';}
if(search&&category&&count){search.addEventListener('input',filter);category.addEventListener('change',filter);filter();}
