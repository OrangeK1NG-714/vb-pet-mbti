const assert = require("node:assert/strict");
const test = require("node:test");

const { createAnalytics } = require("../analytics.js");

test("未配置统计端点时静默 no-op", async () => {
  let calls = 0;
  const analytics = createAnalytics({}, { fetch: async () => { calls += 1; } });
  assert.equal(await analytics.track("start"), false);
  assert.equal(calls, 0);
});

test("尊重 Do Not Track，不发送任何事件", async () => {
  let calls = 0;
  const analytics = createAnalytics(
    { endpoint: "/events", siteId: "pet-mbti" },
    { doNotTrack: "1", fetch: async () => { calls += 1; } }
  );
  assert.equal(await analytics.track("complete"), false);
  assert.equal(calls, 0);
});

test("仅发送白名单事件和去标识化属性", async () => {
  const requests = [];
  const analytics = createAnalytics(
    { endpoint: "/events", siteId: "pet-mbti" },
    { fetch: async (url, options) => { requests.push({ url, options }); return { ok: true }; } }
  );

  assert.equal(await analytics.track("unknown"), false);
  assert.equal(await analytics.track("share", { code: "INTJ", contact: "secret", egg: false }), true);
  assert.equal(requests.length, 1);
  const body = JSON.parse(requests[0].options.body);
  assert.deepEqual(body.properties, { code: "INTJ", egg: false });
  assert.equal(body.event, "share");
  assert.equal(body.siteId, "pet-mbti");
  assert.equal("contact" in body.properties, false);
});

test("上报包含匿名 anonId 与 project，用于看板去重人数", async () => {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v)
  };
  const requests = [];
  const env = {
    localStorage,
    randomId: () => "fixed-anon-1",
    fetch: async (url, options) => { requests.push(options); return { ok: true }; }
  };
  const analytics = createAnalytics({ endpoint: "/events", siteId: "pet-mbti" }, env);

  await analytics.track("start");
  await analytics.track("complete");
  assert.equal(requests.length, 2);
  const first = JSON.parse(requests[0].body);
  const second = JSON.parse(requests[1].body);
  assert.equal(first.anonId, "fixed-anon-1");
  assert.equal(first.project, "pet-mbti");
  assert.equal(second.anonId, first.anonId, "同一浏览器复用同一匿名 id");
});
