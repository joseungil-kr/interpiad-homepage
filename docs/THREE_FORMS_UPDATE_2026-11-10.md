# Three free forms update

## Source inspected

- Source repository: `joseungil-kr/fwith-site-factory`, branch `feature/baekse-order-deploy-20261103`, commit `78420c88e9759aed77c1980e94bcac81b135f2d4`.
- Reused `apps/baekse-order/public/manual-forms/forms.css`, `korean-money.mjs`, and the new/updated rendering and formatting logic from `forms.js`.
- Source forms opened in a real browser: https://order.baeksefood.com/manual-invoice/, https://order.baeksefood.com/manual-invoice-vertical/, https://order.baeksefood.com/simple-receipt/.
- All three live source assets returned HTTP 200 and matched the checked-out source files after newline normalization. Source asset SHA-256: forms.js `22584a255148977523b18a18f7bb24f46335d548264e690a8d58b121f4a5412d`, forms.css `51bfb8d3f647ed03bb8c04b497aabc9bf7b4d5e32be97573dd170f67b7e8915f`, korean-money.mjs `3a463a74a555762c40dc06299bf32b5e0198df3b199ca694419d3c7afd80687c`.
- The source is the user's existing plain HTML/CSS/JavaScript implementation, actively updated on 2026-11-10. No third-party starter or runtime dependency was added. Earlier reuse research is recorded in `FREE_FORMS_MIGRATION_2026-11-10.md`; reusing the user's deployed form avoids an unrelated framework migration.
- Target base: `joseungil-kr/interpiad-homepage`, `master`, `fe73db3e96174ccf78b99c42b7a79b5f95c31287`.

## Changes

- Three routes: `/tools/manual-invoice/` (15 rows, A4 landscape), `/tools/manual-invoice-vertical/` (10 rows, A4 portrait, red supplier copy above blue recipient copy), `/tools/simple-receipt/` (15 rows, A4 portrait).
- Both invoice layouts show the total in Korean words and numerals. Unit-price input adds thousands separators; untouched/incomplete rows retain empty amount cells.
- All three forms are linked in the form toolbar and the `/tools/` landing page. The new page has canonical, FAQ/application/breadcrumb schema, sitemap and RSS inclusion.
- Preserved Interpiad branding, contact, business options, monthly 11,000 KRW including VAT / 300 documents pricing, strict invalid-number and overflow print blocking, multiline address/product fields, and blank receipt printing.
- Source formatter was adapted to preserve invalid values such as `1.5` rather than silently convert them to `15`. Existing validation then reports the error and blocks printing.
- No source ERP, customer records, credentials, permission settings, DNS, or existing publication schedule changed.

## Direct local verification on AM02

- Hugo extended 0.168.0 build: 257 pages, 233 static files, success.
- `node --check static/tools/forms/forms.js` and `git diff --check`: passed.
- Expanded `tests/forms-dom.cjs`: 148 assertions passed against generated HTML. The CI browser test was expanded for all three forms; local real-browser checks used Ego Lite rather than launching a separate browser.
- Real-browser checks: 46 assertions passed, including calculations, last-row inclusion, two-copy mirroring, Korean totals, invalid input/print blocking, reset/cancel, blank mode, marketing hidden for print, and mobile overflow at 320/390 px. Landing tested at 320/390/768/1440 px.
- Six PDFs were generated (filled and blank for each form) and inspected independently with PyMuPDF: each is one A4 page, correct orientation, both signature lines; filled PDFs contain both copies of the last item and complete address. Marketing does not appear. All three filled PDF renders were visually inspected.
- An initial blank-PDF test incorrectly forced screen media and produced extra pages. The test was corrected to print media; all three blank PDFs were regenerated and passed. This was a test setup issue, not hidden as a successful result.

## Publication verification

Publication and CI must be checked against the resulting commit and the public URLs after push. Local validation alone is not proof of successful deployment. Search engine indexing and physical printer output are not asserted by these checks.
