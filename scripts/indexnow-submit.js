#!/usr/bin/env node
// hugo 빌드 후 public/sitemap.xml에 있는 URL을 IndexNow(Bing/Naver/Yandex 등)에 제출한다.
// 사용법:
//   node scripts/indexnow-submit.js                → sitemap.xml 전체 URL 제출
//   node scripts/indexnow-submit.js https://interpiad.com/some-page/  → 특정 URL만 제출

const fs = require("fs");
const path = require("path");
const https = require("https");

const HOST = "interpiad.com";
const KEY = "250684e3381ced01470a8edaf4b1fc19";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_PATH = path.join(__dirname, "..", "public", "sitemap.xml");

function getUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error(`sitemap.xml을 찾을 수 없습니다: ${SITEMAP_PATH}`);
    console.error("먼저 `hugo`를 실행해 public/ 디렉토리를 생성하세요.");
    process.exit(1);
  }
  const xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return matches;
}

function submit(urlList) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  });

  const req = https.request(
    {
      hostname: "api.indexnow.org",
      path: "/indexnow",
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`IndexNow 응답: ${res.statusCode}`);
        if (data) console.log(data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`제출 완료 (${urlList.length}개 URL):`);
          urlList.forEach((u) => console.log(`  - ${u}`));
        }
      });
    }
  );

  req.on("error", (err) => {
    console.error("IndexNow 제출 실패:", err.message);
    process.exit(1);
  });

  req.write(body);
  req.end();
}

const argUrls = process.argv.slice(2);
const urlList = argUrls.length > 0 ? argUrls : getUrlsFromSitemap();

if (urlList.length === 0) {
  console.error("제출할 URL이 없습니다.");
  process.exit(1);
}

submit(urlList);
