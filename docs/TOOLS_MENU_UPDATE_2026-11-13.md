# 무료 업무도구·무료 업무서식 메뉴 분리 및 썸네일 작업지시서

최초 지시: 2026-11-13  
프로젝트: `joseungil-kr/interpiad-homepage`  
기본 브랜치: `master`; 배포: Cloudflare Pages `interpiad-homepage`

## 사용자 확정 요구

1. 인터피아드 상단 메뉴에 **무료 업무도구**, **무료 업무서식**을 별도 항목으로 둔다.
2. PDF 용량 줄이기는 무료 업무도구 목록에 카드로 등록하고, 기존 서식 카드처럼 **썸네일·제목·설명·버튼**을 노출한다.
3. 앞으로 무료 업무도구 썸네일의 통일성을 유지하도록 디자인시트와 색상·안전 영역을 기록한다.
4. 기존 사용자에게 제공한 5종 서식과 PDF 압축 기능을 손상시키지 않는다.

## 경로 결정 (기존 URL 보존)

| 메뉴·기능 | URL | 기준 파일 |
|---|---|---|
| 무료 업무도구 목록 | `/tools/apps/` | `content/tools/apps/_index.md`, `layouts/toolapps/list.html` |
| 무료 업무서식 목록 | `/tools/` | `content/tools/_index.md`, `layouts/tools/list.html` |
| PDF 용량 줄이기 | `/tools/pdf-compress/` | `content/pdf-compress.md`, `layouts/pdfcompress/single.html` |
| 기존 서식 5개 | `/tools/manual-invoice/` 등 | 현재 경로·동작 보존 |

구버전 `/tools/`는 이미 외부 링크가 있으므로 **서식 목록으로 유지**한다. 메뉴만 나누기 위해 301 이동이나 URL 변경을 하지 않는다. 도구 분류는 도구 프런트매터의 `toolCategory: "apps"`와 `previewImage` 메타데이터를 통해 목록에 자동 등록한다.

## 디자인 자산

- 디자인시트: `static/tools/images/tool-thumbnail-design-sheet.svg`
- 실사용 첫 썸네일: `static/tools/images/pdf-compress-thumbnail.svg`
- **제작 표준 전체:** [TOOL_THUMBNAIL_DESIGN_GUIDE_2026-11-13.md](TOOL_THUMBNAIL_DESIGN_GUIDE_2026-11-13.md)
- 예전 업무서식의 미리보기는 실제 비어 있는 양식을 촬영한 파일이다. 도구용 벡터 아이콘으로 바꾸지 않는다.

## 작업 허용·제외 범위

허용: 메뉴, 카드 목록, PNG/SVG 이미지 자산, 관련 템플릿/CSS, 문구, 작업지시서, 테스트.

제외: PDF 압축 처리 로직·PDF 벤더 코드·기존 업무서식 입력/인쇄 JS, GA4·애드센스, 인증·개인정보 수집·권한, 외부 서비스 요금제.

## 매 작업 QA

- 최신 `master`/열린 PR/현재 상태부터 읽는다.
- Hugo 빌드에서 `/tools/apps/`, `/tools/`, `/tools/pdf-compress/` 각각 정상 출력 확인.
- 데스크톱 1440·1024·768, 모바일 390·320폭에서 메뉴·카드 오버플로 여부 확인.
- 상단/하단 메뉴 양방향 링크, 도구 아이콘 디코드, 잘못된 중복 카드, 이미지 Alt 누락 검사.
- 원래 5개 무료서식 썸네일과 상세 주소, 인쇄·계산·A4·정보 전송 여부 회귀검사.
- PDF 압축 성공·다운로드·글자 유지·서버 전송 없음 회귀검사.
- GitHub 테스트 통과만으로 배포 완료로 보지 않는다. Cloudflare 체크의 정확한 커밋과 공개 URL을 별도로 확인한다.

## 배포/수정 원칙

테스트 브랜치에서 작업하고 실패 원인별로 한 번씩 고친다. `master`와 배포 결과를 서로 대조한다. 디자인시트 수정 시 이 문서와 디자인 가이드의 버전·색상을 함께 갱신한다. 이미지 생성 시 실제 서식 사진이나 고객 데이터를 사용하지 않는다.
