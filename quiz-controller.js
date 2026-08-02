(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PetMbtiQuizController = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCREENS = Object.freeze({
    COVER: "cover",
    QUIZ: "quiz",
    RESULT: "result"
  });
  const PET_TYPES = new Set(["cat", "dog"]);

  function createQuizController({ questionCount, schedule, cancel }) {
    if (!Number.isInteger(questionCount) || questionCount <= 0) {
      throw new RangeError("questionCount 必须是正整数");
    }
    if (typeof schedule !== "function" || typeof cancel !== "function") {
      throw new TypeError("schedule 和 cancel 必须是函数");
    }

    let screen = SCREENS.COVER;
    let petType = "cat";
    let breedKey = null;
    let answers = [];
    let currentQuestion = 0;
    let pendingAdvance = null;
    let epoch = 0;

    function getState() {
      return {
        screen,
        petType,
        breedKey,
        answers: answers.slice(),
        currentQuestion,
        hasPendingAdvance: pendingAdvance !== null
      };
    }

    function cancelPendingAdvance() {
      epoch += 1;
      const pending = pendingAdvance;
      pendingAdvance = null;
      if (pending && pending.timerId !== undefined) cancel(pending.timerId);
      return getState();
    }

    function selectPet(nextPetType) {
      if (!PET_TYPES.has(nextPetType)) throw new RangeError("petType 只支持 cat 或 dog");
      if (petType !== nextPetType) breedKey = null;
      petType = nextPetType;
      return getState();
    }

    function toggleBreed(nextBreedKey) {
      if (typeof nextBreedKey !== "string" || !nextBreedKey.trim()) {
        throw new TypeError("breedKey 必须是非空字符串");
      }
      breedKey = breedKey === nextBreedKey ? null : nextBreedKey;
      return getState();
    }

    function start() {
      cancelPendingAdvance();
      answers = [];
      currentQuestion = 0;
      screen = SCREENS.QUIZ;
      return getState();
    }

    function answer(value, { delay = 0, onAdvance = () => {} } = {}) {
      if (screen !== SCREENS.QUIZ || pendingAdvance !== null) return false;
      if (typeof value !== "string" || !value) throw new TypeError("answer 必须是非空字符串");
      if (typeof onAdvance !== "function") throw new TypeError("onAdvance 必须是函数");

      answers[currentQuestion] = value;
      const ticket = { epoch: ++epoch, timerId: undefined };
      pendingAdvance = ticket;
      ticket.timerId = schedule(() => {
        if (pendingAdvance !== ticket || ticket.epoch !== epoch) return;
        pendingAdvance = null;
        if (currentQuestion < questionCount - 1) {
          currentQuestion += 1;
          onAdvance({ kind: "question", state: getState() });
          return;
        }
        screen = SCREENS.RESULT;
        onAdvance({ kind: "result", state: getState() });
      }, Math.max(0, Number(delay) || 0));
      return true;
    }

    function back() {
      if (screen !== SCREENS.QUIZ) return getState();
      cancelPendingAdvance();
      if (currentQuestion === 0) {
        screen = SCREENS.COVER;
        return getState();
      }
      currentQuestion -= 1;
      answers = answers.slice(0, currentQuestion + 1);
      return getState();
    }

    function home() {
      cancelPendingAdvance();
      screen = SCREENS.COVER;
      return getState();
    }

    function retest() {
      cancelPendingAdvance();
      answers = [];
      currentQuestion = 0;
      screen = SCREENS.COVER;
      return getState();
    }

    return {
      getState,
      selectPet,
      toggleBreed,
      start,
      answer,
      back,
      home,
      retest,
      cancelPendingAdvance
    };
  }

  return { SCREENS, createQuizController };
});
