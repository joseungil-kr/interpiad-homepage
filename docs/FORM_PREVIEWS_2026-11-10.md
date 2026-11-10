# Actual free-form previews and social images

## Source and reuse
- Target: joseungil-kr/interpiad-homepage, master, starting commit 93329ff7398e0ca20ed01ead6b0cb249f6f15e79. Working tree was clean.
- Inspected public /tools/ and all three form URLs. All returned HTTP 200. The form OG image existed but pointed to the common logo; Twitter had no image and used summary.
- Captured the actual .print-sheet region on each public form with ?blank=1 using the AM02 Chrome browser. No company, customer, transaction, or personal data was entered. All inputs were empty.
- Preview files are the full unaltered JPEG screenshots, retaining both copies and the paper orientation. They are not AI-generated depictions.
- GitHub comparison before implementation: https://github.com/whitep4nth3r/puppeteer-demo (MIT; Node 12 / Puppeteer 7 / chrome-aws-lambda; latest inspected commit 13b0c9bc1cf7f762e52937d9bd6afdcd3ee06d21 dated 2021-07-25). Its old runtime and dependency stack are not needed here. Reused the site's current HTML/CSS forms and existing Hugo templates, with no new production dependencies or third-party code copied.

## Changes
- Added whole-form linked thumbnails, meaningful alt text, explicit intrinsic dimensions, lazy loading, and captions identifying A4 direction, copy arrangement, and item rows.
- The desktop list uses three columns at 1100px and above, two at tablet widths and one below 760px. Images use contain and keep their full aspect ratios.
- Created separate 1200 x 630 JPEG social cards from each screenshot with the form name and print layout. A simple local HTML composition was rendered in Chrome; the underlying form itself was not redrawn.
- Each form has its own absolute HTTPS og:image and secure_url, JPEG MIME, width/height, image alt, and matching Twitter summary_large_image metadata.
- Existing hero image and tools-list social image retained. No form calculation, mirroring, storage, validation, or print implementation changed.

## Local verification
- Hugo extended 0.168.0: 257 pages and 239 static assets, build passed.
- Extended tests/forms-dom.cjs: 182 assertions passed, including each page's OG/Twitter metadata, real JPEG signatures, thumbnail semantics and links, plus all prior form logic/schema/feed assertions.
- tests/indexnow-response.cjs: 6 mock response tests passed; this is not an IndexNow submission receipt.
- node syntax check, Python browser-test syntax compilation, and git diff --check passed.
- Real Chrome checks at 1440, 768, 390 and 320 pixels: no document overflow; all three images decoded, stayed within their containers, and preserved aspect ratio. All three screenshot originals and social images were visually inspected.
- Checked thumbnail navigation to the portrait form and browser Back.
- Local HTTP 200, image/jpeg, decoded dimensions and byte equality verified for all six images.
- Full browser/PDF regression will run in the existing GitHub Actions workflow on the resulting commit. Local Python Playwright is not installed; the local UI inspection above used the connected browser.

## Asset manifest
- manual-invoice-og.jpg: 1200 x 630, 73139 bytes, SHA-256 3ced2104dfadb754005bffd350946f4ce19e5564e559f4cf4dc76f59c58e0ea0.
- manual-invoice-preview.jpg: 1123 x 790, 92514 bytes, SHA-256 e9b04a178931b8f5c94880beb9e46d47294703b427b05abf1fdd90e5a733c9a8.
- manual-invoice-vertical-og.jpg: 1200 x 630, 57225 bytes, SHA-256 added6f96e008691ac07d3bcda614c0811f50c9d4adf11820aa491216072ba50.
- manual-invoice-vertical-preview.jpg: 794 x 1119, 111135 bytes, SHA-256 1a095a8abe1f68755e6a39faf2a2096f04d0a2d0bcfce59821e94b477adc82ab.
- simple-receipt-og.jpg: 1200 x 630, 47077 bytes, SHA-256 6655d40a58034b7291665ced96301e7e51525b2e6c0a919d7c64e47e5c3bbf74.
- simple-receipt-preview.jpg: 794 x 1119, 81662 bytes, SHA-256 422b7d5b942afcfecd21a772b329ccb91ee95a11dc4291176377f2fc54271bdd.

## Publication verification boundary
Remote commit, exact-SHA CI results, public HTTP responses and deployed screen must be checked after push. Social-network cache refresh and third-party share dialogs are not implied by correct deployed metadata.
