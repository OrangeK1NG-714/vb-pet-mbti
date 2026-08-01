"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const PRODUCTION_URL = "https://pet.richardq.tech/";
const RUNTIME_SCRIPTS = [
  "site-config.js",
  "core.js",
  "quiz-controller.js",
  "analytics.js",
  "share-card.js",
  "app.js"
];

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) || [];
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map((match) => [match[1], match[2]])
  );
}

function metaContent(html, property) {
  const tag = tags(html, "meta")
    .map(attributes)
    .find((attrs) => attrs.property === property || attrs.name === property);
  assert.ok(tag, `missing metadata ${property}`);
  return tag.content;
}

function buildSourceFiles() {
  const source = read("scripts/build.mjs");
  const match = source.match(/const SOURCE_FILES\s*=\s*(\[[\s\S]*?\])\.sort\(\);/);
  assert.ok(match, "scripts/build.mjs must declare a literal SOURCE_FILES list");
  return JSON.parse(match[1]);
}

test("live site config owns the canonical production URL used by HTML metadata", () => {
  const config = require("../site-config.js");
  const html = read("index.html");
  const canonical = tags(html, "link")
    .map(attributes)
    .find((attrs) => attrs.rel === "canonical");
  const structuredDataMatch = html.match(
    /<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
  );

  assert.equal(config.releaseStage, "live");
  assert.equal(config.canonicalUrl, PRODUCTION_URL);
  assert.equal(new URL(config.canonicalUrl).protocol, "https:");
  assert.ok(canonical, "missing canonical link");
  assert.equal(canonical.href, config.canonicalUrl);
  assert.equal(metaContent(html, "og:url"), config.canonicalUrl);
  assert.ok(structuredDataMatch, "missing JSON-LD document");
  assert.equal(JSON.parse(structuredDataMatch[1]).url, config.canonicalUrl);

  const ogImage = new URL(metaContent(html, "og:image"));
  assert.equal(ogImage.origin, new URL(config.canonicalUrl).origin);
  assert.equal(ogImage.pathname, "/assets/share-cover.png");
});

test("HTML runtime script order is complete in the build source manifest", () => {
  const htmlScripts = tags(read("index.html"), "script")
    .map(attributes)
    .filter((attrs) => attrs.src)
    .map((attrs) => attrs.src);
  const sourceFiles = buildSourceFiles();

  assert.deepEqual(htmlScripts, RUNTIME_SCRIPTS);
  assert.equal(new Set(sourceFiles).size, sourceFiles.length, "SOURCE_FILES contains duplicates");
  assert.ok(sourceFiles.includes("index.html"), "build omits index.html");
  for (const script of htmlScripts) {
    assert.ok(sourceFiles.includes(script), `build omits runtime script ${script}`);
  }
});
