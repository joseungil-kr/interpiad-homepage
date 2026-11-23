# 내 서식 관리 — 로컬 검수용 구현

Node 24.22+ 내장 SQLite를 쓰는 독립 서버입니다. Hugo 정적 사이트와 같은 origin에서 `/api/*`, `/auth/*`를 처리합니다. 현재 Cloudflare Pages에 배포되지 않았으며 Pages Functions/D1 구현이 아닙니다. 운영 전 별도 Node 호스팅·HTTPS 프록시·영속 디스크·백업/복구·접근 제한을 정하거나 Cloudflare 실행 환경으로 이식해야 합니다. 공개 서비스용 rate limiting 및 저장 용량 정책은 운영 연결 전에 결정합니다.

## 로컬 실행 (PowerShell)

```powershell
hugo --destination public
$env:NODE_ENV='test'
$env:MY_FORMS_TEST_AUTH='1'
$env:APP_ORIGIN='http://127.0.0.1:8877'
$env:PORT='8877'
$env:MY_FORMS_DB='qa-my-forms.sqlite'
node server/my-forms.mjs
```

`POST /api/test-login`에 JSON `{"account":"alpha"}` 또는 `beta`와 위 origin 헤더를 보내면 가상 세션이 발급됩니다. 이 경로는 test 모드 + 명시적 플래그 + loopback origin에서만 존재합니다. production에서 플래그를 켜면 서버가 시작되지 않습니다. 브라우저 화면에는 가상 로그인 버튼을 제공하지 않습니다.

## 실제 로그인 연결 시 필요한 별도 설정

- 인터피아드 전용 앱/클라이언트와 동의 화면, 승인된 도메인 등록. 운영 콘솔은 이번 작업에서 변경하지 않았습니다.
- 서버 환경 변수 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `KAKAO_CLIENT_ID`(REST API 키), `KAKAO_CLIENT_SECRET`. 코드/브라우저에 키를 넣지 않습니다. 카카오는 이 구현에서 secret 활성화를 요구합니다.
- `APP_ORIGIN=https://인터피아드용도메인`과 각 `/auth/google/callback`, `/auth/naver/callback`, `/auth/kakao/callback` 정확한 주소 등록.
- `NODE_ENV=production`, `MY_FORMS_TEST_AUTH` 제거. Secure HttpOnly SameSite=Lax 쿠키, 24시간 세션. OAuth state는 브라우저 쿠키에 결합해 10분 후 만료, 한 번만 사용합니다.
- 실제 제공자 로그인/거부/로그아웃, HTTPS 프록시, DB 백업·복구, 운영용 요청 제한은 별도 검수 대상입니다. 이번에는 네트워크 응답 fixture와 가상 사용자만 사용했습니다.

계정 식별에는 제공자+고유 사용자 ID만 저장하며 이메일·프로필·액세스/리프레시 토큰을 저장하지 않습니다. 이메일 동일성으로 병합하지 않습니다. 거래처는 이름·주소·연락처·사업자등록번호 중 사용자가 입력한 정보만 저장합니다. 서식은 사용자가 저장을 누를 때 입력값·검색 메타데이터·발행 당시 HTML/CSS 원본을 전송합니다. 일반 작성·인쇄·PDF에는 인증이나 전송이 필요 없습니다.

## 데이터 및 검증

모든 목록·상세·수정·휴지통·복구·원본 출력은 서버 세션의 owner로 조회합니다. 문서 revision은 추가만 하며 거래처 변경과 연결하지 않습니다. 편집 경쟁은 version 409 응답으로 막습니다. 원본 열람은 scripts/network/forms를 금지하는 CSP sandbox에서 실행합니다. DB 파일은 public 폴더 밖에 둡니다. DB와 `.env`는 Git에서 제외했습니다.

```powershell
node --test tests/my-forms.test.mjs
python tests/my-forms-browser.py
```
브라우저 검증에는 Python Playwright/Chromium과 pypdf가 필요합니다. 기존 회귀검사는 `FORM_TEST_BASE=http://127.0.0.1:8877`로 `tests/forms-browser.py`, `forms-documents.py`, `forms-responsive.py`를 실행합니다.

## 온기 재사용 범위

2026-11-23 확인한 온기 원격 main `7b13422a009163cdcd22786dd65d2bec1e83688d`의 `src/login.css`를 `static/tools/my-forms/ongi-login.css`에 그대로 재사용했습니다. `src/LoginPage.tsx`의 제공자 순서·버튼 클래스를 HTML에 적용했습니다. React 전체 앱을 추가하지 않고 인터피아드 텍스트·전용 경로로 연결합니다.

온기 로컬 `C:/project/ongi`는 `8389bad7c38360f49d5a3e937d482c49611ec071`로 깨끗한 작업본이었습니다. 최신 원격 UI에서도 네이버·구글은 disabled/연결 준비 중이며 `server/gallery-api.mjs`에는 카카오 처리만 확인했습니다. 그 서버는 ongimemory.com origin, 온기 세션 쿠키·DB에 결합되어 있어 공유하지 않았습니다. 공용 인증 서비스 이용이 아니라 화면 스타일/구조 재사용입니다. 온기 키·세션·DB·운영 설정은 조회/복사/변경하지 않았습니다. 다른 담당자의 아직 푸시되지 않은 작업과 Edge 창의 설치 진행 상태는 확인하지 못했습니다.

## 공식 문서

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.naver.com/docs/login/api/api.md
- https://developers.kakao.com/docs/ko/kakaologin/rest-api
