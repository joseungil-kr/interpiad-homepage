# 🔍 [적대적 검수 리포트] 인터피아드 공식 홈페이지 (interpiad-homepage)

## 1. 개요 및 아키텍처
- **기술 스택**: Hugo, JavaScript (js.Build 파이프라인), Schema.org 구조화 데이터
- **도메인**: `https://interpiad.com/`
- **주요 기능**: 온라인 마케팅 컨설팅, 포트폴리오, 마케팅 인사이트 블로그

---

## 2. 브라우저 호환성 & 브랜드 신뢰도 결함 (High)

### 🚨 결함 1: 파비콘(`<link rel="icon">`) 메타태그 완전 누락
- **위치**: `layouts/partials/head.html`
- **문제점**:
  1. `head.html` 전체에 `<link rel="icon">` 또는 `<link rel="apple-touch-icon">` 태그가 **단 하나도 선언되어 있지 않습니다**.
  2. 북마크 추가, 모바일 홈 화면 추가 시 기본 빈 회색 아이콘이 뜨며, 브라우저 탭에서도 기업 로고가 노출되지 않아 IT/온라인 마케팅 전문 기업으로서의 대외적 신뢰도를 훼손합니다.
  3. 모든 접속마다 `/favicon.ico` 404 로그가 발생합니다.
- **조치 방안**:
  `head.html`에 고해상도 PNG 및 SVG 파비콘 태그를 삽입하십시오:
  ```html
  <link rel="icon" type="image/png" sizes="32x32" href="/images/logo/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/logo/apple-touch-icon.png">
  ```

---

## 3. 배포 및 빌드 신뢰도 취약점 (Medium)

### ⚠️ 결함 2: `buildFuture = true` 설정으로 인한 미발행 콘텐츠 사전 노출 리스크
- **위치**: `hugo.toml` 라인 4
- **코드**: `buildFuture = true`
- **문제점**: 작성 중인 마케팅 칼럼이나 고객사 사례의 발행일을 미래(예: 내일 오전 9시)로 지정해두더라도, 빌드 시점에 **즉시 프로덕션에 생성되어 외부에 노출**됩니다. 엠바고나 사전 작성 글의 유출 위험이 있습니다.
- **조치 방안**: `buildFuture = false`로 변경하여 예약 발행 시점이 도래했을 때만 빌드되도록 수정해야 합니다.

### ⚠️ 결함 3: 개인 휴대폰 번호(`010-2490-0555`) 평문 노출
- **위치**: `hugo.toml` 라인 12 및 Schema.org JSON-LD
- **문제점**: 기업 홈페이지 및 구조화 데이터에 개인 휴대전화 번호가 그대로 노출되어 보이스피싱, 광고 문자, 불특정 영업 전송 봇의 타깃이 됩니다. 대표번호(1588 등) 또는 050 안심번호 적용을 권장합니다.

---

## 4. 긴급 보완 권고사항 체크리스트
- [ ] `layouts/partials/head.html`에 파비콘 및 애플 터치 아이콘 추가
- [ ] `hugo.toml`의 `buildFuture = false`로 수정
- [ ] 개인 연락처를 대표번호 또는 안심번호로 교체
- [ ] Cloudflare `_headers` 보안 정책 적용
