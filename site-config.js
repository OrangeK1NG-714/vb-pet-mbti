(function (root, factory) {
  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  else root.PET_MBTI_SITE_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 这里只填写已经真实存在的信息；联系方式缺失时保持为空，不展示占位信息。
  return Object.freeze({
    siteName: "宠物 MBTI",
    releaseStage: "live",
    canonicalUrl: "https://pet.richardq.tech/",
    contact: Object.freeze({
      wechat: "",
      email: ""
    }),
    // 统一看板：go-backend（api.richardq.tech）的 /api/collect。
    // 留空则 analytics 静默 no-op（不发送任何数据）。
    analytics: Object.freeze({
      endpoint: "https://api.richardq.tech/api/collect",
      siteId: "pet-mbti"
    })
  });
});
