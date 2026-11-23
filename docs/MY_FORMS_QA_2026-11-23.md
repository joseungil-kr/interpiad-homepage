# 내 서식 관리 검수 기록

- 작업 브랜치: `dev/my-forms-20261123`
- 기준 원격 master: `3ffd600b1dd4bff51d4b2b9ed4756c1af69d31ac`
- 독립 작업본: `C:/Users/FIREBAT AM02/Documents/Codex/2026-11-23/task/interpiad-my-forms`
- 기존 `C:/project/interpiad-homepage`는 `52a3e2eaabd61ddfd77ee29df7ab858716daf004`, 상태 깨끗함을 확인. 기존 폴더·master는 수정하지 않음.
- 운영 배포·운영 DB/OAuth 콘솔 변경·실제 고객 정보·외부 발송·결제·검색 제출·push/merge 없음.

## 검증 결과

| 검증 | 결과 |
|---|---|
| 서버 보안/기능 자동 테스트 | 10/10 통과 |
| 새 관리 화면 Chromium | 44/44 통과 |
| 기존 거래명세표/영수증 및 목록 | 180/180 통과 |
| 기존 견적서/근로계약서 | 62/62 통과 |
| 기존 5종 반응형/인쇄 | 633/633 통과 |
| Hugo 빌드 | 286 pages / 304 static files 성공 |
| Git diff check | 통과 |

두 가상 계정 alpha/beta와 가상 거래처만 사용했습니다. 목록·상세·수정·삭제·복구·원본 다운로드의 교차 계정 차단, CSRF/Origin 차단, 충돌 버전, 원본 유지, 거래처 수정/휴지통/복구, 종류·거래처명·날짜·번호 검색, 제공자별 분리 및 이메일 자동병합 금지를 확인했습니다. OAuth 세 제공자는 HTTP 응답 fixture로 state/브라우저 결합·재사용 차단·토큰 교환·프로필 ID 처리를 검증했습니다. 실 계정 로그인 성공을 의미하지 않습니다.

새 화면은 320/390/768/1440px, 기존 5종은 320~1440px의 10개 폭에서 확인했습니다. 물리 휴대폰과 실제 프린터 검증은 아닙니다. 기존 입력 도중 데이터 전송·브라우저 저장·쿠키 생성 없음 검증도 통과했습니다.

## 남긴 증거

- [서버 테스트](my-forms-evidence/server-tests.log)
- [관리 화면 44항목](my-forms-evidence/results.json)
- [기존 기본 서식](my-forms-evidence/legacy-checks.json), [견적서/계약서](my-forms-evidence/document-checks.json), [반응형 633항목](my-forms-evidence/responsive-checks.json)
- [온기 스타일 로그인 모바일](my-forms-evidence/login-390.png)
- [관리 모바일](my-forms-evidence/manager-390.png), [관리 PC](my-forms-evidence/manager-1440.png)
- 발행 당시 원본에서 재출력한 PDF: [가로 명세표](my-forms-evidence/manual-invoice-saved.pdf), [세로 명세표](my-forms-evidence/manual-invoice-vertical-saved.pdf), [영수증](my-forms-evidence/simple-receipt-saved.pdf), [견적서](my-forms-evidence/quotation-saved.pdf), [계약서](my-forms-evidence/employment-contract-saved.pdf). 각 A4 한 장과 입력 텍스트 유지 확인.

온기 재사용 파일·원격 SHA·개별 콜백과 서버 환경 변수·운영 연결 전 남은 사항은 [서버 README](../server/README.md)에 있습니다. 온기 React 화면/스타일을 정적 HTML에 적용했으며 온기 인증 서비스·세션·DB를 공유하지 않습니다. 최신 원격에는 카카오만 연결되어 있어 구글·네이버의 별도 진행 중 작업은 확인하지 못했습니다.

## 범위와 남은 운영 항목

로그인 버튼, 서버 OAuth 코드, 개인 발행본 검색·열람·재출력·수정 버전·휴지통·복구, 거래처 관리·새 서식 자동 입력, 원본 HTML/CSS 보존을 구현했습니다. 저장은 명시적 사용자 동작일 때만 수행합니다.

실제 로그인에는 인터피아드 앱/키/콜백 등록과 각 제공자 검수가 필요합니다. 현 사이트는 Cloudflare Pages이며 이번 서버는 Node/SQLite 로컬 구현이므로 운영 호스팅 결정 또는 Pages Functions/D1 이식이 추가로 필요합니다. 운영 요청 제한·저장 용량·백업 및 실제 기기/실제 로그인 검증은 미실시입니다. 기능 검수용 개발 커밋이며 운영 배포 완료본으로 간주하지 않습니다.
