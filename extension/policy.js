/* Site policy. No generated Meta class names, account IDs, or network access. */
(function (root) {
  "use strict";
  const protectedSelectors = [
    // Rendering islands: never traverse or recolor their contents.
    "img", "picture", "video", "audio", "canvas", "svg", "iframe", "object", "embed",
    "[role='img']", "[aria-roledescription='chart' i]",
    // Keep native checked/unchecked/indeterminate and progress states.
    "[role='switch']", "[role='checkbox']", "[role='radio']", "[role='progressbar']",
    "input[type='checkbox']", "input[type='radio']", "input[type='range']", "input[type='color']",
    "meter", "progress", "[role='alert']", "[role='status']",
    // Calendar range paint often lives on overlapping descendants/pseudo-elements.
    "[role='gridcell'][aria-selected='true']", "td[aria-selected='true']",
    // Meta adapters. These attributes can change; see SELECTORS.md.
    "[data-pagelet*='AdPreview' i]", "[data-pagelet*='CreativePreview' i]",
    "[data-testid*='ad_preview' i]", "[data-testid*='ad-preview' i]",
    "[data-testid*='creative_preview' i]", "[data-testid*='creative-preview' i]",
    "[data-testid*='chart' i]", "[data-pagelet*='Chart' i]",
    "[aria-label='Ad preview' i]", "[aria-label^='Ad preview:' i]",
    "[aria-label='Creative preview' i]", "[aria-label='Preview' i]",
    // Legacy Facebook creative renderer; intentionally narrow.
    ".fbAdPreview", ".fbAdPreviewContainer"
  ].join(",");
  const ignoreSelectors = "script,style,link,meta,title,head,noscript,template,br,wbr";
  const mainSelectors = "html,body,main,[role='main'],#mount_0_0,#content,#globalContainer";

  function rgba(value) {
    if (!value || value === "transparent") return [0, 0, 0, 0];
    const match = value.match(/^rgba?\(([^)]+)\)$/i);
    if (!match) return null; // Unknown/wide-gamut colors are preserved.
    const fields = match[1].trim().split(/[\s,\/]+/);
    if (fields.length < 3 || fields.slice(0, 3).some(x => x.endsWith("%"))) return null;
    const rgb = fields.slice(0, 3).map(Number);
    const alpha = fields[3] === undefined ? 1 : (fields[3].endsWith("%") ? parseFloat(fields[3]) / 100 : Number(fields[3]));
    return [...rgb, alpha].every(Number.isFinite) ? [...rgb, alpha] : null;
  }
  function neutral(value) {
    const c = rgba(value);
    // Geo/Business Suite uses blue-gray ink such as rgb(28,43,51). A spread
    // of 32 includes those neutrals while retaining warning yellow/brand hues.
    return !!c && c[3] >= 0.12 && Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)) <= 32;
  }
  function coloredSurface(value) {
    const c = rgba(value);
    return !!c && c[3] >= 0.12 && !neutral(value);
  }
  function neutralInk(value) {
    if (neutral(value)) return true;
    const c = rgba(value);
    // Meta's secondary Geo ink is rgb(70,90,105), which the background
    // classifier correctly treats as tinted but is unreadable on black.
    return !!c && c[3] >= 0.12 && c[2] <= 160 && c[1] >= c[0] && c[2] >= c[1] && c[2] - c[0] <= 48;
  }
  function supportsURL(value) {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && ["business.facebook.com", "adsmanager.facebook.com"].includes(u.hostname)
        && !/^\/(login|checkpoint|recover|two_step_verification)(\/|\.php|$)/i.test(u.pathname);
    } catch { return false; }
  }
  const policy = Object.freeze({ protectedSelectors, ignoreSelectors, mainSelectors, rgba, neutral, neutralInk, coloredSurface, supportsURL });
  if (typeof module !== "undefined" && module.exports) module.exports = policy;
  else root.MetaBlackPolicy = policy;
})(globalThis);
