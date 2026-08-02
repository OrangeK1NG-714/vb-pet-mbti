"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { createQuizController } = require("../quiz-controller.js");

test("controller 保持零运行时依赖且不触碰 DOM 或浏览器能力", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../quiz-controller.js"), "utf8");
  assert.doesNotMatch(source, /\brequire\s*\(|\bimport\s+/);
  assert.doesNotMatch(source, /\b(?:window|document|HTMLElement|navigator|fetch|localStorage|sessionStorage)\b/);
});

function createTimerHarness() {
  let nextId = 1;
  const callbacks = new Map();
  const cancelled = new Set();
  return {
    schedule(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id) {
      cancelled.add(id);
    },
    latestId() {
      return nextId - 1;
    },
    fire(id) {
      callbacks.get(id)?.();
    },
    wasCancelled(id) {
      return cancelled.has(id);
    }
  };
}

function setup(questionCount = 2) {
  const timers = createTimerHarness();
  const controller = createQuizController({
    questionCount,
    schedule: timers.schedule,
    cancel: timers.cancel
  });
  return { controller, timers };
}

test("宠物与品种选择由 controller 持有，切换宠物会清掉旧品种", () => {
  const { controller } = setup();

  assert.deepEqual(controller.getState(), {
    screen: "cover",
    petType: "cat",
    breedKey: null,
    answers: [],
    currentQuestion: 0,
    hasPendingAdvance: false
  });
  assert.equal(controller.toggleBreed("ragdoll").breedKey, "ragdoll");
  assert.equal(controller.toggleBreed("ragdoll").breedKey, null);
  controller.toggleBreed("british-shorthair");
  assert.deepEqual(
    { petType: controller.selectPet("dog").petType, breedKey: controller.getState().breedKey },
    { petType: "dog", breedKey: null }
  );
});

test("开始、答题推进与完成结果通过纯状态迁移完成", () => {
  const { controller, timers } = setup(2);
  const events = [];

  assert.equal(controller.start().screen, "quiz");
  assert.equal(controller.answer("E", { delay: 160, onAdvance: (event) => events.push(event.kind) }), true);
  assert.equal(controller.answer("I"), false, "等待推进时必须拒绝重复答题");
  assert.deepEqual(controller.getState().answers, ["E"]);
  assert.equal(controller.getState().hasPendingAdvance, true);

  timers.fire(timers.latestId());
  assert.deepEqual(events, ["question"]);
  assert.equal(controller.getState().currentQuestion, 1);
  assert.equal(controller.answer("S", { onAdvance: (event) => events.push(event.kind) }), true);
  timers.fire(timers.latestId());

  assert.deepEqual(events, ["question", "result"]);
  assert.equal(controller.getState().screen, "result");
  assert.deepEqual(controller.getState().answers, ["E", "S"]);
});

test("返回会截断后续答案，并让已取消的迟到 timer 失效", () => {
  const { controller, timers } = setup(3);
  controller.start();
  controller.answer("E");
  timers.fire(timers.latestId());
  controller.answer("S");
  const lateTimer = timers.latestId();

  const state = controller.back();
  assert.equal(timers.wasCancelled(lateTimer), true);
  assert.equal(state.currentQuestion, 0);
  assert.deepEqual(state.answers, ["E"]);

  timers.fire(lateTimer);
  assert.equal(controller.getState().currentQuestion, 0);
  assert.deepEqual(controller.getState().answers, ["E"]);
});

test("首题返回首页会取消推进，迟到 timer 不能把首页改回问卷", () => {
  const { controller, timers } = setup();
  controller.start();
  controller.answer("E");
  const lateTimer = timers.latestId();

  assert.equal(controller.back().screen, "cover");
  timers.fire(lateTimer);

  assert.equal(controller.getState().screen, "cover");
  assert.equal(controller.getState().currentQuestion, 0);
});

test("回首页保留已完成快照，再测会清空答卷并回到第一题", () => {
  const { controller, timers } = setup(1);
  controller.start();
  controller.answer("E");
  timers.fire(timers.latestId());

  assert.equal(controller.home().screen, "cover");
  assert.deepEqual(controller.getState().answers, ["E"]);
  assert.deepEqual(controller.retest(), {
    screen: "cover",
    petType: "cat",
    breedKey: null,
    answers: [],
    currentQuestion: 0,
    hasPendingAdvance: false
  });
  assert.equal(controller.start().screen, "quiz");
});

test("读取状态返回答案副本，delivery 不能越层修改 controller", () => {
  const { controller } = setup();
  const state = controller.start();
  state.answers.push("E");
  state.currentQuestion = 99;

  assert.deepEqual(controller.getState().answers, []);
  assert.equal(controller.getState().currentQuestion, 0);
});
