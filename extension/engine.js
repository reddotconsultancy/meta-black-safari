/* Event-driven paint adapter. Native styles are read once per batch, before writes. */
(function (root) {
  "use strict";
  const P = root.MetaBlackPolicy;
  const paintAttrs = ["data-mb-bg", "data-mb-ink", "data-mb-link", "data-mb-border", "data-mb-gradient", "data-mb-preserve", "data-mb-probe", "data-mb-svg-ink", "data-mb-svg-fill", "data-mb-svg-stroke"];
  const nativeVars = ["--mb-native-ink", "--mb-native-bg"];
  const watchedAttrs = ["class", "style", "role", "id", "aria-label", "aria-roledescription", "aria-selected", "aria-current", "aria-checked", "aria-disabled", "aria-invalid", "data-testid", "data-pagelet", "fill", "stroke"];
  const sides = ["top", "right", "bottom", "left"];
  const svgNS = "http://www.w3.org/2000/svg";
  const htmlNS = "http://www.w3.org/1999/xhtml";
  const interactive = "a,button,[role='button'],[role='link'],[role='tab']";
  const media = "img,picture,video,audio,canvas,iframe,object,embed";
  const appearanceProperty = /^(color$|background|border|fill$|stroke|mask|-webkit-mask|box-shadow$|text-shadow$|outline|--)/;

  class MetaBlackEngine {
    constructor(doc) {
      this.doc = doc;
      this.win = doc.defaultView;
      this.enabled = false;
      this.touched = new Set();
      this.originalVars = new WeakMap();
      this.cache = new WeakMap();
      this.icons = new WeakMap();
      this.pending = new Map();
      this.walker = null;
      this.frame = this.timer = null;
      this.lastScroll = -Infinity;
      this.stats = { samples: 0, batches: 0, attributeWrites: 0, cacheHits: 0, ignoredLayoutChanges: 0 };
      this.observer = new this.win.MutationObserver(records => this.mutations(records));
      this.onReady = () => this.enqueue(this.doc.body || this.doc.documentElement, true, true);
      this.onLoad = event => { if (event.target?.matches?.("link[rel='stylesheet']")) this.onReady(); };
      this.onPageShow = () => { if (this.enabled) this.onReady(); };
      this.onResize = () => {
        this.win.clearTimeout(this.resizeTimer);
        this.resizeTimer = this.win.setTimeout(this.onReady, 180);
      };
      // Passive observation only. No scroll coordinates, anchoring, or styles are changed.
      this.onScroll = () => { this.lastScroll = this.win.performance.now(); };
    }

    get hasWork() { return !!(this.pending.size || this.walker || this.needsPrune || this.pruner); }

    enable() {
      if (this.enabled) return;
      this.enabled = true;
      this.doc.documentElement.setAttribute("data-mb-enabled", "");
      this.observe();
      this.doc.addEventListener("DOMContentLoaded", this.onReady, { once: true });
      this.doc.addEventListener("load", this.onLoad, true);
      this.doc.addEventListener("scroll", this.onScroll, { capture: true, passive: true });
      this.win.addEventListener("pageshow", this.onPageShow);
      this.win.addEventListener("resize", this.onResize);
      this.enqueue(this.doc.documentElement, true);
      this.flush();
    }

    disable() {
      this.enabled = false;
      this.observer.disconnect();
      this.cancel();
      this.win.clearTimeout(this.resizeTimer);
      this.pending.clear();
      this.walker = this.pruner = null;
      this.needsPrune = false;
      this.doc.documentElement.removeAttribute("data-mb-enabled");
      this.doc.removeEventListener("DOMContentLoaded", this.onReady);
      this.doc.removeEventListener("load", this.onLoad, true);
      this.doc.removeEventListener("scroll", this.onScroll, true);
      this.win.removeEventListener("pageshow", this.onPageShow);
      this.win.removeEventListener("resize", this.onResize);
      for (const node of this.touched) this.clean(node);
      this.touched.clear();
      this.cache = new WeakMap();
      this.icons = new WeakMap();
    }

    observe() {
      if (this.enabled) this.observer.observe(this.doc.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: watchedAttrs
      });
    }

    inlineKey(node, variablesOnly = false) {
      return [...node.style].filter(name => !name.startsWith("--mb-")
        && (variablesOnly ? name.startsWith("--") : appearanceProperty.test(name)))
        .sort().map(name => `${name}:${node.style.getPropertyValue(name)}!${node.style.getPropertyPriority(name)}`).join(";");
    }

    signature(node) {
      return watchedAttrs.filter(name => name !== "style").map(name => node.getAttribute(name) || "").join("\u0001") + "\u0002" + this.inlineKey(node);
    }

    mutations(records) {
      for (const record of records) {
        if (record.type === "attributes") {
          const node = record.target;
          if (node.namespaceURI === svgNS) {
            this.enqueue(node.localName === "svg" ? node : node.ownerSVGElement, false, true);
            continue;
          }
          const previous = this.cache.get(node);
          if (previous && previous.signature === this.signature(node)) {
            if (record.attributeName === "style") this.stats.ignoredLayoutChanges++;
            continue; // Virtualizer translate/height/top updates do not change paint.
          }
          const inheritedVariablesChanged = previous && previous.variables !== this.inlineKey(node, true);
          this.enqueue(node, !!inheritedVariablesChanged, !!inheritedVariablesChanged);
        } else {
          for (const node of record.addedNodes) if (node.nodeType === 1) this.enqueue(node, true);
          if ([...record.removedNodes].some(node => node.nodeType === 1)) this.needsPrune = true;
        }
      }
      if (this.hasWork) this.schedule();
    }

    enqueue(node, deep = true, force = false) {
      if (!this.enabled || !node?.isConnected) return;
      const previous = this.pending.get(node);
      this.pending.set(node, { deep: deep || !!previous?.deep, force: force || !!previous?.force });
      // Never turn a burst of scrolling mutations into a forced full-page rescan.
      this.schedule();
    }

    schedule(delay = 16) {
      if (!this.enabled || this.timer !== null || this.frame !== null) return;
      this.timer = this.win.setTimeout(() => this.flush(), delay);
    }

    cancel() {
      if (this.timer !== null) this.win.clearTimeout(this.timer);
      this.timer = this.frame = null;
    }

    *walk(start, deep, force) {
      const stack = [start];
      while (stack.length) {
        const node = stack.pop();
        if (!node.isConnected || node.nodeType !== 1 || node.parentElement?.closest("[data-mb-preserve]")) continue;
        if (node.namespaceURI === svgNS) {
          if (node.localName === "svg") yield { node, force };
          continue;
        }
        if (node.namespaceURI !== htmlNS || node.matches(P.ignoreSelectors) || node.matches(media)) continue;
        yield { node, force };
        if (deep && !node.matches(P.protectedSelectors) && !node.hasAttribute("data-mb-preserve")) {
          for (let child = node.lastElementChild; child; child = child.previousElementSibling) stack.push(child);
        }
      }
    }

    flush() {
      this.cancel();
      if (!this.enabled) return;
      const quietIn = 120 - (this.win.performance.now() - this.lastScroll);
      if (quietIn > 0) { this.schedule(quietIn); return; }
      const waiting = this.observer.takeRecords();
      if (waiting.length) this.mutations(waiting);
      this.cancel();
      this.observer.disconnect();
      const candidates = [];
      const rootNode = this.doc.documentElement;
      try {
        // Traversal/cache checks have their own small budget; no DOM writes here.
        const deadline = this.win.performance.now() + 3;
        let visited = 0;
        while (candidates.length < 48 && visited++ < 400 && this.win.performance.now() < deadline) {
          if (!this.walker) {
            const next = this.pending.entries().next();
            if (next.done) break;
            this.pending.delete(next.value[0]);
            this.walker = this.walk(next.value[0], next.value[1].deep, next.value[1].force);
          }
          const next = this.walker.next();
          if (next.done) { this.walker = null; continue; }
          const { node, force } = next.value;
          const signature = this.signature(node);
          if (!force && this.cache.get(node)?.signature === signature) { this.stats.cacheHits++; continue; }
          candidates.push({ node, signature });
        }
        if (candidates.length) {
          // One synchronous native-style read phase for the whole batch. There
          // are no per-element probes, read/write alternation, or ancestor probes.
          // Finally restores the gate even if a read fails; no intermediate paint.
          rootNode.removeAttribute("data-mb-enabled");
          const plans = candidates.map(({ node, signature }) => this.read(node, signature));
          for (const plan of plans) this.apply(plan);
          this.stats.batches++;
        }
        if (this.needsPrune && !this.pruner) { this.pruner = this.touched.values(); this.needsPrune = false; }
        for (let count = 0; this.pruner && count < 160; count++) {
          const next = this.pruner.next();
          if (next.done) { this.pruner = null; break; }
          if (!next.value.isConnected) {
            this.clean(next.value); this.touched.delete(next.value); this.cache.delete(next.value);
          }
        }
      } finally {
        if (this.enabled && !rootNode.hasAttribute("data-mb-enabled")) rootNode.setAttribute("data-mb-enabled", "");
        this.observe();
      }
      if (this.hasWork) this.schedule();
    }

    read(node, signature) {
      this.stats.samples++;
      const style = this.win.getComputedStyle(node);
      const bg = style.backgroundColor;
      const ink = style.color;
      const image = style.backgroundImage;
      const width = parseFloat(style.width) || 0;
      const height = parseFloat(style.height) || 0;
      const attrs = {};
      const plan = { node, signature, variables: this.inlineKey(node, true), ink, attrs };
      if (node.namespaceURI === svgNS) return this.readIcon(plan, style, width, height);
      const mask = (style.maskImage && style.maskImage !== "none") || (style.webkitMaskImage && style.webkitMaskImage !== "none");
      const maskIcon = mask && width > 0 && height > 0 && width <= 32 && height <= 32
        && !node.matches("[role='img']") && P.neutralInk(bg);
      const radius = parseFloat(style.borderTopLeftRadius);
      const statusDot = !mask && P.neutral(bg) && width > 0 && height > 0 && width <= 12 && height <= 12
        && radius >= Math.min(width, height) / 2;
      const colors = image.match(/rgba?\([^)]+\)/g) || [];
      const grayGradient = /gradient\(/.test(image) && !/url\(/.test(image)
        && colors.some(c => P.rgba(c)?.slice(0, 3).some(channel => channel >= 128))
        && colors.every(c => P.neutral(c) || P.rgba(c)?.[3] === 0);
      const protectedNode = node.matches(P.protectedSelectors) || statusDot || (!maskIcon && P.coloredSurface(bg))
        || (image !== "none" && !grayGradient);
      if (protectedNode) {
        attrs["data-mb-preserve"] = "";
        let backdrop = bg;
        if (node.matches("[data-pagelet*='preview' i],[data-testid*='preview' i],[aria-label*='preview' i],[data-pagelet*='chart' i],[data-testid*='chart' i],[aria-roledescription='chart' i],.fbAdPreview,.fbAdPreviewContainer") && (P.rgba(bg)?.[3] ?? 1) < 1) {
          for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const candidate = this.win.getComputedStyle(parent).backgroundColor;
            if ((P.rgba(candidate)?.[3] ?? 0) === 1) { backdrop = candidate; break; }
          }
          if ((P.rgba(backdrop)?.[3] ?? 0) < 1) backdrop = "rgb(255, 255, 255)";
        }
        plan.native = { ink, bg: backdrop };
        return plan;
      }
      if (maskIcon) attrs["data-mb-bg"] = "icon";
      else if (P.neutral(bg) || grayGradient) {
        const channels = P.rgba(bg);
        const canvas = node.matches(P.mainSelectors) || (width >= this.win.innerWidth * .65 && height >= this.win.innerHeight * .8);
        attrs["data-mb-bg"] = canvas ? "main" : channels && channels[2] - channels[0] > 18 ? "emphasis" : "panel";
      }
      if (P.neutralInk(ink)) attrs["data-mb-ink"] = "";
      const linkInk = P.rgba(ink);
      if (linkInk && linkInk[2] > linkInk[0] + 40 && linkInk[2] > linkInk[1] + 20 && node.closest("a,[role='link']")) attrs["data-mb-link"] = "";
      const borders = sides.filter(side => P.neutral(style.getPropertyValue(`border-${side}-color`)) && parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0);
      if (borders.length) attrs["data-mb-border"] = borders.join(" ");
      if (grayGradient) attrs["data-mb-gradient"] = "";
      return plan;
    }

    readIcon(plan, style, width, height) {
      const svg = plan.node;
      const previous = this.icons.get(svg) || [];
      const eligible = width > 0 && height > 0 && width <= 32 && height <= 32
        && !svg.matches("[role='img'],[aria-label]") && (svg.matches("[aria-hidden='true']") || svg.closest(interactive))
        && !svg.querySelector("image,foreignObject,linearGradient,radialGradient,pattern,use");
      const nodes = eligible ? [svg, ...svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon,g,text")] : [];
      const samples = nodes.length <= 64 ? nodes.map(node => {
        const s = node === svg ? style : this.win.getComputedStyle(node);
        return { node, ink: s.color, fill: s.fill, stroke: s.stroke };
      }) : [];
      const monochrome = samples.length && samples.every(s => [s.fill, s.stroke].every(color => color === "none" || P.neutralInk(color)));
      plan.iconNodes = monochrome ? nodes : [];
      plan.iconPlans = [...new Set([...previous, ...nodes])].map(node => {
        const attrs = {};
        const sample = monochrome && samples.find(s => s.node === node);
        if (sample) {
          if (P.neutralInk(sample.ink)) attrs["data-mb-svg-ink"] = "";
          if (P.neutralInk(sample.fill)) attrs["data-mb-svg-fill"] = "";
          if (P.neutralInk(sample.stroke)) attrs["data-mb-svg-stroke"] = "";
        }
        return { node, attrs };
      });
      return plan;
    }

    writeAttrs(node, desired) {
      for (const name of paintAttrs) {
        if (Object.hasOwn(desired, name)) {
          if (node.getAttribute(name) !== desired[name]) { node.setAttribute(name, desired[name]); this.stats.attributeWrites++; }
        } else if (node.hasAttribute(name)) { node.removeAttribute(name); this.stats.attributeWrites++; }
      }
      if (Object.keys(desired).length) this.touched.add(node);
      else this.touched.delete(node);
    }

    apply(plan) {
      const { node, attrs } = plan;
      if (!node.isConnected || node.parentElement?.closest("[data-mb-preserve]")) return;
      const previous = this.cache.get(node);
      const wasPreserved = node.hasAttribute("data-mb-preserve");
      if (plan.native) {
        if (!this.originalVars.has(node)) this.originalVars.set(node, nativeVars.map(name => [node.style.getPropertyValue(name), node.style.getPropertyPriority(name)]));
        [plan.native.ink, plan.native.bg].forEach((value, index) => {
          if (node.style.getPropertyValue(nativeVars[index]) !== value) node.style.setProperty(nativeVars[index], value);
        });
      } else this.restoreVars(node);
      this.writeAttrs(node, attrs);
      if (plan.iconPlans) {
        for (const iconPlan of plan.iconPlans) this.writeAttrs(iconPlan.node, iconPlan.attrs);
        this.icons.set(node, plan.iconNodes);
      }
      this.cache.set(node, { signature: plan.signature, variables: plan.variables, ink: plan.ink });
      // Inheritance changes and leaving protected islands need descendants;
      // routine class/style changes only need the changed element.
      if (!plan.native && (wasPreserved || (previous && previous.ink !== plan.ink))) {
        for (const child of node.children) this.enqueue(child, true, true);
      }
    }

    restoreVars(node) {
      const saved = this.originalVars.get(node);
      if (!saved) return;
      nativeVars.forEach((name, index) => {
        if (saved[index][0]) node.style.setProperty(name, ...saved[index]);
        else node.style.removeProperty(name);
      });
      this.originalVars.delete(node);
      if (node.getAttribute("style") === "") node.removeAttribute("style");
    }

    clean(node) {
      this.writeAttrs(node, {});
      this.restoreVars(node);
    }
  }
  root.MetaBlackEngine = MetaBlackEngine;
})(globalThis);
