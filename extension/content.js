(function () {
  "use strict";
  const api = globalThis.browser;
  if (!api?.storage?.local || !MetaBlackPolicy.supportsURL(location.href)) return;
  let engine;
  let desired = false;
  let revision = 0;
  function apply(enabled) {
    desired = enabled;
    if (!document.documentElement) return;
    engine ||= new MetaBlackEngine(document);
    if (desired) engine.enable();
    else engine.disable();
  }
  // Safari delivers storage changes to every open permitted content-script context.
  // No background process, tabs permission, polling, or network service is needed.
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.enabled) return;
    revision++;
    apply(changes.enabled.newValue !== false);
  });
  const initialRevision = revision;
  api.storage.local.get({ enabled: true }).then(value => {
    if (revision === initialRevision) apply(value.enabled !== false);
  }).catch(() => { if (revision === initialRevision) apply(false); }); // Fail open to Meta's original appearance.
  if (!document.documentElement) {
    const rootObserver = new MutationObserver(() => {
      if (document.documentElement) { rootObserver.disconnect(); apply(desired); }
    });
    rootObserver.observe(document, { childList: true });
  }
})();
