"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const P = require("../extension/policy.js");
const read = name => fs.readFileSync(path.join(root, "extension", name), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));

test("permission scope is exactly two HTTPS application hosts and local storage", () => {
  const m = JSON.parse(read("manifest.json"));
  assert.deepEqual(m.permissions, ["storage"]);
  assert.deepEqual(m.host_permissions, ["https://business.facebook.com/*", "https://adsmanager.facebook.com/*"]);
  assert.deepEqual(m.content_scripts[0].matches, m.host_permissions);
  assert.equal(m.content_scripts[0].all_frames, false);
  assert.equal(m.content_scripts[0].run_at, "document_start");
  assert.equal(m.background, undefined);
  assert.equal(m.web_accessible_resources, undefined);
});
test("only supported application URLs pass; authentication routes and lookalikes do not", () => {
  for (const url of ["https://business.facebook.com/latest/inbox", "https://adsmanager.facebook.com/adsmanager/manage/campaigns"]) assert.ok(P.supportsURL(url), url);
  for (const url of ["https://www.facebook.com/", "http://business.facebook.com/", "https://business.facebook.com.evil.test/", "https://business.facebook.com/login.php", "https://business.facebook.com/checkpoint/", "not a URL"]) assert.equal(P.supportsURL(url), false, url);
});
test("neutral paint classification preserves hue and transparent surfaces", () => {
  for (const value of ["rgb(255, 255, 255)", "rgb(0, 0, 0)", "rgb(240, 242, 245)", "rgb(28,43,51)", "rgb(40,57,67)", "rgba(20, 20, 20, 0.5)", "rgb(220 220 220 / 80%)"]) assert.ok(P.neutral(value), value);
  for (const value of ["rgb(24, 119, 242)", "rgb(255, 243, 205)", "rgba(0,0,0,0)", "transparent", "color(display-p3 1 0 0)"]) assert.equal(P.neutral(value), false, value);
  assert.ok(P.coloredSurface("rgb(255, 243, 205)"));
  assert.equal(P.coloredSurface("transparent"), false);
});
test("all packaged assets referenced by manifest and popup exist", () => {
  const m = JSON.parse(read("manifest.json"));
  const files = [...Object.values(m.icons), ...Object.values(m.action.default_icon), m.action.default_popup, ...m.content_scripts[0].css, ...m.content_scripts[0].js];
  for (const file of files) assert.ok(fs.existsSync(path.join(root, "extension", file)), file);
  assert.match(read("popup.html"), /role="switch"/);
  assert.ok(!/https?:\/\//.test(read("popup.html")));
});

function contentContext({ enabled = true, url = "https://business.facebook.com/latest/home", deferred = false } = {}) {
  const listeners = [];
  const calls = [];
  let finish;
  const value = deferred ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ enabled });
  const context = {
    browser: { storage: { local: { get: () => value }, onChanged: { addListener: fn => listeners.push(fn) } } },
    MetaBlackPolicy: P,
    MetaBlackEngine: class { enable() { calls.push("on"); } disable() { calls.push("off"); } },
    document: { documentElement: {} }, location: { href: url },
    URL, MutationObserver: class {}, console
  };
  vm.runInNewContext(read("content.js"), context);
  return { calls, finish, emit: (newValue, area = "local") => listeners.forEach(fn => fn({ enabled: { newValue } }, area)) };
}
test("stored off preference never speculatively enables the page", async () => {
  const c = contentContext({ enabled: false }); await tick();
  assert.deepEqual(c.calls, ["off"]);
});
test("default on and storage changes reach two independent open tabs immediately", async () => {
  const a = contentContext(); const b = contentContext(); await tick();
  assert.deepEqual(a.calls, ["on"]); assert.deepEqual(b.calls, ["on"]);
  a.emit(false); b.emit(false);
  assert.deepEqual(a.calls, ["on", "off"]); assert.deepEqual(b.calls, ["on", "off"]);
  a.emit(true); b.emit(true);
  assert.equal(a.calls.at(-1), "on"); assert.equal(b.calls.at(-1), "on");
});
test("a stale initial storage read cannot overwrite a newer toggle", async () => {
  const c = contentContext({ deferred: true });
  c.emit(false); c.finish({ enabled: true }); await tick();
  assert.deepEqual(c.calls, ["off"]);
});
test("unsupported pages do not attach a theme", async () => {
  const c = contentContext({ url: "https://www.facebook.com/" }); await tick();
  assert.deepEqual(c.calls, []);
});

function popupContext({ enabled = true, failSave = false, failRead = false } = {}) {
  const listeners = [];
  const events = {};
  const writes = [];
  const toggle = { disabled: true, checked: false, addEventListener: (name, fn) => { events[name] = fn; } };
  const status = { textContent: "" };
  const context = {
    document: { getElementById: id => id === "enabled" ? toggle : status },
    browser: { storage: {
      local: { get: async () => { if (failRead) throw Error("read failed"); return { enabled }; }, set: async value => { if (failSave) throw Error("save failed"); writes.push(value.enabled); } },
      onChanged: { addListener: fn => listeners.push(fn) }
    } }, console
  };
  vm.runInNewContext(read("popup.js"), context);
  return { toggle, status, events, writes, emit: value => listeners.forEach(fn => fn({ enabled: { newValue: value } }, "local")) };
}
test("popup reads, saves, and reflects storage updates", async () => {
  const p = popupContext(); await tick();
  assert.equal(p.toggle.checked, true); assert.equal(p.toggle.disabled, false);
  p.toggle.checked = false; await p.events.change();
  assert.deepEqual(p.writes, [false]); assert.match(p.status.textContent, /restored/);
  p.emit(true); assert.equal(p.toggle.checked, true);
});
test("popup failed saves restore the previous preference and show an error", async () => {
  const p = popupContext({ failSave: true }); await tick();
  p.toggle.checked = false; await p.events.change();
  assert.equal(p.toggle.checked, true); assert.equal(p.toggle.disabled, false); assert.match(p.status.textContent, /Couldn’t save/);
});
test("popup failed reads keep the toggle disabled", async () => {
  const p = popupContext({ failRead: true }); await tick();
  assert.equal(p.toggle.disabled, true); assert.match(p.status.textContent, /Couldn’t read/);
});

 test("Geo secondary ink is distinct from meaningful brand/status colors", () => {
  assert.ok(P.neutralInk("rgb(70,90,105)"));
  assert.equal(P.neutral("rgb(70,90,105)"), false);
  assert.equal(P.neutralInk("rgb(24,119,242)"), false);
  assert.equal(P.neutralInk("rgb(36,115,54)"), false);
});
