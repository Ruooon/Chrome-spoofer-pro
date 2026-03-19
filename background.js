const PROFILES = {
  "Chrome — Windows": {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    secChUa: "\"Not A;Brand\";v=\"99\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
    secChUaMobile: "?0",
    secChUaPlatform: "\"Windows\"",
    secChUaPlatformVersion: "\"10.0\""
  },
  "Chrome — Mac": {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    secChUa: "\"Not A;Brand\";v=\"99\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
    secChUaMobile: "?0",
    secChUaPlatform: "\"macOS\"",
    secChUaPlatformVersion: "\"10.15.7\""
  },
  "Chrome — Android Mobile": {
    userAgent: "Mozilla/5.0 (Linux; Android 10; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
    secChUa: "\"Not A;Brand\";v=\"99\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
    secChUaMobile: "?1",
    secChUaPlatform: "\"Android\"",
    secChUaPlatformVersion: "\"10\""
  },
  "Chrome — Android Mobile (high-end)": {
    userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
    secChUa: "\"Not A;Brand\";v=\"99\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
    secChUaMobile: "?1",
    secChUaPlatform: "\"Android\"",
    secChUaPlatformVersion: "\"13\""
  },
  "Chrome — Android Tablet": {
    userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    secChUa: "\"Not A;Brand\";v=\"99\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
    secChUaMobile: "?0",
    secChUaPlatform: "\"Android\"",
    secChUaPlatformVersion: "\"12\""
  },
  "Chrome — iPhone": {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/144.0.0.0 Mobile/15E148 Safari/604.1"
  },
  "Chrome — iPad": {
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/144.0.0.0 Mobile/15E148 Safari/604.1"
  },
  "Chrome — Chrome OS": {
    userAgent: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    secChUa: "\"Not A;Brand\";v=\"99\", \"Chromium\";v=\"144\", \"Google Chrome\";v=\"144\"",
    secChUaMobile: "?0",
    secChUaPlatform: "\"Chrome OS\""
  },
  "Firefox — Windows": {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0"
  },
  "Firefox — Mac": {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0"
  }
};

async function applyProfile(profileName) {
  const p = PROFILES[profileName];
  if (!p) throw new Error("Unknown profile");

  const requestHeaders = [];
  if (p.userAgent) requestHeaders.push({ header: "User-Agent", operation: "set", value: p.userAgent });
  if (p.secChUa) requestHeaders.push({ header: "Sec-CH-UA", operation: "set", value: p.secChUa });
  if (p.secChUaMobile) requestHeaders.push({ header: "Sec-CH-UA-Mobile", operation: "set", value: p.secChUaMobile });
  if (p.secChUaPlatform) requestHeaders.push({ header: "Sec-CH-UA-Platform", operation: "set", value: p.secChUaPlatform });
  if (p.secChUaPlatformVersion) requestHeaders.push({ header: "Sec-CH-UA-Platform-Version", operation: "set", value: p.secChUaPlatformVersion });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      priority: 1,
      action: { type: "modifyHeaders", requestHeaders },
      condition: {
        urlFilter: "|http*",
          resourceTypes: [
              "main_frame",
              "sub_frame",
              "xmlhttprequest",
              "script",
              "stylesheet",
              "image",
              "font"
          ]
      }
    }]
  });

  await chrome.storage.sync.set({ currentProfile: profileName });
}

chrome.runtime.onStartup.addListener(async () => {
  const { currentProfile, autoApply } = await chrome.storage.sync.get(["currentProfile", "autoApply"]);
  if (autoApply && currentProfile) {
    try { await applyProfile(currentProfile); } catch (e) {}
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const state = await chrome.storage.sync.get(["autoApply"]);
  if (typeof state.autoApply === "undefined") {
    await chrome.storage.sync.set({ autoApply: false });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "GET_STATE") {
      const { currentProfile, autoApply } = await chrome.storage.sync.get(["currentProfile", "autoApply"]);
      sendResponse({
        ok: true,
        profiles: Object.keys(PROFILES),
        currentProfile: currentProfile || "",
        autoApply: Boolean(autoApply)
      });
      return;
    }

    if (msg.type === "APPLY_PROFILE") {
      try {
        await applyProfile(msg.profileName);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
      return;
    }

    if (msg.type === "TOGGLE_AUTO") {
      const { autoApply } = await chrome.storage.sync.get(["autoApply"]);
      const next = !Boolean(autoApply);
      await chrome.storage.sync.set({ autoApply: next });
      sendResponse({ ok: true, autoApply: next });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message" });
  })();
  return true;
});
