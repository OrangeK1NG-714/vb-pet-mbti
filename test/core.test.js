const assert = require("node:assert/strict");
const test = require("node:test");

const Core = require("../core.js");

const OPPOSITE = { E: "I", I: "E", S: "N", N: "S", T: "F", F: "T", J: "P", P: "J" };

function scoreFor(code, amount = 4) {
  const score = Core.createEmptyScore();
  for (const letter of code) {
    score[letter] = amount;
    score[OPPOSITE[letter]] = 0;
  }
  return score;
}

test("公开完整的 16 道题、16 种结果与 7 个彩蛋", () => {
  assert.equal(Core.QUESTIONS.length, 16);
  assert.equal(Object.keys(Core.TYPES).length, 16);
  assert.equal(Core.EGGS.length, 7);
  assert.equal(Core.DIMENSIONS.length, 4);
});

test("每个维度恰好四题且每个选项只投向当前维度", () => {
  for (const dimension of Core.DIMENSIONS) {
    const questions = Core.QUESTIONS.filter((question) => question.dim === dimension.key);
    assert.equal(questions.length, 4, `${dimension.key} 应有四题`);
    for (const question of questions) {
      assert.ok(question.q.trim());
      assert.ok(question.opts.length >= 2);
      for (const option of question.opts) {
        assert.ok(option.t.trim());
        assert.ok([dimension.a, dimension.b].includes(option.v));
      }
    }
  }
});

test("所有普通结果路径都能稳定得到对应的四字母类型", () => {
  for (const code of Object.keys(Core.TYPES)) {
    assert.equal(Core.calculateType(scoreFor(code)), code, code);
  }
});

test("普通结果和隐藏结果的中文文案字段完整", () => {
  const required = ["emoji", "title", "rarity", "slogan", "desc", "good", "bad"];
  for (const [code, result] of Object.entries(Core.TYPES)) {
    assert.match(code, /^[EI][SN][TF][JP]$/);
    for (const field of required) assert.notEqual(String(result[field] ?? "").trim(), "", `${code}.${field}`);
  }
  for (const egg of Core.EGGS) {
    assert.ok(egg.key.trim());
    for (const field of required) assert.notEqual(String(egg[field] ?? "").trim(), "", `${egg.key}.${field}`);
  }
});

test("七个彩蛋都能触发，且更稀有规则优先", () => {
  const fixtures = [
    ["通灵兽", { N: 4, F: 4 }],
    ["六边形战士", { E: 2, I: 2, S: 2, N: 2, T: 2, F: 2, J: 2, P: 2 }],
    ["人间琼瑶", { E: 4, F: 4 }],
    ["纯血冰山", { I: 4, N: 4, T: 3, F: 1 }],
    ["混沌魔王", { E: 4, P: 4 }],
    ["禅意躺神", { I: 4, P: 4 }],
    ["干饭本饭", { S: 4, J: 4 }]
  ];

  for (const [key, partial] of fixtures) {
    assert.equal(Core.checkEgg({ ...Core.createEmptyScore(), ...partial })?.key, key);
  }
  assert.equal(
    Core.checkEgg({ ...Core.createEmptyScore(), E: 4, N: 4, F: 4 })?.key,
    "通灵兽",
    "同时命中时必须返回列表中更稀有的彩蛋"
  );
});

test("未达到极端门槛时不误触彩蛋", () => {
  const score = { ...Core.createEmptyScore(), E: 3, I: 1, S: 3, N: 1, T: 3, F: 1, J: 3, P: 1 };
  assert.equal(Core.checkEgg(score), null);
});

test("平票按平均稀有度稳定选择 INTJ，票数胜出时优先票数", () => {
  assert.equal(Core.calculateType(Core.createEmptyScore()), "INTJ");
  assert.equal(Core.calculateType({ ...Core.createEmptyScore(), E: 3, I: 1, S: 3, N: 1, F: 3, T: 1, P: 3, J: 1 }), "ESFP");
});

test("四维百分比覆盖全票、平票与无票边界", () => {
  const allE = Core.dimensionPercents({ ...Core.createEmptyScore(), E: 4 })[0];
  assert.deepEqual({ pa: allE.pa, pb: allE.pb, winner: allE.winner }, { pa: 100, pb: 0, winner: "a" });

  const tied = Core.dimensionPercents({ ...Core.createEmptyScore(), E: 2, I: 2 })[0];
  assert.deepEqual({ pa: tied.pa, pb: tied.pb, winner: tied.winner }, { pa: 50, pb: 50, winner: "tie" });

  const empty = Core.dimensionPercents(Core.createEmptyScore())[0];
  assert.deepEqual({ pa: empty.pa, pb: empty.pb, winner: empty.winner }, { pa: 50, pb: 50, winner: "tie" });
});

test("计票拒绝越界数量和不属于对应题目的答案", () => {
  assert.throws(() => Core.tallyAnswers("E"), TypeError);
  assert.throws(() => Core.tallyAnswers(Array(17).fill("E")), RangeError);
  assert.throws(() => Core.tallyAnswers(["S"]), RangeError);
});

test("完整答案可一次得到分数、普通类型、彩蛋和维度", () => {
  const answers = Core.QUESTIONS.map((question) => question.opts[0].v);
  const result = Core.evaluateAnswers(answers);
  assert.equal(result.answersCount, 16);
  assert.equal(result.code.length, 4);
  assert.equal(result.dimensions.length, 4);
  assert.equal(result.profile, result.egg || Core.TYPES[result.code]);
});

test("结果计算拒绝不完整答卷", () => {
  assert.throws(() => Core.evaluateAnswers([]), RangeError);
});

test("品种预判覆盖猫狗、指向真实结果且比例合法", () => {
  assert.deepEqual(Object.keys(Core.BREEDS).sort(), ["cat", "dog"]);
  for (const [petType, breeds] of Object.entries(Core.BREEDS)) {
    assert.ok(breeds.length >= 4, `${petType} 品种太少`);
    const keys = breeds.map((breed) => breed.key);
    assert.equal(new Set(keys).size, keys.length, `${petType} 品种 key 重复`);
    for (const breed of breeds) {
      assert.ok(breed.label.trim(), `${breed.key}.label`);
      assert.ok(breed.emoji.trim(), `${breed.key}.emoji`);
      assert.ok(Core.TYPES[breed.code], `${breed.key} 指向不存在的类型 ${breed.code}`);
      assert.ok(Number.isInteger(breed.percent) && breed.percent > 0 && breed.percent < 100, `${breed.key}.percent`);
    }
  }
});

test("品种预判查询返回完整档案并拒绝未知输入", () => {
  const prediction = Core.getBreedPrediction("cat", "ragdoll");
  assert.equal(prediction.code, "ESFP");
  assert.equal(prediction.profile, Core.TYPES.ESFP);
  assert.equal(Core.getBreedPrediction("cat", "nonexistent"), null);
  assert.equal(Core.getBreedPrediction("bird", "ragdoll"), null);
});
