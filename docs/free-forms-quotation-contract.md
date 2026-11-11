# 견적서·계약직 근로계약서 추가 기록

## 원본과 구현

사용자가 제공한 견적서·근로계약서 이미지 두 장의 실제 화면을 확인했다. 견적서는 번호, 제목, 수신처/공급자, 한글 합계, 품목 15행, 계약금/잔금, 비고 및 연락처 표를 재현한다. 근로계약서는 10개 항목과 서명란을 유지하되 공식 참고자료를 바탕으로 근로시간·휴게시간·주휴일·임금 계산방법·보험 예외사항을 보완했다. 예시 로고, 직인 및 개인·업체 정보는 게시하지 않는다.

기존 저장소의 Hugo tools 템플릿, forms.css/interpiad.css의 화면 구조, korean-money.mjs의 한글 금액 변환, 브라우저 인쇄 및 PDF 저장 흐름을 재사용한다. 새 양식의 입력은 메모리에서만 처리한다. 서버·저장소·외부 API 전송 코드는 없다. 전자서명·계약 전송·급여 검증 도구가 아니다.

## 사전 GitHub 재사용 조사

- https://github.com/kasapdev/invoice-generator-pro : HTML/CSS/Vanilla JS, MIT 라이선스 원문 확인. 조사 시 최신 커밋 907314ebe227accc72e980a4799baafa5b082dbe (2026-09-06). 인쇄 CSS와 입력/미리보기 구조를 살펴보았으며 localStorage 저장은 채택하지 않았다. 7개 커밋의 작은 프로젝트로 장기 유지보수 보장은 없다.
- https://github.com/BaseMax/invoice-form-builder : HTML/CSS/JS, MIT 라이선스 원문 확인. 최신 커밋 d23220b19511909dd838a5579ce76aee94eb5244 (2025-12-04). 인쇄/PDF 흐름 참고. 불필요한 환율 API는 도입하지 않았다.
- 외부 소스 코드를 복사하거나 신규 런타임 의존성을 추가하지 않고, 기존 자사 코드와 브라우저 표준 기능을 사용했다. 외부 두 앱의 실행·보안성은 검증하지 않았다.

## 법령 및 공식 참고자료

- 고용노동부 2025 개정 표준근로계약서 게시물: https://www.moel.go.kr/policy/policydata/view.do?bbs_seq=20250300356
- 해당 HWP 본문 직접 추출 확인: https://www.moel.go.kr/common/downloadFile.do?bbs_id=29&bbs_seq=20250300356&file_ext=hwp&file_seq=20250800411
- 근로기준법 제17조: https://law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1012792603
- 기간제법 제17조: https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1010787033

공식 원문과 같은 서식이라고 표시하지 않는다. 사업장 규모·근무형태별 법적 적합성은 보장하지 않는다. 후속 개정본이 없다고 단정하지 않는다.

## 검증 방법

`hugo --minify` 후 기존 DOM/브라우저 회귀검사와 `tests/forms-documents.py`를 실행한다. 새 검사는 15행 계산·부가세·계약금·숫자/날짜 오류·XSS·입력 후 네트워크 요청 부재·storage 부재·빈 창·초기화·인쇄·A4 PDF·모바일을 검사하며 실제 PDF/PNG/JSON을 아티팩트로 남긴다. 긴 입력은 실제 인쇄 CSS를 적용한 숨김 문서의 크기를 측정해 A4 초과 시 인쇄 버튼을 차단하고 경고한다.

로컬 실행 환경의 Chromium은 socket() Operation not permitted로 시작하지 못했으므로, 기존 GitHub Actions의 독립 실행 환경에서 실제 인쇄 결과를 생성해 내려받아 검사한다. 운영 배포 이후에는 공개 JS/CSS/모듈을 저장소 내용과 바이트 단위 대조하고 실제 URL에서 새 브라우저 검사를 반복한다. Actions의 성공 응답만으로 시각 검증을 대체하지 않는다.

## 사전 배포 검증 결과

2026-11-11 브랜치 커밋 `371e5b75e68f5621c2f10a10a9f2a15ff82b1a9d`, Actions run https://github.com/joseungil-kr/interpiad-homepage/actions/runs/43009738918 에서 새 양식 52개 검사와 기존 브라우저 회귀 173개 검사가 통과했다. PDF와 PNG 아티팩트를 내려받아 견적서 15행/비고, 근로계약서 양측 서명란을 직접 확인했다. 빈 양식과 입력한 양식 모두 A4 세로 한 페이지였다. 320px/390px 화면 넘침과 긴 입력 차단도 검사했다. 생성된 빈 양식 미리보기는 794×1119, OG 이미지는 1200×630 JPEG이다. 최종 배포 SHA/공개 검증 결과는 해당 커밋의 Actions 및 공개 URL 확인 기록과 함께 제시한다.
