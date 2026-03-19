document.addEventListener("DOMContentLoaded", async () => {
  const profile = document.getElementById("profile");
  const applyBtn = document.getElementById("apply");
  const autoBtn = document.getElementById("auto");
  const status = document.getElementById("status");

  const res = await chrome.runtime.sendMessage({ type: "GET_STATE" });

  res.profiles.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    profile.appendChild(opt);
  });

  if (res.currentProfile) {
    profile.value = res.currentProfile;
    status.textContent = `Active: ${res.currentProfile}`;
  }

  autoBtn.textContent = res.autoApply ? "Auto-apply: ON" : "Auto-apply: OFF";

  applyBtn.onclick = async () => {
    const name = profile.value;
    const r = await chrome.runtime.sendMessage({ type: "APPLY_PROFILE", profileName: name });
    status.textContent = r.ok ? `Applied: ${name}` : `Error: ${r.error}`;
  };

  autoBtn.onclick = async () => {
    const r = await chrome.runtime.sendMessage({ type: "TOGGLE_AUTO" });
    autoBtn.textContent = r.autoApply ? "Auto-apply: ON" : "Auto-apply: OFF";
  };
});
