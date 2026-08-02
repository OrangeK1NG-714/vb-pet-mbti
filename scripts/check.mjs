import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAssets } from "./generate-assets.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const requireCheck = (condition, message) => { if (!condition) errors.push(message); };
const read = (file) => readFile(resolve(ROOT, file), "utf8");

await generateAssets();

for (const file of ["analytics.js", "app.js", "core.js", "quiz-controller.js", "share-card.js", "site-config.js"]) {
  try {
    execFileSync(process.execPath, ["--check", resolve(ROOT, file)], { stdio: "pipe" });
  } catch (error) {
    errors.push(`${file} 语法检查失败：${error.stderr?.toString().trim() || error.message}`);
  }
}

const html = await read("index.html");
const css = await read("styles.css");
const app = await read("app.js");
const config = await read("site-config.js");
requireCheck(html.includes('aria-live="polite"'), "入口缺少 aria-live 状态通知");
requireCheck(css.includes(":focus-visible"), "缺少键盘焦点样式");
requireCheck(css.includes("prefers-reduced-motion: reduce"), "缺少 reduced-motion 适配");
requireCheck(app.includes('aria-label="返回上一题"'), "返回按钮缺少可访问名");
requireCheck(app.includes('role="dialog"'), "弹层缺少 dialog 语义");
requireCheck(!/加微信\s*petmbti|example\.com/i.test(`${app}\n${config}`), "发现伪造网址或联系方式占位");

const manifest = JSON.parse(await read("manifest.webmanifest"));
requireCheck(manifest.name === "宠物 MBTI", "manifest 名称不正确");
requireCheck(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "manifest 图标声明不完整");

async function pngSize(file, expectedWidth, expectedHeight) {
  const buffer = await readFile(resolve(ROOT, file));
  requireCheck(buffer.subarray(1, 4).toString() === "PNG", `${file} 不是 PNG`);
  requireCheck(buffer.readUInt32BE(16) === expectedWidth && buffer.readUInt32BE(20) === expectedHeight, `${file} 尺寸不正确`);
  requireCheck((await stat(resolve(ROOT, file))).size > 100, `${file} 内容异常`);
}

await pngSize("assets/share-cover.png", 1200, 630);
await pngSize("assets/favicon.png", 192, 192);
await pngSize("assets/app-icon-512.png", 512, 512);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else console.log("Static checks passed: syntax, metadata, accessibility, configuration and PNG assets.");
