import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAssets } from "./generate-assets.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const SOURCE_FILES = [
  "_headers",
  "404.html",
  "analytics.js",
  "app.js",
  "assets/app-icon-512.png",
  "assets/favicon.png",
  "assets/share-cover.png",
  "core.js",
  "index.html",
  "manifest.webmanifest",
  "quiz-controller.js",
  "robots.txt",
  "share-card.js",
  "site-config.js",
  "styles.css"
].sort();

await generateAssets();
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

const manifest = {};
for (const file of SOURCE_FILES) {
  const source = resolve(ROOT, file);
  const target = resolve(DIST, file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  manifest[file] = createHash("sha256").update(await readFile(source)).digest("hex");
}

await writeFile(resolve(DIST, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${SOURCE_FILES.length} files into dist/`);
