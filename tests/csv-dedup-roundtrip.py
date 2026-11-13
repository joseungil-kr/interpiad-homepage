"""CSV/XLSX -> deduplicate -> downloaded CSV round-trip regression.

Scope: synthetic fixtures only. Runs the real Chromium UI and parses downloaded
files with Python's standard csv module. It does NOT run Microsoft Excel and
therefore cannot certify how Excel itself handles apostrophe-prefixed CSV text.

Invariants:
* -12.5, -0.01, 0.01, -0, 00123 remain byte-for-byte cell text.
* =1+2, +SUM(A1:A2), @SUM(A1:A2), -상품A are prefixed with a
  literal apostrophe in output CSV (and not evaluated by this webapp).
* Embedded comma, double quote, and newline survive CSV re-parsing.
* Only identical full rows are removed; distinct rows sharing keys survive.
* The same expectations hold for CSV and XLSX first-sheet imports.
"""
import csv
import io
import json
import os
import pathlib
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from playwright.sync_api import sync_playwright

BASE = os.getenv("PDF_COMPRESS_BASE", "http://127.0.0.1:8765").rstrip("/")
OUT = pathlib.Path(os.getenv("PDF_COMPRESS_TEST_OUT", "/tmp/interpiad-pdf-compress-test"))
OUT.mkdir(parents=True, exist_ok=True)

HEADER = ["종류", "값", "설명"]
UNIQUE = [
    ["neg-12.5", "-12.5", "음수 소수"],
    ["neg-0.01", "-0.01", "미세 음수"],
    ["pos-0.01", "0.01", "미세 양수"],
    ["negative-zero", "-0", "문자 원형 보존"],
    ["leading-zero", "00123", "앞자리 0 보존"],
    ["equals-text", "=1+2", "수식형 텍스트"],
    ["plus-text", "+SUM(A1:A2)", "수식형 텍스트"],
    ["at-text", "@SUM(A1:A2)", "수식형 텍스트"],
    ["minus-text", "-상품A", "숫자 아닌 마이너스"],
    ["comma", "서울,경기", "쉼표, 유지"],
    ["quote", '상품 "A"', '큰따옴표 "유지"'],
    ["newline", "첫째 줄\n둘째 줄", "메모 1\n메모 2"],
    ["unique-key", "같은 코드", "거래처 A"],
    ["unique-key", "같은 코드", "거래처 B"],
]
INPUT = [HEADER] + UNIQUE + [
    list(UNIQUE[0]),
    list(UNIQUE[5]),
    list(UNIQUE[12]),
]
FORMULA_LIKE = {"=1+2", "+SUM(A1:A2)", "@SUM(A1:A2)", "-상품A"}
EXPECTED = [HEADER] + [
    [v if col != 1 or v not in FORMULA_LIKE else "'" + v for col, v in enumerate(row)]
    for row in UNIQUE
]
NUMERIC = ["-12.5", "-0.01", "0.01", "-0", "00123"]
REPORT = {"source": "Chromium browser UI", "excel_native_execution": "not_run",
          "input_data_rows": len(INPUT) - 1, "expected_unique_rows": len(UNIQUE),
          "expected_removed_rows": (len(INPUT) - 1) - len(UNIQUE),
          "formats": {}, "checks": []}

def verify(condition, label, details=None):
    entry = {"check": label, "pass": bool(condition)}
    if details is not None:
        entry["details"] = details
    REPORT["checks"].append(entry)
    print("CSV_REGRESSION " + json.dumps(entry, ensure_ascii=False))
    if not condition:
        raise AssertionError(label + ": " + repr(details))

def make_csv(rows):
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, lineterminator="\r\n")
    writer.writerows(rows)
    return ("\ufeff" + stream.getvalue()).encode("utf-8")

def validate_xlsx_structure(binary):
    with zipfile.ZipFile(io.BytesIO(binary)) as z:
        required = {"[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
                    "xl/_rels/workbook.xml.rels", "xl/worksheets/sheet1.xml",
                    "xl/sharedStrings.xml"}
        verify(required.issubset(set(z.namelist())), "xlsx:required-ooxml-parts")
        verify(z.testzip() is None, "xlsx:valid-zip-crc")
        roots = {p: ET.fromstring(z.read(p)) for p in required if p.endswith(".xml") or p.endswith(".rels")}
        verify(all(root is not None for root in roots.values()), "xlsx:xml-wellformed")
        sheet = roots["xl/worksheets/sheet1.xml"]
        ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
        verify(not sheet.findall(".//" + ns + "f"), "xlsx:formula-like-inputs-not-formula-cells")
        verify(len(sheet.findall(".//" + ns + "row")) == len(INPUT), "xlsx:row-count")

