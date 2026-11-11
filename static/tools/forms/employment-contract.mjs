// Blank fields only: no signatures, private example data or network requests.
const input=(key,label,width='wide',max=70)=>`<span class="entry ${width}"><input data-field="${key}" aria-label="${label}" maxlength="${max}" autocomplete="off"></span>`;
const text=(key,label,max=160)=>`<span class="entry block"><textarea data-field="${key}" aria-label="${label}" maxlength="${max}" rows="2" autocomplete="off"></textarea></span>`;
const money=(key,label)=>`<span class="entry money"><input data-field="${key}" aria-label="${label}" maxlength="14" inputmode="numeric" autocomplete="off"></span>`;
const section=(n,title,body)=>`<section class="contract-section"><h3>${n}. ${title}</h3>${body}</section>`;
export function contractHTML(){return `<article class="paper-form contract" aria-label="A4 세로 근로계약서">
<h2>근로계약서 (계약직)</h2>
<p class="contract-intro">${input('employer','사업주명','name',40)} (이하 ‘사업주’라 함)와 ${input('worker','근로자명','name',30)} (이하 ‘근로자’라 함)는 다음과 같이 근로계약을 체결한다.</p>
${section(1,'근로계약기간',`<p>본 근로계약은 ${input('startDate','계약 시작일 YYYY-MM-DD','date',10)}부터 ${input('endDate','계약 종료일 YYYY-MM-DD','date',10)}까지로 한다.</p>`)}
${section(2,'근무장소',text('workplace','근무장소',140))}
${section(3,'업무의 내용',text('duties','업무의 내용',140))}
${section(4,'근무일 및 근로시간',`<p>근무일 ${input('workdays','근무일 및 요일별 근로시간','wide',80)}</p><p>소정근로시간 ${input('startTime','근로 시작 시간','time',5)}부터 ${input('endTime','근로 종료 시간','time',5)}까지 / 휴게시간 ${input('breakStart','휴게 시작 시간','time',5)}부터 ${input('breakEnd','휴게 종료 시간','time',5)}까지</p><p>1일 ${input('dailyHours','1일 소정근로시간','day',5)}시간 / 1주 ${input('weeklyHours','1주 소정근로시간','day',5)}시간</p>`)}
${section(5,'임금구성 및 지급방식',`<p>기본급 <span class="entry pay-type"><select data-field="payType" aria-label="임금 단위"><option value="">선택</option><option>월급</option><option>일급</option><option>시급</option></select></span> ${money('salary','기본급')} 원 / 상여금 ${input('bonus','상여금 유무 금액 지급조건','wide',60)}</p><p>기타급여(수당명·금액·지급조건)</p>${text('allowances','기타급여 수당명 금액 지급조건',140)}<p>임금 계산방법 ${input('payCalculation','임금 계산방법','wide',100)}</p><p>임금지급일 매월 ${input('payDay','임금지급일','day',2)}일 (휴일인 경우 ${input('holidayPayDay','지급일이 휴일인 경우','name',30)})</p><p>지급방법 ${input('payMethod','임금 지급방법','wide',70)}</p>`)}
${section(6,'휴일 및 연차유급휴가',`<p>주휴일 매주 ${input('weeklyHoliday','주휴일 요일','day',4)}요일 / 기타 휴일 ${input('otherHolidays','기타 휴일','wide',60)}</p><p>공휴일·대체공휴일 및 연차유급휴가는 관계 법령에 따르며, 근로자의 날은 유급휴일로 한다.</p>`)}
${section(7,'사회보험 적용여부 (해당란에 표시)',`<div class="insurance">${['고용보험','산재보험','국민연금','건강보험'].map((label,i)=>`<label><input type="checkbox" data-field="insurance-${i}" aria-label="${label}"> ${label}</label>`).join('')}</div><p>관계 법령에 따라 가입하며, 적용 예외사항 ${input('insuranceException','사회보험 적용 예외사항','wide',70)}</p>`)}
${section(8,'근로계약서 교부',`<p>사업주는 근로계약을 체결하면서 본 계약서를 작성하여 근로자의 교부 요구와 관계없이 근로자에게 교부한다.</p>`)}
${section(9,'근로계약·취업규칙 등의 성실한 이행의무',`<p>사업주와 근로자는 근로계약, 취업규칙, 단체협약을 지키고 성실하게 이행하여야 한다.</p>`)}
${section(10,'기타',`<p>이 계약에 정함이 없는 사항은 근로기준법령에 따른다.</p>${text('additionalTerms','기타 합의사항',160)}`)}
<p class="contract-date">계약 작성일 ${input('writtenDate','계약 작성일 YYYY-MM-DD','date',10)}</p>
<div class="signatures">
<p><strong>(사업주)</strong> 사업체명 ${input('company','사업체명','name',40)} 전화 ${input('companyPhone','사업주 전화','name',25)}</p>
<p>주소 ${input('companyAddress','사업체 주소','wide',100)}</p>
<p>대표자 ${input('representative','대표자','name',30)} <span class="signature-mark">(서명 또는 인)</span></p>
<p><strong>(근로자)</strong> 주소 ${input('workerAddress','근로자 주소','wide',100)}</p>
<p>연락처 ${input('workerPhone','근로자 연락처','name',25)}</p>
<p>성명 ${input('workerName','서명란 근로자 성명','name',30)} <span class="signature-mark">(서명)</span></p></div>
</article>`;}
