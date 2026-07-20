(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.PetMbtiAnalyticsFactory = api;
    root.PetMbtiAnalytics = api.createAnalytics(
      (root.PET_MBTI_SITE_CONFIG && root.PET_MBTI_SITE_CONFIG.analytics) || {},
      root
    );
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ALLOWED_EVENTS = new Set(["start", "complete", "share", "intent"]);
  const ALLOWED_PROPERTIES = new Set(["petType", "code", "egg", "channel", "product"]);

  const ANON_KEY = "pet_mbti_anon_id";

  // Stable, opaque per-browser id so the dashboard can count distinct people
  // without ever storing anything identifying. Persisted in localStorage;
  // regenerated only if storage is unavailable.
  function resolveAnonId(environment) {
    const storage = environment.localStorage || (environment.window && environment.window.localStorage);
    let id = "";
    try {
      if (storage) id = storage.getItem(ANON_KEY) || "";
    } catch (_error) { id = ""; }
    if (!id) {
      const rand = environment.randomId
        ? environment.randomId()
        : "a" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      id = rand;
      try { if (storage) storage.setItem(ANON_KEY, id); } catch (_error) { /* private mode: keep in-memory */ }
    }
    return id;
  }

  function createAnalytics(config = {}, environment = {}) {
    const endpoint = typeof config.endpoint === "string" ? config.endpoint.trim() : "";
    const siteId = typeof config.siteId === "string" ? config.siteId.trim() : "";
    const doNotTrack = environment.doNotTrack || (environment.navigator && environment.navigator.doNotTrack);
    const anonId = resolveAnonId(environment);

    async function track(event, properties = {}) {
      if (!endpoint || !siteId || doNotTrack === "1" || !ALLOWED_EVENTS.has(event)) return false;

      const safeProperties = {};
      for (const [key, value] of Object.entries(properties)) {
        if (ALLOWED_PROPERTIES.has(key) && ["string", "boolean", "number"].includes(typeof value)) {
          safeProperties[key] = value;
        }
      }

      const body = JSON.stringify({ siteId, project: siteId, anonId, event, properties: safeProperties });
      const navigatorRef = environment.navigator || {};
      if (typeof navigatorRef.sendBeacon === "function") {
        return navigatorRef.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      }

      if (typeof environment.fetch !== "function") return false;
      try {
        const response = await environment.fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
          credentials: "omit",
          referrerPolicy: "no-referrer"
        });
        return response.ok !== false;
      } catch (_error) {
        return false;
      }
    }

    return Object.freeze({ track });
  }

  return { createAnalytics };
});
