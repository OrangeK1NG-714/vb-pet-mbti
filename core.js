(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PetMbtiCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const QUESTIONS = [
    { dim: "EI", q: "有陌生人来家里，它第一反应是——", opts: [
      { t: "冲上去闻裤脚、要摸摸", v: "E" },
      { t: "躲进床底至少一小时", v: "I" },
      { t: "远远蹲着观察，不靠近", v: "I" },
      { t: "直接跳人腿上营业", v: "E" }
    ] },
    { dim: "EI", q: "带它出门或下楼，它——", opts: [
      { t: "兴奋到拽着你走，见谁都想打招呼", v: "E" },
      { t: "全程贴着你腿，只想回家", v: "I" }
    ] },
    { dim: "EI", q: "家里来了另一只动物，它——", opts: [
      { t: "凑上去自我介绍，社交拉满", v: "E" },
      { t: "保持安全距离，冷眼旁观", v: "I" }
    ] },
    { dim: "EI", q: "你在忙自己的事，它——", opts: [
      { t: "非要挤进来横在键盘/书上参与", v: "E" },
      { t: "自己找个角落安静待着", v: "I" }
    ] },
    { dim: "SN", q: "你手里拿个新玩具，它——", opts: [
      { t: "眼睛只盯着有没有零食，玩具其次", v: "S" },
      { t: "先绕着研究半天，怀疑里面有阴谋", v: "N" }
    ] },
    { dim: "SN", q: "家里最常出现的名场面是——", opts: [
      { t: "掐着饭点在饭盆前蹲守", v: "S" },
      { t: "对着空气或墙角突然发呆、炸毛", v: "N" }
    ] },
    { dim: "SN", q: "换了新家具、挪了位置，它——", opts: [
      { t: "闻两下确认能不能吃，就没兴趣了", v: "S" },
      { t: "疑神疑鬼绕三圈，觉得世界变了", v: "N" }
    ] },
    { dim: "SN", q: "你对它说话时，它更像是——", opts: [
      { t: "只听懂「吃」「出去」这种关键词", v: "S" },
      { t: "歪头盯着你，仿佛在读你的灵魂", v: "N" }
    ] },
    { dim: "TF", q: "你一整天没理它，它——", opts: [
      { t: "无所谓，该吃吃该睡睡", v: "T" },
      { t: "各种叫、各种蹭，控诉你", v: "F" }
    ] },
    { dim: "TF", q: "你难过或生病躺着，它——", opts: [
      { t: "瞄一眼，继续忙自己的", v: "T" },
      { t: "凑过来贴着你，像在安慰", v: "F" }
    ] },
    { dim: "TF", q: "它来找你，通常是因为——", opts: [
      { t: "有需求：饿了、要开门、要玩具", v: "T" },
      { t: "单纯想黏着你，没别的目的", v: "F" }
    ] },
    { dim: "TF", q: "你摸它、想抱抱的时候，它——", opts: [
      { t: "忍两秒就挣脱，摸够了自己走", v: "T" },
      { t: "主动往你怀里钻，越摸越黏", v: "F" }
    ] },
    { dim: "JP", q: "它的作息——", opts: [
      { t: "几点吃、几点闹、几点睡，雷打不动", v: "J" },
      { t: "全看心情，你永远猜不到下一步", v: "P" }
    ] },
    { dim: "JP", q: "你打乱了它的日常安排，它——", opts: [
      { t: "明显不爽，用叫声或眼神抗议", v: "J" },
      { t: "无所谓，随遇而安", v: "P" }
    ] },
    { dim: "JP", q: "它的玩具和地盘——", opts: [
      { t: "有固定的窝、固定的玩法", v: "J" },
      { t: "哪都能睡，玩具满屋乱丢", v: "P" }
    ] },
    { dim: "JP", q: "到了饭点还没开饭，它——", opts: [
      { t: "准时蹲点催饭，一秒不差", v: "J" },
      { t: "饿了才想起来，或者压根忘了", v: "P" }
    ] }
  ];

  const TYPES = {
    INTJ: { emoji: "🧊", title: "高冷军师", rarity: 3, slogan: "我不是不理你，是懒得理你。", desc: "全家智商担当，看你像看一个愚蠢但负责投喂的人类。计划通，连什么时候要饭都算好了。", good: "人间暖宝宝", bad: "另一只军师" },
    ENTJ: { emoji: "🎩", title: "霸道总裁", rarity: 4, slogan: "这个家，我说了算。", desc: "沙发是它的，你只是暂住。眼神一扫全屋听令，连你几点睡都归它管。", good: "贴身老管家", bad: "家庭CEO" },
    INFJ: { emoji: "🔮", title: "通灵小仙儿", rarity: 2, slogan: "我能感应到你今天不开心。", desc: "你一emo它就来蹭，堪称家养情绪雷达。但也神经兮兮，对着墙角发呆能吓你一跳。", good: "话痨戏精", bad: "抬杠捣蛋鬼" },
    INFP: { emoji: "🌱", title: "玻璃心小作精", rarity: 5, slogan: "你刚是不是凶我了？", desc: "被大声说一句能委屈一下午，躲角落用背影控诉你。内心戏比宫斗剧还多。", good: "人间暖宝宝", bad: "家庭CEO" },
    INTP: { emoji: "⚙️", title: "神游发明家", rarity: 4, slogan: "我在研究这个纸箱的物理结构。", desc: "对新东西研究半天，研究完就扔。经常放空到你叫三声才反应过来。", good: "抬杠捣蛋鬼", bad: "祖传规矩官" },
    ISTP: { emoji: "🔧", title: "沉默拆迁办", rarity: 6, slogan: "我不吵，我只是默默把它拆了。", desc: "话不多，手很快。你一转身，充电线、纸巾、拖鞋已成历史。", good: "佛系软萌精", bad: "居委会大妈" },
    ISTJ: { emoji: "📏", title: "祖传规矩官", rarity: 7, slogan: "饭点到了，你迟到了。", desc: "作息比你还规律，晚开饭五分钟就来监工。讨厌一切变动，换个猫砂盆都要抗议。", good: "贴身老管家", bad: "拆家特种兵" },
    ISFJ: { emoji: "🧣", title: "贴身老管家", rarity: 9, slogan: "你上厕所我也得守着门。", desc: "老妈子式舔狗，你走到哪跟到哪。默默照顾全家，但从不邀功。", good: "霸道总裁", bad: "抬杠捣蛋鬼" },
    ISFP: { emoji: "🎨", title: "佛系软萌精", rarity: 8, slogan: "岁月静好，有饭就行。", desc: "与世无争的软萌代表，晒太阳能晒一整天。不惹事，但也别想指挥它干嘛。", good: "沉默拆迁办", bad: "家庭CEO" },
    ENFP: { emoji: "🎭", title: "话痨戏精", rarity: 8, slogan: "快看我快看我快看我！", desc: "情绪永远拉满，一件小事能嗨半天。你回家那一刻它的反应像失散十年。", good: "通灵小仙儿", bad: "祖传规矩官" },
    ENTP: { emoji: "🃏", title: "抬杠捣蛋鬼", rarity: 6, slogan: "你不让我上桌，我偏上。", desc: "专治各种规矩，越禁止越要试。聪明得让你头疼，开柜子开门样样会。", good: "神游发明家", bad: "祖传规矩官" },
    ESFP: { emoji: "🎉", title: "人来疯捧场王", rarity: 11, slogan: "有客人？那必须是我的主场。", desc: "社交天花板，来个陌生人比你还热情。是全家的开心果，也是气氛担当。", good: "玻璃心小作精", bad: "高冷军师" },
    ESTP: { emoji: "💥", title: "拆家特种兵", rarity: 9, slogan: "这个家没有我拆不掉的。", desc: "精力永动机，白天拆家晚上跑酷。一天不放电，家就少一件家具。", good: "家庭CEO", bad: "祖传规矩官" },
    ESTJ: { emoji: "📋", title: "家庭CEO", rarity: 7, slogan: "都听我指挥，包括你。", desc: "全家的秩序维护者，谁不守规矩它管谁。执行力拉满，说要饭就必须现在。", good: "拆家特种兵", bad: "霸道总裁" },
    ESFJ: { emoji: "☎️", title: "居委会大妈", rarity: 12, slogan: "家里的事我都要知道。", desc: "热心肠管家婆，谁回家都要迎、谁做饭都要盯。最怕被冷落，一天不理它给你脸色看。", good: "人间暖宝宝", bad: "沉默拆迁办" },
    ENFJ: { emoji: "🌟", title: "人间暖宝宝", rarity: 6, slogan: "我的使命就是让你开心。", desc: "全家团宠体质，共情能力满分。你哭它蹭，你笑它扑，天生治愈系。", good: "高冷军师", bad: "谁都能处" }
  };

  const EGGS = [
    { key: "通灵兽", emoji: "🔮", title: "修仙成精·通灵兽", rarity: 0.2, slogan: "我看得懂你没说出口的话。", desc: "脑洞满格 + 共情满格——N·F 双维全满的成精生物。对着空气作揖、在你emo前就来蹭、半夜盯着墙角看你看不见的东西。全网最稀有的 0.2%，建议改名叫「仙儿」。", good: "话痨戏精（一个懂它的知音）", bad: "祖传规矩官（凡人不懂玄学）", matches: (score) => score.N === 4 && score.F === 4 },
    { key: "六边形战士", emoji: "⚖️", title: "端水大师·六边形战士", rarity: 0.3, slogan: "我全都要，又全都不沾。", desc: "社牛又社恐、黏人又高冷、随性又规律——四个维度全部 2:2 完美平衡。这不是普通宠物，这是一只把「端水」修炼到化境的成精生物。全网只有 0.3% 的毛孩子能做到。", good: "任何型（它谁都能拿捏）", bad: "无（没有它搞不定的）", matches: (score) => score.E === 2 && score.S === 2 && score.T === 2 && score.J === 2 },
    { key: "人间琼瑶", emoji: "🎭", title: "十级戏骨·人间琼瑶", rarity: 0.4, slogan: "没有我演不出的委屈。", desc: "社交满格、情绪满格——E·F 双维全满的戏精之王。一天能演八场大戏：你出门是生离，你回家是死别，饭晚了五分钟是被全世界抛弃。奥斯卡欠它一座小金人。", good: "通灵小仙儿（唯一接得住的观众）", bad: "高冷军师（对牛弹琴）", matches: (score) => score.E === 4 && score.F === 4 },
    { key: "纯血冰山", emoji: "🧊", title: "纯血冰山·六亲不认", rarity: 0.5, slogan: "人类，保持距离。", desc: "社恐拉满、脑洞拉满、绝对理性——I·N 双满 + 理性高分，冷到骨子里。这是高冷界的天花板，一只把「生人勿近」写在脸上的贵族。你能养住它，是你上辈子积的德。", good: "人间暖宝宝（唯一能焐热它的）", bad: "任何想抱它的人", matches: (score) => score.I === 4 && score.N === 4 && score.T >= 3 },
    { key: "混沌魔王", emoji: "👹", title: "混沌拆迁·大魔王", rarity: 0.6, slogan: "这个家，今天必须有点事发生。", desc: "社牛全满 + 随性全满，精力永动、毫无规矩。白天拆家、晚上蹦迪，你永远不知道下一秒它要干嘛。养它等于家里常驻一只小型龙卷风——但你还是爱它爱得死去活来。", good: "家庭CEO（唯一管得住的）", bad: "祖传规矩官（天生死敌）", matches: (score) => score.E === 4 && score.P === 4 },
    { key: "禅意躺神", emoji: "🛋️", title: "躺平大师·禅意躺神", rarity: 0.7, slogan: "世界与我无关，我只想瘫着。", desc: "社恐全满 + 随性全满——I·P 双维全满的躺平艺术家。一天 22 小时在睡，剩下 2 小时在找地方睡。不争不抢、与世无争，把「岁月静好」刻进了 DNA。养它最大的运动量，是帮它翻身。", good: "佛系软萌精（一起躺平的道友）", bad: "拆家特种兵（吵到它午觉）", matches: (score) => score.I === 4 && score.P === 4 },
    { key: "干饭本饭", emoji: "🍚", title: "干饭之神·恰饭本饭", rarity: 0.8, slogan: "叫我干什么？除非有吃的。", desc: "务实全满 + 规律全满——S·J 双维全满的干饭机器。人生只有一个主题：吃。掐着秒表蹲饭盆，多一秒不行；世界上没有一顿饭解决不了的情绪，如果有，那就两顿。", good: "家庭CEO（准点开饭的好搭子）", bad: "神游发明家（吃饭都能走神）", matches: (score) => score.S === 4 && score.J === 4 }
  ];

  // 「品种预判」数据梗：网传比例纯属娱乐，code 必须指向 TYPES 里的真实结果。
  const BREEDS = {
    cat: [
      { key: "ragdoll", label: "布偶", emoji: "🐰", code: "ESFP", percent: 78 },
      { key: "orange", label: "橘猫", emoji: "🍊", code: "ISTJ", percent: 83 },
      { key: "british", label: "英短", emoji: "🫖", code: "INTJ", percent: 71 },
      { key: "civet", label: "狸花", emoji: "🐯", code: "ENTJ", percent: 76 },
      { key: "siamese", label: "暹罗", emoji: "🎤", code: "ENFP", percent: 74 },
      { key: "american", label: "美短", emoji: "🏃", code: "ESTP", percent: 69 }
    ],
    dog: [
      { key: "golden", label: "金毛", emoji: "🌞", code: "ENFJ", percent: 82 },
      { key: "corgi", label: "柯基", emoji: "🍑", code: "ESFJ", percent: 73 },
      { key: "shiba", label: "柴犬", emoji: "🙃", code: "ENTP", percent: 77 },
      { key: "border", label: "边牧", emoji: "🎓", code: "INTJ", percent: 85 },
      { key: "husky", label: "哈士奇", emoji: "🌪️", code: "ESTP", percent: 88 },
      { key: "teddy", label: "泰迪", emoji: "🎀", code: "ESFP", percent: 72 }
    ]
  };

  function getBreedPrediction(petType, breedKey) {
    const list = BREEDS[petType];
    if (!list) return null;
    const breed = list.find((item) => item.key === breedKey);
    if (!breed) return null;
    return { ...breed, profile: TYPES[breed.code] };
  }

  const GROUPS = {
    NT: { name: "分析家", en: "Analysts", icon: "🧠", color: "#7656a8" },
    NF: { name: "外交官", en: "Diplomats", icon: "💚", color: "#23856d" },
    SJ: { name: "守护者", en: "Sentinels", icon: "🛡️", color: "#2974ad" },
    SP: { name: "探险家", en: "Explorers", icon: "⚡", color: "#b96a13" }
  };

  const DIMENSIONS = [
    { key: "EI", a: "E", b: "I", la: "外向 社牛", lb: "内向 社恐" },
    { key: "SN", a: "S", b: "N", la: "务实 吃货", lb: "玄学 脑洞" },
    { key: "TF", a: "T", b: "F", la: "理性 高冷", lb: "感性 黏人" },
    { key: "JP", a: "J", b: "P", la: "规律 控场", lb: "随性 佛系" }
  ];

  const SCORE_KEYS = ["E", "I", "S", "N", "T", "F", "J", "P"];

  function createEmptyScore() {
    return { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  }

  function normalizeScore(input) {
    const score = createEmptyScore();
    for (const key of SCORE_KEYS) {
      const value = Number(input && input[key]);
      score[key] = Number.isFinite(value) && value > 0 ? value : 0;
    }
    return score;
  }

  function tallyAnswers(answers) {
    if (!Array.isArray(answers)) throw new TypeError("answers 必须是数组");
    if (answers.length > QUESTIONS.length) throw new RangeError("答案数量超过题目数量");
    const score = createEmptyScore();
    answers.forEach((answer, index) => {
      const valid = QUESTIONS[index].opts.some((option) => option.v === answer);
      if (!valid) throw new RangeError(`第 ${index + 1} 题答案无效`);
      score[answer] += 1;
    });
    return score;
  }

  function averageRarity(letter) {
    const values = Object.keys(TYPES)
      .filter((code) => code.includes(letter))
      .map((code) => TYPES[code].rarity);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function calculateType(input) {
    const score = normalizeScore(input);
    const pick = (a, b) => {
      if (score[a] > score[b]) return a;
      if (score[b] > score[a]) return b;
      return averageRarity(a) <= averageRarity(b) ? a : b;
    };
    return pick("E", "I") + pick("S", "N") + pick("T", "F") + pick("J", "P");
  }

  function checkEgg(input) {
    const score = normalizeScore(input);
    return EGGS.find((egg) => egg.matches(score)) || null;
  }

  function getGroup(code) {
    const key = code.includes("N") ? (code.includes("T") ? "NT" : "NF") : (code.includes("J") ? "SJ" : "SP");
    return GROUPS[key];
  }

  function dimensionPercents(input) {
    const score = normalizeScore(input);
    return DIMENSIONS.map((dimension) => {
      const total = score[dimension.a] + score[dimension.b];
      const pa = total === 0 ? 50 : Math.round((score[dimension.a] / total) * 100);
      const pb = 100 - pa;
      const winner = pa === pb ? "tie" : (pa > pb ? "a" : "b");
      return { ...dimension, pa, pb, winner };
    });
  }

  function evaluateAnswers(answers) {
    if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
      throw new RangeError(`完整答卷必须包含 ${QUESTIONS.length} 个答案`);
    }
    const score = tallyAnswers(answers);
    const code = calculateType(score);
    const egg = checkEgg(score);
    return {
      answersCount: answers.length,
      score,
      code,
      egg,
      profile: egg || TYPES[code],
      group: getGroup(code),
      dimensions: dimensionPercents(score)
    };
  }

  return {
    QUESTIONS,
    TYPES,
    EGGS,
    BREEDS,
    getBreedPrediction,
    GROUPS,
    DIMENSIONS,
    createEmptyScore,
    tallyAnswers,
    averageRarity,
    calculateType,
    checkEgg,
    getGroup,
    dimensionPercents,
    evaluateAnswers
  };
});
