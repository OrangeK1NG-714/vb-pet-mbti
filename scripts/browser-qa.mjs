import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.QA_URL || "http://127.0.0.1:4183";
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const debugPort = 9323;
const output = await mkdtemp(join(tmpdir(), "pet-mbti-qa-"));
const profile = join(output, "profile");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const previewProcess = process.env.QA_URL
  ? null
  : spawn(process.execPath, [resolve(root, "scripts/serve.mjs"), "--port", "4183"], {
      cwd: root,
      stdio: "ignore"
    });
const processRef = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_error) {
      // The preview server is still starting.
    }
    await sleep(100);
  }
  throw new Error(`无法连接预览站点：${url}`);
}

async function findPageTarget() {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch (_error) {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error("无法连接无头 Chrome");
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) || []) listener(message.params);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  once(method) {
    return new Promise((resolve) => {
      const listener = (params) => {
        this.listeners.set(method, (this.listeners.get(method) || []).filter((item) => item !== listener));
        resolve(params);
      };
      this.listeners.set(method, [...(this.listeners.get(method) || []), listener]);
    });
  }

  on(method, listener) {
    this.listeners.set(method, [...(this.listeners.get(method) || []), listener]);
  }
}

let socket;
try {
  await waitForPreview();
  const endpoint = await findPageTarget();
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const cdp = new CdpClient(socket);
  const consoleErrors = [];
  const networkFailures = [];
  await Promise.all([
    cdp.send("Page.enable"),
    cdp.send("Runtime.enable"),
    cdp.send("Network.enable"),
    cdp.send("Log.enable")
  ]);
  cdp.on("Runtime.consoleAPICalled", (event) => { if (event.type === "error") consoleErrors.push("console.error"); });
  cdp.on("Log.entryAdded", (event) => { if (event.entry.level === "error") consoleErrors.push(event.entry.text); });
  cdp.on("Network.loadingFailed", (event) => networkFailures.push(event.errorText));
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  // QA runs must never send real analytics to the production collector (it
  // would pollute the live dashboard and fails CORS from 127.0.0.1 anyway).
  // analytics.js honors Do Not Track, so force it on for every page load.
  // Stub native sharing as well so the live share target can be asserted
  // without opening an operating-system share sheet.
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (payload) => { window.__sharePayload = payload; }
      });
    `
  });

  const evaluate = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async () => {
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url });
    await loaded;
    await sleep(80);
  };
  const viewport = (width, height, mobile) => cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  const screenshot = async (name) => {
    const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = join(output, name);
    await writeFile(file, Buffer.from(capture.data, "base64"));
    return file;
  };

  const screenshots = [];
  for (const size of [
    { width: 375, height: 812, mobile: true, name: "cover-mobile.png" },
    { width: 768, height: 1024, mobile: false, name: "cover-tablet.png" },
    { width: 1440, height: 900, mobile: false, name: "cover-desktop.png" }
  ]) {
    await viewport(size.width, size.height, size.mobile);
    await navigate();
    const overflow = await evaluate("document.documentElement.scrollWidth > window.innerWidth");
    if (overflow) throw new Error(`${size.width}px 首页出现横向溢出`);
    screenshots.push(await screenshot(size.name));
  }

  await viewport(375, 812, true);
  await navigate();
  await evaluate("document.querySelector('[data-breed=\"ragdoll\"]').click()");
  await sleep(40);
  const breedState = await evaluate(`(() => ({
    hint: Boolean(document.querySelector('.breed-hint')),
    focusedBreed: document.activeElement?.dataset?.breed
  }))()`);
  if (!breedState.hint) throw new Error("选择品种后未显示民间预判提示");
  if (breedState.focusedBreed !== "ragdoll") {
    throw new Error(`品种选择后焦点丢失：${JSON.stringify(breedState)}`);
  }
  await evaluate("document.querySelector('#start').click()");
  await sleep(20);
  const firstQuestionProgress = await evaluate(`(() => {
    const progress = document.querySelector('[role="progressbar"]');
    return {
      now: progress?.getAttribute('aria-valuenow'),
      text: progress?.getAttribute('aria-valuetext'),
      width: document.querySelector('.progress-bar')?.style.width
    };
  })()`);
  if (
    firstQuestionProgress.now !== "1" ||
    firstQuestionProgress.text !== "第 1 题，共 16 题" ||
    firstQuestionProgress.width !== "6%"
  ) {
    throw new Error(`首题进度异常：${JSON.stringify(firstQuestionProgress)}`);
  }
  screenshots.push(await screenshot("quiz-mobile.png"));
  await evaluate("document.querySelector('#back').click()");
  await sleep(20);
  const coverFocus = await evaluate("document.activeElement?.id");
  if (coverFocus !== "cover-title") throw new Error(`返回首页后焦点异常：${coverFocus}`);
  await evaluate("document.querySelector('#start').click()");
  await evaluate(`
    document.querySelector('[data-answer]').click();
    document.querySelector('#back').click();
  `);
  await sleep(40);
  const staleAdvanceTarget = await evaluate("document.querySelector('#cover-title')?.id || document.querySelector('#question-title')?.textContent");
  if (staleAdvanceTarget !== "cover-title") {
    throw new Error(`返回首页后旧答题定时器仍推进状态：${staleAdvanceTarget}`);
  }
  await evaluate("document.querySelector('#start').click()");
  for (let index = 0; index < 16; index += 1) {
    await sleep(25);
    const clicked = await evaluate("(() => { const button = document.querySelector('[data-answer]'); if (!button) return false; button.click(); return true; })()");
    if (!clicked) throw new Error(`第 ${index + 1} 题无法点击`);
  }
  await sleep(80);
  const result = await evaluate(`(() => ({
    title: document.querySelector('#result-title')?.textContent,
    dimensions: document.querySelectorAll('.dim').length,
    overflow: document.documentElement.scrollWidth > window.innerWidth
  }))()`);
  if (!result.title || result.dimensions !== 4 || result.overflow) throw new Error(`结果页异常：${JSON.stringify(result)}`);
  const breedVerdict = await evaluate("Boolean(document.querySelector('.breed-verdict'))");
  if (!breedVerdict) throw new Error("选择品种后结果页缺少预判对照文案");
  screenshots.push(await screenshot("result-mobile.png"));

  const tree = await cdp.send("Accessibility.getFullAXTree");
  const unnamedButtons = tree.nodes.filter((node) => node.role?.value === "button" && !node.name?.value);
  if (unnamedButtons.length) throw new Error(`发现 ${unnamedButtons.length} 个无可访问名按钮`);

  await evaluate(`
    window.__createShareCard = window.PetMbtiShareCard.createShareCard;
    window.PetMbtiShareCard.createShareCard = () => { throw new Error('canvas unavailable'); };
    document.querySelector('#save').click();
  `);
  await sleep(20);
  const cardError = await evaluate("document.querySelector('[role=\"dialog\"] h2')?.textContent");
  if (cardError !== "分享卡生成失败") throw new Error(`分享卡异常未被降级处理：${cardError}`);
  await evaluate(`
    document.querySelector('[data-close]').click();
    window.PetMbtiShareCard.createShareCard = window.__createShareCard;
  `);
  await evaluate("document.querySelector('#save').click()");
  await sleep(350);
  const card = await evaluate(`(() => {
    const image = document.querySelector('.card-img');
    return { width: image?.naturalWidth, height: image?.naturalHeight, dialog: Boolean(document.querySelector('[role="dialog"]')) };
  })()`);
  if (card.width !== 1080 || card.height !== 1440 || !card.dialog) throw new Error(`分享卡异常：${JSON.stringify(card)}`);
  await evaluate("document.querySelector('[data-close]').click()");
  await evaluate("document.querySelector('#invite').click()");
  await sleep(20);
  const sharePayload = await evaluate("window.__sharePayload");
  if (sharePayload?.url !== "https://pet.richardq.tech/") {
    throw new Error(`线上分享地址异常：${JSON.stringify(sharePayload)}`);
  }
  await evaluate(`
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { throw new Error('native share unavailable'); }
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => { window.__clipboardValue = value; } }
    });
    document.querySelector('#invite').click();
  `);
  await sleep(20);
  const clipboardFallback = await evaluate(`(() => ({
    value: window.__clipboardValue,
    copied: document.querySelector('[role="dialog"] h2')?.textContent
  }))()`);
  if (
    clipboardFallback.value !== "https://pet.richardq.tech/" ||
    clipboardFallback.copied !== "链接已复制"
  ) {
    throw new Error(`原生分享失败后未降级到剪贴板：${JSON.stringify(clipboardFallback)}`);
  }
  await evaluate("document.querySelector('[data-close]').click()");
  await evaluate(`
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('clipboard unavailable'); } }
    });
    document.querySelector('#invite').click();
  `);
  await sleep(20);
  const fallbackUrl = await evaluate("document.querySelector('.share-url')?.textContent");
  if (fallbackUrl !== "https://pet.richardq.tech/") {
    throw new Error(`分享降级地址异常：${JSON.stringify(fallbackUrl)}`);
  }

  if (consoleErrors.length || networkFailures.length) {
    throw new Error(`浏览器错误：${JSON.stringify({ consoleErrors, networkFailures })}`);
  }
  console.log(JSON.stringify({ verdict: "PASS", url, screenshots, resultTitle: result.title, shareCard: card }, null, 2));
} finally {
  socket?.close();
  const children = [processRef, previewProcess].filter(Boolean);
  for (const child of children) child.kill("SIGTERM");
  await Promise.all(children.map((child) => (
    child.exitCode === null
      ? Promise.race([once(child, "exit"), sleep(3000)])
      : Promise.resolve()
  )));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
