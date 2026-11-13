# 인터피아드 무료 업무도구 25종: 구현 및 운영 명세

- 작성일: 2026-11-13
- 작업 저장소: joseungil-kr/interpiad-homepage
- 작업 브랜치: feat/interpiad-free-tools-25-20261113
- 목록 경로: /tools/apps/
- 기존 업무서식 5종: /tools/ (변경 없음)
- 기존 PDF 압축: /tools/pdf-compress/ (변경 없음)
- 신규 도구 상세: /tools/apps/{tool-key}/ 24개 (기존 PDF 포함 총 25개)

## 개발 차수

1. 이미지 용량·크기·형식, 일반계산, 부가세, 마진, 단위, QR, 카운트다운: 9개
2. EXIF 제거, 이미지→PDF, PDF 병합·추출, 할인, 날짜, 대출, UTM: 7개
3. 환율, ROAS, SEO 미리보기, CSV/XLSX 중복행, 글자수, 색상, 스톱워치, 뽀모도로: 8개
4. 종합 Chromium 검수, 기존 PDF·서식 회귀검수, 배포 확인

## 구성 및 운영비

- Hugo 정적 빌드, 정적 HTML/CSS/JS/SVG만 배포한다.
- 페이지에서 필요한 JS 모듈만 동적 로드한다. 공통 UI는 layouts/utility/single.html과 static/tools/utility 폴더를 이용한다.
- PDF 조작은 기존 로컬 pdf-lib.min.js 파일을 재사용하며 이미지는 Canvas/File/Blob API로 방문자 브라우저에서 처리한다.
- 정적 QR은 로컬 호스팅 qrcodejs(MIT), XLSX 해제는 로컬 호스팅 JSZip(dual MIT/GPL; MIT 선택) 사용. 라이선스 전문은 vendor 폴더에 보관한다.
- 파일 업로드, 사용자 문서 저장, 신규 Worker, KV, D1, R2, DB, 유료 API, 로그인, 별도 서버 API 없음.
- 환율만 사용자가 계산 버튼을 누르면 Frankfurter 공개 API(v1/latest)를 GET 호출한다. 통화코드만 전송하고 금액은 브라우저에서 계산한다. 메모리 캐시 1시간.
- Cloudflare Pages에서 정적 요청이 Functions를 거치지 않으면 해당 요청은 무제한 무료. 이 저장소에는 functions 폴더, _worker.js, _routes.json이 없다(2026-11-13 작업 브랜치 기준).
- 화면의 원래 GA4는 기존 설정을 유지하며 문서 파일 내용은 분석 이벤트로 전송하지 않는다.

## 세부 범위와 제한

- PDF 병합·추출: 페이지 복사; 암호 PDF와 전자서명 보존을 보장하지 않는다. 파일당 40MB, 10개, 총 300페이지 상한.
- PDF 압축: 기존 독립 페이지에서 처리한다. 이미지 많은 PDF의 압축 효과가 크고 텍스트 기반 PDF에서는 절감이 적을 수 있다.
- 이미지 변환: JPEG/WebP 손실 압축과 PNG 무손실 형식; JPEG 출력 시 투명 영역은 흰색으로 처리한다.
- 이미지 리사이즈: 최대 20장, JPEG로 내보낸다. 확대하지 않고 비율 유지.
- EXIF 제거: 캔버스 재인코딩으로 일반적인 촬영 메타데이터를 제거한다. 결과 색상/용량/화질이 달라질 수 있다.
- 이미지 PDF: 최대 15장, A4 세로 페이지에 이미지 삽입, OCR 기능 없음.
- XLSX: 파일의 첫 번째 sheet XML을 읽어 셀 값을 UTF-8 CSV로 출력. 다른 시트, 수식, 셀 서식은 보존하지 않는다. 파일 15MB, 5만 행 제한.
- 환율: 기준환율이지 은행 환전 매매환율이 아니다. API 장애 시 계산 성공으로 표시하지 않는다.
- QR: 정적 QR 자체에 구독 만료 없음. URL 대상 사이트가 변경되면 사용자가 다시 QR을 만들어야 한다.
- 날짜/이자/부가세/ROAS: 입력 가정과 계산 기준을 페이지에 표시한다.
- 카운트다운/스톱워치/뽀모도로: 브라우저 탭을 닫으면 기록은 사라지고 기기의 절전 상태에 따라 화면 알림은 늦을 수 있다.

## 코드 및 접근성/SEO 기준

- toolCategory=apps 메타데이터로 25종 카드 자동 목록화, 각 카드에 고유 SVG 썸네일과 안내문 제공.
- 기존 SVG 디자인시트 토큰 #F5F3ED, #0B756A, #DCEDE8, #C69D60을 사용하고 viewBox 1200×900 및 안전영역을 유지.
- tools/apps 목록의 검색·분류 필터는 클라이언트만 사용한다. 페이지마다 고유 제목·설명·URL·sitemap 항목을 갖는다.
- 320/390/1440px 뷰포트, 키보드 focus 및 aria-live 상태 메시지 구현.
- 기존 서식 5종 및 PDF 압축 입출력 로직·URL은 수정하지 않는다.

## 재현 테스트

- .github/workflows/pdf-compress-check.yml에 Node 모듈 문법, Hugo 빌드, PDF 압축 23건, 메뉴 회귀 65건, 신규 24개 상세 도구 207건 Chromium 테스트가 포함된다.
- tests/utility-tools-browser.py는 계산값, 브라우저 렌더, 이미지 변환, QR PNG, PDF 병합/추출, XLSX/CSV 중복제거, 환율 API fixture, 타이머, 자체 서버 POST 부재를 검증한다.
- 외부 Frankfurter 실제 API 통신, 메모리 저사양 폰, 운영 Cloudflare 경유 성능은 별도의 운영 확인 대상으로 남긴다.
- 기존 서식 회귀 워크플로도 별도로 실행된다.

## 배포 검수 순서

1. 작업 브랜치의 Node/Hugo/Chromium/서식 테스트 통과 여부를 실제 GitHub Actions에서 확인한다.
2. PR 파일 변경과 기존 운영 HEAD를 비교한다.
3. master 병합 후 Cloudflare Pages 빌드가 대상 커밋을 배포했는지 확인한다.
4. interpiad.com/tools/apps/ 목록 25개, 신규 상세 페이지, PDF 압축 및 5개 서식의 실제 HTTP를 확인한다.
5. Search Console 및 네이버 서치어드바이저는 승인된 기존 운영 방식으로 새 사이트맵을 제출하고 수집 성공은 따로 검증한다.
