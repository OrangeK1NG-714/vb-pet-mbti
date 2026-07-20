const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("入口按配置、核心、统计、分享、DOM 应用的顺序加载", () => {
  const html = read("index.html");
  const scripts = ["site-config.js", "core.js", "analytics.js", "share-card.js", "app.js"];
  let previous = -1;
  for (const script of scripts) {
    const current = html.indexOf(`src="${script}"`);
    assert.ok(current > previous, `${script} 缺失或顺序错误`);
    previous = current;
  }
  assert.doesNotMatch(html, /<script>(?:.|\n)*QUESTIONS/);
});

test("具备可发布的 SEO、分享、PWA 和结构化数据声明", () => {
  const html = read("index.html");
  assert.match(html, /<title>[^<]*宠物 MBTI[^<]*<\/title>/);
  assert.match(html, /name="description" content="[^"]+"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:image" content="assets\/share-cover\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="icon" href="assets\/favicon\.png"/);
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /application\/ld\+json/);

  for (const file of ["manifest.webmanifest", "robots.txt", "404.html", "assets/share-cover.png", "assets/favicon.png"]) {
    assert.ok(fs.statSync(path.join(ROOT, file)).size > 0, `${file} 缺失或为空`);
  }
});

test("真实配置缺失时不伪造联系方式或网址", () => {
  const config = require("../site-config.js");
  assert.equal(config.releaseStage, "test");
  assert.equal(config.canonicalUrl, "");
  assert.equal(config.contact.wechat, "");
  assert.equal(config.contact.email, "");
  assert.doesNotMatch(read("app.js"), /加微信\s*petmbti|example\.com/i);
});

test("关键操作有可访问名、焦点样式和减少动态效果", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const app = read("app.js");
  assert.match(html, /<main id="app"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(app, /aria-label="返回上一题"/);
  assert.match(app, /role="dialog"/);
  assert.match(app, /邀请朋友也来测/);
});

test("分享 PNG 固定为 1080×1440 并包含四维信息", () => {
  const share = require("../share-card.js");
  assert.deepEqual(share.CARD_SIZE, { width: 1080, height: 1440 });
  const source = read("share-card.js");
  assert.match(source, /dimension/);
  assert.match(source, /toDataURL\("image\/png"\)/);
});
