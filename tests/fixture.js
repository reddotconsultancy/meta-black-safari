"use strict";
const engine = new MetaBlackEngine(document);
const $ = id => document.getElementById(id);
const css = (id, key) => getComputedStyle($(id))[key];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function settle() {
  const until = performance.now() + 15000;
  do { await wait(40); } while (engine.hasWork && performance.now() < until);
  if (engine.hasWork) throw new Error("Theme work did not settle in 15 seconds");
}
$("theme").onclick = () => engine.enabled ? engine.disable() : engine.enable();
$("add").onclick = () => $("rows").insertAdjacentHTML("beforeend", "<tr><td>New dynamic row</td><td>Draft</td><td>0</td><td>0</td><td>₹500/day</td></tr>");
$("open").onclick = () => $("dialog").showModal();
$("close").onclick = () => $("dialog").close();

async function run() {
  $("run").disabled = true;
  engine.disable();
  const checks = [];
  function check(name, ok, detail = "") { checks.push({ name, passed: !!ok, detail }); }
  const original = {
    body: getComputedStyle(document.body).backgroundColor,
    panel: css("reports", "backgroundColor"),
    input: css("name", "color"),
    preview: css("preview", "backgroundColor"),
    previewInk: css("preview-copy", "color"),
    image: $("creative").getAttribute("src"),
    chart: getComputedStyle($("series")).stroke,
    primary: css("primary", "backgroundColor"),
    warning: css("warning", "backgroundColor"),
    warningInk: css("warning", "color"),
    error: css("error", "color"),
    custom: $("custom").getAttribute("style")
  };
  try {
    engine.enable(); await settle();
    check("Main background is true black", getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 0)");
    check("Panels use #111111", css("reports", "backgroundColor") === "rgb(17, 17, 17)");
    check("Inputs use #EAEAEA ink", css("name", "color") === "rgb(234, 234, 234)");
    check("Subtle borders use #292929", css("reports", "borderTopColor") === "rgb(41, 41, 41)");
    check("Native creative image source unchanged", $("creative").getAttribute("src") === original.image);
    check("No filter on creative image", css("creative", "filter") === "none");
    check("Preview backdrop stays native", css("preview", "backgroundColor") === original.preview);
    check("Preview text stays native", css("preview-copy", "color") === original.previewInk);
    check("Small monochrome UI icons remain visible", getComputedStyle($("ui-icon")).fill === "rgb(234, 234, 234)");
    check("Blue UI links have readable dark-theme contrast", css("campaign-link", "color") === "rgb(138, 180, 248)");
    const dot = document.createElement("span"); dot.id = "status-dot"; dot.style.cssText = "display:inline-block;width:8px;height:8px;border-radius:50%;background:rgb(128,128,128)";
    $("reports").append(dot); await settle();
    check("Neutral status dots keep their original paint", css("status-dot", "backgroundColor") === "rgb(128, 128, 128)");
    dot.remove();
    check("Chart series color stays native", getComputedStyle($("series")).stroke === original.chart);
    check("Primary button color stays native", css("primary", "backgroundColor") === original.primary);
    check("Warning background stays native", css("warning", "backgroundColor") === original.warning);
    check("Warning text stays native", css("warning", "color") === original.warningInk);
    check("Error ink stays native", css("error", "color") === original.error);
    check("Neutral gradients become black surfaces", css("gradient", "backgroundImage") === "none" && css("gradient", "backgroundColor") === "rgb(17, 17, 17)");
    check("Native dark media fades stay intact", css("media-fade", "backgroundImage") !== "none");
    check("Meta pastel workspace gradient is themed", css("pastel", "backgroundImage") === "none");
    check("Secondary Geo text remains readable", css("secondary-ink", "color") === "rgb(234, 234, 234)");
    check("CSS-mask navigation glyphs are painted as ink", css("mask-icon", "backgroundColor") === "rgb(234, 234, 234)");
    check("Colored mask status glyphs stay native", css("colored-mask", "backgroundColor") === "rgb(36, 115, 54)");
    check("Mask geometry stays native", css("mask-icon", "maskImage") !== "none");
    check("Meta Geo blue-gray text stays readable", css("geo-ink", "color") === "rgb(234, 234, 234)");
    check("Muted blue navigation selection remains distinct", css("tinted", "backgroundColor") === "rgb(41, 41, 41)");
    $("add").click(); await settle();
    check("Newly rendered row is themed", getComputedStyle($("rows").lastElementChild.firstElementChild).color === "rgb(234, 234, 234)");
    $("recycled").style.backgroundColor = "rgb(255, 230, 200)";
    await settle();
    check("Recycled row gains native warning color", css("recycled", "backgroundColor") === "rgb(255, 230, 200)");
    check("Recycled warning row restores native inherited text", getComputedStyle($("recycled").firstElementChild).color === "rgb(28, 30, 33)");
    $("recycled").style.backgroundColor = "rgb(255, 255, 255)";
    await settle();
    check("Recycled row returns to themed neutral surface", css("recycled", "backgroundColor") === "rgb(17, 17, 17)");
    $("open").click(); await settle();
    check("Dynamic dialog is themed", css("dialog", "backgroundColor") === "rgb(17, 17, 17)");
    check("Selected calendar cells retain native text contrast", css("calendar-ink", "color") === "rgb(28, 43, 51)");
    $("dialog").querySelector("input").value = "Editing still works";
    check("Input values remain editable", $("dialog").querySelector("input").value === "Editing still works");
    $("close").click();
    const parent = document.createElement("section"); parent.className = "panel";
    for (let i = 0; i < 500; i++) { const row = document.createElement("div"); row.textContent = `Virtual row ${i}`; parent.append(row); }
    const started = performance.now(); document.querySelector("main").append(parent); await settle();
    check("500-node commit settles without an endless observer loop", true, `${Math.round(performance.now() - started)} ms`);
    const sampled = engine.stats.samples;
    const written = engine.stats.attributeWrites;
    for (let i = 0; i < 100; i++) {
      parent.style.transform = `translateY(${i}px)`;
      parent.style.height = `${600 + i}px`;
      parent.style.top = `${i}px`;
    }
    await settle();
    check("100 virtualizer layout updates cause zero paint reads", engine.stats.samples === sampled, `${engine.stats.samples - sampled} reads`);
    check("Layout updates cause zero theme-marker writes", engine.stats.attributeWrites === written);
    check("Layout-only mutations are recognized", engine.stats.ignoredLayoutChanges >= 100);
    const classSamples = engine.stats.samples;
    parent.classList.add("fixture-layout-state"); await settle();
    check("Class changes do not rescan 500 descendants", engine.stats.samples - classSamples <= 2, `${engine.stats.samples - classSamples} reads`);
    parent.style.color = "rgb(175, 30, 30)"; await settle();
    check("Inherited semantic ink still updates descendants", getComputedStyle(parent.firstElementChild).color === "rgb(175, 30, 30)");
    const scrollSamples = engine.stats.samples;
    document.dispatchEvent(new Event("scroll"));
    parent.style.backgroundColor = "rgb(255, 230, 200)";
    await wait(50);
    check("Theme work yields during active scrolling", engine.stats.samples === scrollSamples);
    await settle();
    check("Deferred content is painted after scrolling settles", getComputedStyle(parent).backgroundColor === "rgb(255, 230, 200)");
    check("No per-element probe attributes remain", !document.querySelector("[data-mb-probe]"));
    parent.remove(); await settle();
    check("Detached nodes are released", ![...engine.touched].some(node => !node.isConnected));
    engine.disable();
    check("Off restores body background", getComputedStyle(document.body).backgroundColor === original.body);
    check("Off restores panel background", css("reports", "backgroundColor") === original.panel);
    check("Off restores input ink", css("name", "color") === original.input);
    check("Off restores preexisting custom property", $("custom").getAttribute("style") === original.custom);
    check("Off removes all theme markers", document.querySelectorAll("[data-mb-enabled],[data-mb-bg],[data-mb-ink],[data-mb-link],[data-mb-border],[data-mb-preserve],[data-mb-probe],[data-mb-gradient],[data-mb-svg-ink],[data-mb-svg-fill],[data-mb-svg-stroke]").length === 0);
    check("Off stops DOM observation and scheduled work", engine.pending.size === 0 && engine.walker === null && engine.timer === null && engine.frame === null);
    engine.enable(); await settle();
    check("Re-enable works without refreshing", css("reports", "backgroundColor") === "rgb(17, 17, 17)");
  } catch (error) { check("Test runtime", false, error.stack || String(error)); }
  const failed = checks.filter(c => !c.passed).length;
  $("results").textContent = `${checks.length - failed}/${checks.length} checks passed\n${checks.filter(c => !c.passed).map(c => c.name).join("; ")}\n\n` + checks.map(c => `${c.passed ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` (${c.detail})` : ""}`).join("\n");
  $("results").dataset.failed = String(failed);
  $("run").disabled = false;
}
$("run").onclick = run;
// Development only. Copies the exact shipped engine/CSS for a reversible,
// single-tab Web Inspector preview; this helper is NOT in the extension ZIP.
$("copy-preview").onclick = async () => {
  try {
    const [policy, engineSource, theme] = await Promise.all(["policy.js", "engine.js", "theme.css"].map(async file => {
      const response = await fetch(`../extension/${file}`);
      if (!response.ok) throw Error(`Cannot read ${file}`);
      return response.text();
    }));
    const source = `(()=>{if(globalThis.__metaBlackPreview)globalThis.__metaBlackPreview.remove();const previousP=globalThis.MetaBlackPolicy,previousE=globalThis.MetaBlackEngine;${policy}\n${engineSource}\nconst sheet=document.createElement('style');sheet.textContent=${JSON.stringify(theme)};document.head.append(sheet);const engine=new MetaBlackEngine(document);globalThis.__metaBlackPreview={engine,remove(){engine.disable();sheet.remove();if(previousP===undefined)delete globalThis.MetaBlackPolicy;else globalThis.MetaBlackPolicy=previousP;if(previousE===undefined)delete globalThis.MetaBlackEngine;else globalThis.MetaBlackEngine=previousE;delete globalThis.__metaBlackPreview;return 'Preview removed';}};engine.enable();return 'Local Meta Black preview active. Remove with __metaBlackPreview.remove()';})()`;
    await navigator.clipboard.writeText(source);
    $("copy-status").textContent = "Copied exact shipped engine and CSS. Developer preview only; no campaign API calls. Remove using __metaBlackPreview.remove().";
  } catch (error) { $("copy-status").textContent = `Could not copy: ${error.message}`; }
};
engine.enable();
