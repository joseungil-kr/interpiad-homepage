# Responsive free-form editors

## Cause and implementation

The original five tools edit directly on fixed A4 sheets (portrait approximately 794 CSS pixels; landscape approximately 1123). Their internal horizontal scroll is intentional in the old stylesheet but unsuitable for narrow mobile devices.

The shared `responsive-editor.js` creates a reflowing editor below 1200 CSS pixels. Every original data-field has one proxy, with grouped company details, item cards and contract sections. Values, checkboxes, VAT controls, validation and totals synchronize with the existing calculation/print source. Original identifiers and print layout remain unchanged. Long input wraps and grows vertically rather than being clipped. The employment contract includes an expandable, synchronized view of all original clauses.

At print time the editor is hidden and the original A4 source is shown. No document input is sent over the network or persisted. The implementation does not change authentication, permissions, DNS or security settings.

## Prior-art review

Reviewed existing GitHub implementations before editing:

- https://github.com/kasapdev/invoice-generator-pro : MIT license, HTML/CSS/JS, responsive item cards and a separate paper preview. Reviewed index.html and css/app.css; repository activity included commit 907314 (September 2026).
- https://github.com/BaseMax/invoice-form-builder : MIT license, HTML/CSS/JS, stacked editor/preview below 992px and a 210mm print sheet. Reviewed style.css; repository activity included commit d23220 (December 2025).

No third-party code or dependencies were copied. The repository's existing form fields, calculation logic, validation and A4 renderers are reused.

## Verification scope

`tests/forms-responsive.py` covers all five forms at 320, 360, 384, 412, 690, 768, 1024, 1199, 1200 and 1440 CSS pixels. It checks document and descendant horizontal overflow, clipped controls, focused typing, long values, synthetic composition events, numeric insertion, both-direction value synchronization, viewport transitions, VAT and insurance controls, all ten contract headings, clear confirmation, lack of input-triggered network/storage writes, screenshots and mobile-viewport A4 PDFs.

These are Chromium viewport simulations, not physical Galaxy S24, A34 or Fold6 tests. They do not verify native Samsung keyboard or Samsung Internet behavior. Existing document/browser/DOM checks also remain enabled.

Public HTTP access from the build environment returned HTTP 403 in previous verification; this route is not retried or bypassed. Live verification uses the user's ordinary authorized browser separately. A successful CI or Cloudflare deployment status is not, by itself, proof of live rendering.

## Recorded evidence

- Commit d9bd75af5f48bd8d4448fd7225e08d983b5b614a: https://github.com/joseungil-kr/interpiad-homepage/actions/runs/43016126607
- Responsive checks: 497 passed, 0 failed. Existing document checks: 60; browser checks: 176; DOM checks: 191. Artifact 13852452965 was downloaded and its JSON/PDF files inspected independently.
- Five mobile-viewport PDFs each contain one A4 page. Landscape invoice: 841.92 × 594.96 pt; other forms: 594.96 × 841.92 pt. The first three forms retain both document copies.
- Initial new-test failures were traced to intentionally blank print mode suppressing totals and a nonexistent quotation tax DOM selector. Tests now use normal interactive URLs and verify the quotation grand total after VAT. No assertion was removed to conceal overflow.
- Independent ordinary Chrome preview checks reported all five tools at 384/768px without document/editor horizontal overflow, with long-value input and calculations. Physical Samsung devices and physical printer output remain unverified.