def make_xlsx_in_browser(page, rows):
    # JSZip is the exact vendored library used by the real utility page.
    result = page.evaluate("""async rows => {
      if(typeof JSZip!=='function')throw Error('Vendored JSZip not loaded');
      const zip=new JSZip();
      const MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
      const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
      const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
      const escapeXML=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
      const shared=['00123','-상품A']; // text-like numeric + formula-like text, sharedStrings path
      const numeric=new Set(['neg-12.5','neg-0.01','pos-0.01','negative-zero']);
      const cells=(row,ri)=>row.map((v,ci)=>{
        const addr=String.fromCharCode(65+ci)+(ri+1);
        if(ri>0 && ci===1 && numeric.has(row[0]))
          return '<c r="'+addr+'" t="n"><v>'+escapeXML(v)+'</v></c>';
        if(ci===1 && shared.includes(v))
          return '<c r="'+addr+'" t="s"><v>'+shared.indexOf(v)+'</v></c>';
        return '<c r="'+addr+'" t="inlineStr"><is><t xml:space="preserve">'+
          escapeXML(v)+'</t></is></c>';
      }).join('');
      const sheet='<worksheet xmlns="'+MAIN+'"><sheetData>'+
        rows.map((row,i)=>'<row r="'+(i+1)+'">'+cells(row,i)+'</row>').join('')+
        '</sheetData></worksheet>';
      const strings='<sst xmlns="'+MAIN+'" count="2" uniqueCount="2">'+
        shared.map(v=>'<si><t xml:space="preserve">'+escapeXML(v)+'</t></si>').join('')+
        '</sst>';
      zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?>'+
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
        '<Default Extension="xml" ContentType="application/xml"/>'+
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'+
        '</Types>');
      zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?>'+
        '<Relationships xmlns="'+PKG+'"><Relationship Id="rId1" '+
        'Type="'+REL+'/officeDocument" Target="xl/workbook.xml"/></Relationships>');
      zip.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?>'+
        '<workbook xmlns="'+MAIN+'" xmlns:r="'+REL+'"><sheets>'+
        '<sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
      zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?>'+
        '<Relationships xmlns="'+PKG+'">'+
        '<Relationship Id="rId1" Type="'+REL+'/worksheet" Target="worksheets/sheet1.xml"/>'+
        '<Relationship Id="rId2" Type="'+REL+'/sharedStrings" Target="sharedStrings.xml"/>'+
        '</Relationships>');
      zip.file('xl/worksheets/sheet1.xml','<?xml version="1.0" encoding="UTF-8"?>'+sheet);
      zip.file('xl/sharedStrings.xml','<?xml version="1.0" encoding="UTF-8"?>'+strings);
      const encoded=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
      return Array.from(encoded);
    }""", rows)
    return bytes(result)

def assert_roundtrip(source, saved):
    verify(saved[:3] == b"\xef\xbb\xbf", source + ":utf8-bom")
    text = saved.decode("utf-8-sig")
    parsed = list(csv.reader(io.StringIO(text, newline="")))
    verify(parsed == EXPECTED, source + ":exact-parsed-matrix",
           {"expected_rows": len(EXPECTED), "actual_rows": len(parsed),
            "first_mismatch": next(({"at": i, "expected": EXPECTED[i], "actual": parsed[i]}
                for i in range(min(len(EXPECTED), len(parsed))) if EXPECTED[i] != parsed[i]), None)})
    actual_values = [r[1] for r in parsed[1:]]
    verify(actual_values[:5] == NUMERIC, source + ":numeric-literals-preserved",
           actual_values[:5])
    for formula in sorted(FORMULA_LIKE):
        verify(actual_values.count("'" + formula) == 1,
               source + ":dangerous-prefix-as-literal:" + formula)
        verify(formula not in actual_values, source + ":no-unescaped-formula:" + formula)
    verify('"서울,경기"' in text, source + ":comma-quoted")
    verify('상품 ""A""' in text, source + ":doublequote-escaped")
    verify('"첫째 줄\n둘째 줄"' in text, source + ":embedded-newline-quoted")
    verify(Counter(tuple(x) for x in parsed[1:]) == Counter(tuple(x) for x in EXPECTED[1:]),
           source + ":only-identical-rows-removed")
    verify([r for r in parsed if r[0] == "unique-key"] ==
           [["unique-key", "같은 코드", "거래처 A"],
            ["unique-key", "같은 코드", "거래처 B"]],
           source + ":nonduplicate-same-key-preserved")
    return parsed

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(accept_downloads=True, viewport={"width": 390, "height": 850})
        page = context.new_page()
        for format_name in ("csv", "xlsx"):
            url = BASE + "/tools/apps/duplicates/"
            response = page.goto(url, wait_until="domcontentloaded")
            verify(response is not None and response.status == 200, format_name + ":page-http-200")
            page.locator("#run").wait_for()
            if format_name == "csv":
                input_bytes = make_csv(INPUT)
            else:
                input_bytes = make_xlsx_in_browser(page, INPUT)
                validate_xlsx_structure(input_bytes)
            original_path = OUT / ("csv-regression-input." + format_name)
            original_path.write_bytes(input_bytes)
            page.locator("#table-file").set_input_files({
                "name": original_path.name,
                "mimeType": "text/csv" if format_name == "csv" else
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "buffer": input_bytes
            })
            verify(page.locator("#has-header").is_checked(), format_name + ":header-protected")
            with page.expect_download(timeout=20000) as dl:
                page.locator("#run").click()
            download = dl.value
            target = OUT / ("csv-regression-output-from-" + format_name + ".csv")
            download.save_as(target)
            status = page.locator("#status").inner_text()
            verify(f"{REPORT['expected_removed_rows']}개 중복행 제거" in status,
                   format_name + ":reported-dedup-count", status)
            parsed = assert_roundtrip(format_name, target.read_bytes())
            REPORT["formats"][format_name] = {
                "source_bytes": len(input_bytes), "download_bytes": target.stat().st_size,
                "input_rows": len(INPUT), "output_rows": len(parsed),
                "expected_rows": len(EXPECTED), "app_feedback": status,
                "input_artifact": str(original_path), "output_artifact": str(target)
            }
        context.close()
        browser.close()
finally:
    REPORT["passed"] = sum(x["pass"] for x in REPORT["checks"])
    REPORT["failed"] = len(REPORT["checks"]) - REPORT["passed"]
    (OUT / "csv-regression-roundtrip.json").write_text(
        json.dumps(REPORT, ensure_ascii=False, indent=2), encoding="utf-8")
    print("CSV_REGRESSION_SUMMARY " + json.dumps({
        "passed": REPORT["passed"], "failed": REPORT["failed"],
        "formats": REPORT["formats"], "excel_native_execution": REPORT["excel_native_execution"]
    }, ensure_ascii=False))
