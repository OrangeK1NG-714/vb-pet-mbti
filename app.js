(function () {
  "use strict";

  const Core = window.PetMbtiCore;
  const ShareCard = window.PetMbtiShareCard;
  const analytics = window.PetMbtiAnalytics;
  const config = window.PET_MBTI_SITE_CONFIG;
  const app = document.getElementById("app");
  let petType = "cat";
  let answers = [];
  let currentQuestion = 0;
  let latestResult = null;

  const petWord = () => petType === "cat" ? "猫" : "狗";
  const petIcon = () => petType === "cat" ? "🐱" : "🐶";
  const track = (event, properties) => analytics.track(event, properties);

  function updateConfiguredMetadata() {
    if (!config.canonicalUrl) return;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = config.canonicalUrl;
    const image = new URL("assets/share-cover.png", config.canonicalUrl).href;
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", config.canonicalUrl);
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", image);
  }

  function focusPageHeading() {
    requestAnimationFrame(() => app.querySelector("h1, h2")?.focus());
  }

  function renderCover() {
    latestResult = null;
    app.innerHTML = `
      <section class="cover" aria-labelledby="cover-title">
        <div class="cover-mark" aria-hidden="true"><span>🐾</span></div>
        <p class="eyebrow">PET PERSONALITY FILE</p>
        <h1 id="cover-title" tabindex="-1">你家毛孩子<br>到底是什么型？</h1>
        <p class="sub">16 型人格 · 16 道题 · 一分钟测完</p>
        <div class="type-choose" role="group" aria-label="选择宠物类型">
          <button type="button" data-pet="cat" class="${petType === "cat" ? "on" : ""}" aria-pressed="${petType === "cat"}"><span class="ic" aria-hidden="true">🐱</span>我家猫</button>
          <button type="button" data-pet="dog" class="${petType === "dog" ? "on" : ""}" aria-pressed="${petType === "dog"}"><span class="ic" aria-hidden="true">🐶</span>我家狗</button>
        </div>
        <button class="btn" type="button" id="start"><span aria-hidden="true">▶</span> 开始测试</button>
        <p class="foot">🥚 藏着 7 款超稀有隐藏人设 · 纯属娱乐</p>
        ${config.releaseStage !== "live" ? '<p class="status-note"><span aria-hidden="true">●</span> 当前为测试版，正式网址和联系方式尚未配置</p>' : ""}
      </section>`;

    app.querySelectorAll("[data-pet]").forEach((button) => {
      button.addEventListener("click", () => {
        petType = button.dataset.pet;
        app.querySelectorAll("[data-pet]").forEach((item) => {
          const selected = item === button;
          item.classList.toggle("on", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
      });
    });
    document.getElementById("start").addEventListener("click", () => {
      answers = [];
      currentQuestion = 0;
      track("start", { petType });
      renderQuiz();
    });
  }

  function renderQuiz() {
    const question = Core.QUESTIONS[currentQuestion];
    const progress = Math.round((currentQuestion / Core.QUESTIONS.length) * 100);
    const options = question.opts.map((option, index) => `
      <button class="option" type="button" data-answer="${option.v}" data-option="${index}">
        <span class="option-index" aria-hidden="true">${String.fromCharCode(65 + index)}</span>
        <span>${option.t}</span>
      </button>`).join("");

    app.innerHTML = `
      <section class="quiz" aria-labelledby="question-title">
        <div class="topbar">
          <button class="back icon-btn" type="button" id="back" aria-label="返回上一题">‹</button>
          <div class="progress-wrap" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="${Core.QUESTIONS.length}" aria-valuenow="${currentQuestion}">
            <div class="progress-bar" style="width:${progress}%"></div>
          </div>
          <div class="progress-txt">${currentQuestion + 1}/${Core.QUESTIONS.length}</div>
        </div>
        <p class="q-num">第 ${currentQuestion + 1} 题 · 关于你家${petWord()}${petIcon()}</p>
        <h1 class="q-title" id="question-title" tabindex="-1">${question.q}</h1>
        <div class="options">${options}</div>
      </section>`;

    document.getElementById("back").addEventListener("click", () => {
      if (currentQuestion === 0) renderCover();
      else {
        currentQuestion -= 1;
        answers = answers.slice(0, currentQuestion + 1);
        renderQuiz();
      }
    });
    app.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        app.querySelectorAll("[data-answer]").forEach((item) => item.disabled = true);
        button.classList.add("sel");
        answers[currentQuestion] = button.dataset.answer;
        window.setTimeout(() => {
          if (currentQuestion < Core.QUESTIONS.length - 1) {
            currentQuestion += 1;
            renderQuiz();
          } else renderResult();
        }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
      });
    });
    focusPageHeading();
  }

  function dimensionMarkup(dimensions) {
    return dimensions.map((dimension) => {
      const leftClass = dimension.winner === "a" ? "win" : "";
      const rightClass = dimension.winner === "b" ? "win" : "";
      return `
        <div class="dim">
          <div class="dim-labels">
            <span class="${leftClass}">${dimension.la} ${dimension.pa}%</span>
            <span class="${rightClass}">${dimension.pb}% ${dimension.lb}</span>
          </div>
          <div class="dim-bar" role="img" aria-label="${dimension.la} ${dimension.pa}%，${dimension.lb} ${dimension.pb}%">
            <div class="dim-fill" style="width:${dimension.pa}%"></div>
          </div>
        </div>`;
    }).join("");
  }

  function renderResult() {
    latestResult = Core.evaluateAnswers(answers);
    const { profile, code, egg, group, dimensions } = latestResult;
    const isEgg = Boolean(egg);
    const topTags = isEgg
      ? '<div class="egg-code">✨ 隐藏人设 · 已解锁 ✨</div>'
      : `<div class="meta-row"><span class="group-badge">${group.icon} ${group.name}</span><span class="code-chip">${code}</span></div>`;

    app.innerHTML = `
      <section class="result" aria-labelledby="result-title" style="--g:${group.color}">
        <article class="result-card${isEgg ? " egg-card" : ""}">
          ${isEgg ? '<div class="egg-banner">🥚 恭喜抽中隐藏人设</div>' : ""}
          <div class="r-emoji" aria-hidden="true">${profile.emoji}</div>
          ${topTags}
          <h1 class="r-title" id="result-title" tabindex="-1">${profile.title}</h1>
          <p class="r-slogan">「${profile.slogan}」</p>
          <p class="rarity">稀有度 ${profile.rarity}%</p>
          <p class="r-desc">${profile.desc}</p>
          <div class="cp">
            <div class="cp-item good"><span class="lbl">最佳室友</span><strong class="val">${profile.good}</strong></div>
            <div class="cp-item bad"><span class="lbl">最容易打架</span><strong class="val">${profile.bad}</strong></div>
          </div>
          <details class="dims-fold">
            <summary>查看四维性格分析</summary>
            <div class="dims">${dimensionMarkup(dimensions)}</div>
          </details>
        </article>
        <button class="btn" type="button" id="save"><span aria-hidden="true">⇩</span> 保存卡片 · 晒到朋友圈</button>
        <button class="btn btn-secondary" type="button" id="invite"><span aria-hidden="true">↗</span> 邀请朋友也来测</button>
        <div class="mini-row">
          <button class="mini-btn" type="button" id="again">再测一只</button>
          <button class="mini-btn" type="button" id="home">回首页</button>
        </div>
        <button class="softlink" type="button" id="softlink">😻 把 <b>${profile.title}</b> 做成专属作品？<span>登记意向</span></button>
        ${config.releaseStage !== "live" ? '<p class="status-note result-status">测试阶段 · 暂未开放购买</p>' : ""}
      </section>`;

    track("complete", { petType, code, egg: isEgg });
    document.getElementById("save").addEventListener("click", showShareCard);
    document.getElementById("invite").addEventListener("click", inviteFriend);
    document.getElementById("again").addEventListener("click", () => {
      answers = [];
      currentQuestion = 0;
      renderCover();
    });
    document.getElementById("home").addEventListener("click", renderCover);
    document.getElementById("softlink").addEventListener("click", showIntentModal);
    focusPageHeading();
  }

  function openModal(content, label) {
    const previousFocus = document.activeElement;
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true"></div>';
    const modalBox = modal.querySelector(".modal-box");
    modalBox.setAttribute("aria-label", label);
    modalBox.innerHTML = content;
    document.body.appendChild(modal);
    document.body.classList.add("modal-open");

    const close = () => {
      modal.removeEventListener("keydown", onKeydown);
      modal.remove();
      document.body.classList.remove("modal-open");
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
    const onKeydown = (event) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const focusable = [...modal.querySelectorAll('button, a[href], img[tabindex="0"]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    modal.addEventListener("keydown", onKeydown);
    modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
    modal.querySelector("[data-close]")?.addEventListener("click", close);
    requestAnimationFrame(() => modal.querySelector("button, img[tabindex]")?.focus());
    return { modal, close };
  }

  function showShareCard() {
    const card = ShareCard.createShareCard(latestResult, {
      petType,
      releaseStage: config.releaseStage,
      siteLabel: config.canonicalUrl || config.siteName
    });
    const dialog = openModal(`
      <p class="modal-tip">长按图片保存到相册<br><span>电脑端可使用“下载 PNG”</span></p>
      <img class="card-img" src="${card.dataUrl}" alt="${latestResult.profile.title}宠物 MBTI 结果卡，${card.width}乘${card.height}像素" tabindex="0">
      <p class="image-size">PNG · ${card.width} × ${card.height}</p>
      <a class="btn download-link" download="宠物MBTI-${latestResult.code}.png" href="${card.dataUrl}">⇩ 下载 PNG</a>
      <button class="btn btn-ghost" type="button" data-close>关闭</button>`, "保存宠物 MBTI 分享卡");
    dialog.modal.querySelector(".download-link").addEventListener("click", () => track("share", { code: latestResult.code, egg: Boolean(latestResult.egg), channel: "download" }));
    track("share", { code: latestResult.code, egg: Boolean(latestResult.egg), channel: "card" });
  }

  async function inviteFriend() {
    if (!config.canonicalUrl) {
      openModal(`
        <p class="modal-icon" aria-hidden="true">🧪</p>
        <h2>邀请入口已准备好</h2>
        <p class="modal-copy">当前还是测试版，尚未配置可公开访问的正式网址。发布后，这里会直接调起系统分享或复制链接。</p>
        <button class="btn" type="button" data-close>知道了</button>`, "测试版分享说明");
      return;
    }
    const shareData = { title: "宠物 MBTI", text: "测测你家毛孩子到底是什么型？", url: config.canonicalUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(config.canonicalUrl);
      track("share", { code: latestResult.code, egg: Boolean(latestResult.egg), channel: navigator.share ? "native" : "copy" });
      if (!navigator.share) {
        openModal('<p class="modal-icon" aria-hidden="true">✓</p><h2>链接已复制</h2><p class="modal-copy">发给朋友，看看 TA 家毛孩子是哪一型。</p><button class="btn" type="button" data-close>好的</button>', "链接已复制");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        openModal(`<h2>复制这个链接</h2><p class="share-url"></p><button class="btn" type="button" data-close>关闭</button>`, "分享链接").modal.querySelector(".share-url").textContent = config.canonicalUrl;
      }
    }
  }

  function showIntentModal() {
    track("intent", { code: latestResult.code, egg: Boolean(latestResult.egg), product: "custom-art" });
    const hasContact = Boolean(config.contact.wechat || config.contact.email);
    const dialog = openModal(`
      <p class="modal-icon" aria-hidden="true">${latestResult.profile.emoji}🎨</p>
      <h2>「${latestResult.profile.title}」专属作品</h2>
      <p class="modal-copy">头像海报和纪念卡仍在意向验证阶段，当前不收款、不开放下单。</p>
      <div class="intent-list">
        <div><strong>🖼️ 专属头像海报</strong><span>照片 + 人设称号，定制插画方向</span></div>
        <div><strong>🕯️ 宠物纪念卡</strong><span>为陪伴过的它，留下一张纪念</span></div>
      </div>
      ${hasContact ? '<p class="contact-line">联系：<strong data-contact></strong></p>' : '<p class="test-disclosure">测试阶段尚未配置联系方式。这次点击只记录匿名意向，不会收集你的个人信息。</p>'}
      <button class="btn" type="button" data-close>${hasContact ? "好的" : "记下我的兴趣"}</button>`, "专属作品意向登记");
    const contact = dialog.modal.querySelector("[data-contact]");
    if (contact) contact.textContent = config.contact.wechat ? `微信 ${config.contact.wechat}` : config.contact.email;
  }

  updateConfiguredMetadata();
  renderCover();
})();
