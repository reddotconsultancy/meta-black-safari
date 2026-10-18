(async function () {
  "use strict";
  const toggle = document.getElementById("enabled");
  const status = document.getElementById("status");
  const api = globalThis.browser;
  let saved = false;
  function render(enabled) {
    saved = enabled;
    toggle.checked = enabled;
    status.textContent = enabled
      ? "On for supported tabs with website access."
      : "Off. Meta’s original appearance is restored.";
  }
  try {
    const value = await api.storage.local.get({ enabled: true });
    render(value.enabled !== false);
    toggle.disabled = false;
  } catch {
    status.textContent = "Couldn’t read the preference. Reopen this popup to try again.";
    return;
  }
  api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) render(changes.enabled.newValue !== false);
  });
  toggle.addEventListener("change", async () => {
    const next = toggle.checked;
    toggle.disabled = true;
    try { await api.storage.local.set({ enabled: next }); render(next); }
    catch { toggle.checked = saved; status.textContent = "Couldn’t save. Your previous preference is unchanged."; }
    finally { toggle.disabled = false; }
  });
})();
