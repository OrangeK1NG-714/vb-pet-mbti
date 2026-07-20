(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PetMbtiShareCard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CARD_SIZE = Object.freeze({ width: 1080, height: 1440 });
  const FONT = '"PingFang SC","Microsoft YaHei",sans-serif';

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function wrapLines(context, text, maxWidth, maxLines) {
    const lines = [];
    let line = "";
    for (const character of text) {
      if (context.measureText(line + character).width > maxWidth && line) {
        lines.push(line);
        line = character;
        if (lines.length === maxLines) break;
      } else {
        line += character;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.join("").length < text.length) {
      const last = lines.length - 1;
      lines[last] = lines[last].slice(0, -1) + "…";
    }
    return lines;
  }

  function fitText(context, text, maxWidth, startSize, weight = 800) {
    let size = startSize;
    do {
      context.font = `${weight} ${size}px ${FONT}`;
      if (context.measureText(text).width <= maxWidth) break;
      size -= 2;
    } while (size > 30);
    return size;
  }

  function createShareCard(result, options = {}) {
    if (!result || !result.profile || !Array.isArray(result.dimensions)) {
      throw new TypeError("分享卡需要完整的测试结果");
    }
    const documentRef = options.documentRef || (typeof document !== "undefined" ? document : null);
    if (!documentRef) throw new Error("当前环境不支持 Canvas");

    const canvas = documentRef.createElement("canvas");
    canvas.width = CARD_SIZE.width;
    canvas.height = CARD_SIZE.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建 Canvas 2D 上下文");

    const { width, height } = CARD_SIZE;
    const { profile, code, egg, group, dimensions } = result;
    const isEgg = Boolean(egg);
    const accent = isEgg ? "#f4bd4b" : group.color;
    const ink = isEgg ? "#fffaf1" : "#302825";
    const muted = isEgg ? "#dccce7" : "#796c66";

    const background = context.createLinearGradient(0, 0, width, height);
    if (isEgg) {
      background.addColorStop(0, "#2d213d");
      background.addColorStop(1, "#513764");
    } else {
      background.addColorStop(0, "#fff4e8");
      background.addColorStop(0.55, "#ffe2d8");
      background.addColorStop(1, "#f7d7df");
    }
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.globalAlpha = isEgg ? 0.08 : 0.11;
    context.fillStyle = accent;
    context.beginPath();
    context.arc(930, 110, 230, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(90, 1350, 260, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    context.textAlign = "center";
    context.fillStyle = muted;
    context.font = `600 30px ${FONT}`;
    context.fillText("🐾 宠物 MBTI 人格测试", width / 2, 70);

    const badge = isEgg
      ? `隐藏人设 · 稀有度 ${profile.rarity}%`
      : `${group.icon} ${group.name} · ${code} · 稀有度 ${profile.rarity}%`;
    context.font = `700 26px ${FONT}`;
    const badgeWidth = Math.min(context.measureText(badge).width + 62, width - 120);
    roundedRect(context, (width - badgeWidth) / 2, 100, badgeWidth, 54, 27);
    context.fillStyle = accent;
    context.fill();
    context.fillStyle = isEgg ? "#3a2847" : "#ffffff";
    context.fillText(badge, width / 2, 136);

    context.font = `164px ${FONT}`;
    context.fillText(profile.emoji, width / 2, 340);
    context.fillStyle = ink;
    fitText(context, profile.title, width - 130, 72);
    context.fillText(profile.title, width / 2, 435);

    roundedRect(context, 90, 474, width - 180, 82, 20);
    context.fillStyle = isEgg ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.68)";
    context.fill();
    context.fillStyle = accent;
    fitText(context, `「${profile.slogan}」`, width - 240, 34, 700);
    context.fillText(`「${profile.slogan}」`, width / 2, 527);

    context.fillStyle = isEgg ? "#f3e9f8" : "#514742";
    context.font = `400 30px ${FONT}`;
    const descriptionLines = wrapLines(context, profile.desc, width - 190, 3);
    descriptionLines.forEach((line, index) => context.fillText(line, width / 2, 615 + index * 43));

    context.textAlign = "left";
    context.font = `700 28px ${FONT}`;
    context.fillStyle = ink;
    context.fillText("四维性格", 90, 770);
    dimensions.forEach((dimension, index) => {
      const y = 812 + index * 83;
      context.font = `600 23px ${FONT}`;
      context.fillStyle = muted;
      context.fillText(`${dimension.la} ${dimension.pa}%`, 90, y);
      context.textAlign = "right";
      context.fillText(`${dimension.pb}% ${dimension.lb}`, width - 90, y);
      context.textAlign = "left";
      roundedRect(context, 90, y + 17, width - 180, 14, 7);
      context.fillStyle = isEgg ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.75)";
      context.fill();
      roundedRect(context, 90, y + 17, Math.max(14, (width - 180) * dimension.pa / 100), 14, 7);
      context.fillStyle = accent;
      context.fill();
    });

    const cardY = 1165;
    const cardWidth = 420;
    const drawMatch = (x, label, value) => {
      roundedRect(context, x, cardY, cardWidth, 116, 20);
      context.fillStyle = isEgg ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.7)";
      context.fill();
      context.textAlign = "center";
      context.fillStyle = muted;
      context.font = `500 22px ${FONT}`;
      context.fillText(label, x + cardWidth / 2, cardY + 38);
      context.fillStyle = ink;
      fitText(context, value, cardWidth - 36, 27, 700);
      context.fillText(value, x + cardWidth / 2, cardY + 82);
    };
    drawMatch(90, "🤝 最佳室友", profile.good);
    drawMatch(width - 90 - cardWidth, "⚔️ 最容易打架", profile.bad);

    context.textAlign = "center";
    context.fillStyle = accent;
    context.font = `800 31px ${FONT}`;
    context.fillText("邀请朋友也来测测 TA 家毛孩子", width / 2, 1350);
    context.fillStyle = muted;
    context.font = `500 21px ${FONT}`;
    const footer = options.releaseStage === "live" ? (options.siteLabel || "宠物 MBTI") : "测试版 · 正式网址配置后开放分享";
    context.fillText(footer, width / 2, 1392);

    return {
      canvas,
      width,
      height,
      dataUrl: canvas.toDataURL("image/png")
    };
  }

  return { CARD_SIZE, createShareCard };
});
