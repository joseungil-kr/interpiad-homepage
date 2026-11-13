# Third-party code and licenses

This static tool runs all PDF processing in the user's browser. Vendor assets
are served from the same origin with no runtime CDN.

- pdf-lib v1.17.1: MIT, copyright Andrew Dillon and contributors,
  https://github.com/Hopding/pdf-lib
- PDF Compressor Web modules (utils.js, analyzer.js, image-compress.js):
  MIT, copyright 2026 J.G.Moore,
  https://github.com/JGM-89/pdf-compressor-web
  Full MIT license in static/tools/pdf-compress/vendor/LICENSE-JGM-MIT.txt

Source Git blob SHA read-back:
pdf-lib.min.js edb12c72cdaa11b608eb5967cf1531892b7f3b31
utils.js 99293b87afec71f750425b5df1f852673dc471d0
analyzer.js 471acc839d222e171eef1e524bd21ec1503adcdc
image-compress.js d1a0923a92bf258071ac893b4c5f5e128a38f57a

No Ghostscript, qpdf WASM, remote upload, database or PDF transmission.
The compressor may re-encode image XObjects and remove PDF metadata.
Encrypted, digitally signed, long-term archival (PDF/A), and specialty PDFs
require additional verification. It does not guarantee any particular ratio.
