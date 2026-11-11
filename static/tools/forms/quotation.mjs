/** Blank quotation, laid out from the user-supplied printed reference. */
const field = (key, label, max = 60, numeric = false) =>
  `<input type="text" data-field="${key}" aria-label="${label}" autocomplete="off" maxlength="${max}"${numeric ? ' inputmode="numeric" class="numeric-input"' : ''}>`;
const amount = (key, label) => `<output data-calc="${key}" aria-label="${label}">0</output>`;

export function quotationHTML() {
  const rows = Array.from({ length: 15 }, (_, i) => `
    <tr>
      <th scope="row">${i + 1}</th>
      <td>${field(`item-${i}-name`, `${i + 1}번 품명`, 48)}</td>
      <td>${field(`item-${i}-spec`, `${i + 1}번 규격`, 20)}</td>
      <td class="numeric">${field(`item-${i}-qty`, `${i + 1}번 수량`, 10, true)}</td>
      <td class="numeric">${field(`item-${i}-price`, `${i + 1}번 단가`, 15, true)}</td>
      <td class="numeric">${amount(`item-${i}-amount`, `${i + 1}번 금액`)} 원</td>
    </tr>`).join('');

  return `<section class="paper-form quotation" aria-label="견적서 서식">
    <div class="quotation-topline"><label>문서번호 ${field('slipNumber', '문서번호', 24)}</label></div>
    <h2 class="quotation-heading">견 적 서</h2>
    <div class="quotation-parties">
      <div class="quotation-recipient">
        <label class="quotation-date">작성일 ${field('writtenDate', '작성일', 24)}</label>
        <div class="quotation-buyer">${field('buyer', '수신처', 36)}<span>님 귀하</span></div>
        <p>아래와 같이 견적합니다.</p>
      </div>
      <table class="quotation-supplier">
        <caption>공급자 정보</caption>
        <colgroup><col style="width:6%"><col style="width:18%"><col style="width:29%"><col style="width:16%"><col style="width:31%"></colgroup>
        <tbody>
          <tr><th rowspan="5" scope="rowgroup" class="vertical-label">공급자</th><th scope="row">등록번호</th><td colspan="3">${field('supplierNo', '공급자 사업자등록번호', 14)}</td></tr>
          <tr><th scope="row">상호</th><td>${field('supplier', '공급자 상호', 36)}</td><th scope="row">성명</th><td>${field('supplierOwner', '공급자 대표자 성명', 20)}</td></tr>
          <tr><th scope="row">주소</th><td colspan="3">${field('supplierAddress', '공급자 주소', 100)}</td></tr>
          <tr><th scope="row">업태</th><td>${field('supplierIndustry', '공급자 업태', 24)}</td><th scope="row">종목</th><td>${field('supplierCategory', '공급자 종목', 24)}</td></tr>
          <tr><th scope="row">TEL</th><td>${field('supplierPhone', '공급자 전화번호', 24)}</td><th scope="row">FAX</th><td>${field('supplierFax', '공급자 팩스번호', 24)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="quotation-total">
      <div><strong>합계금액</strong><small data-tax-caption>부가세 포함</small></div>
      <strong class="quotation-korean">일금 <span data-amount-korean>영 원정</span></strong>
      <strong class="quotation-grand">(₩ ${amount('grand', '합계금액')} )</strong>
    </div>
    <table class="quotation-items">
      <caption>견적 품목 및 금액 (단위: 원)</caption>
      <colgroup><col style="width:6.5%"><col style="width:33.5%"><col style="width:10%"><col style="width:13%"><col style="width:17%"><col style="width:20%"></colgroup>
      <thead><tr><th scope="col">번호</th><th scope="col">품명</th><th scope="col">규격</th><th scope="col">수량</th><th scope="col">단가</th><th scope="col">금액</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><th colspan="5" scope="row">품목 합계</th><td class="numeric">${amount('supply', '품목 합계')} 원</td></tr></tfoot>
    </table>
    <div class="quotation-tax-control"><label>부가세 처리 <select data-field="vatMode" aria-label="부가세 처리" autocomplete="off"><option value="included" selected>부가세 포함</option><option value="exclusive">부가세 별도 (10% 가산)</option><option value="exempt">부가세 미계산</option></select></label></div>
    <table class="quotation-summary">
      <caption>합계 및 계약금</caption>
      <tbody><tr><th scope="row">합계</th><td>${amount('grand', '최종 합계')} 원</td><th scope="row">계약금</th><td class="quotation-paid">${field('paid', '계약금', 15, true)}<span>원</span></td><th scope="row">잔금</th><td>${amount('balance', '잔금')} 원</td></tr></tbody>
    </table>
    <div class="quotation-remarks"><label for="quotation-remarks">※ 비고 및 특이사항</label><textarea id="quotation-remarks" data-field="remarks" aria-label="비고 및 특이사항" autocomplete="off" rows="5" maxlength="550"></textarea></div>
    <table class="quotation-contacts">
      <caption>담당자 연락처</caption>
      <colgroup><col style="width:10%"><col style="width:18%"><col style="width:10%"><col style="width:20%"><col style="width:10%"><col style="width:32%"></colgroup>
      <tbody>
        <tr><th scope="row">부서</th><td>${field('department', '담당 부서', 20)}</td><th scope="row">담당</th><td>${field('contact', '담당자', 20)}</td><th scope="row">E-mail</th><td>${field('email', '담당자 이메일', 70)}</td></tr>
        <tr><th scope="row">TEL</th><td>${field('phone', '담당자 전화번호', 24)}</td><th scope="row">H.P</th><td>${field('mobile', '담당자 휴대전화번호', 24)}</td><th scope="row">FAX</th><td>${field('fax', '담당자 팩스번호', 24)}</td></tr>
      </tbody>
    </table>
    <footer class="quotation-footer">금액과 거래 조건을 확인한 뒤 사용하세요.</footer>
  </section>`;
}
