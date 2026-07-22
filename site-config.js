(function (root, factory) {
  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  else root.PET_MBTI_SITE_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 发布前只填写真实信息。留空时页面会明确显示“测试阶段”，不会展示伪联系方式。
  return Object.freeze({
    siteName: "宠物 MBTI",
    releaseStage: "test",
    canonicalUrl: "",
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
