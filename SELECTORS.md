# Theme policy and selector maintenance

The production source is split into `policy.js` (site boundaries), `engine.js` (bounded classification), `theme.css` (paint), and the small storage/popup scripts. Generated Meta classes are not used.

## Stable foundations

- HTML and ARIA landmarks identify navigation, main content, complementary/editor panels, tables, table headers, menus, listboxes, options, dialogs and tooltips. These are styling hints, not assumptions about how Meta implements an action.
- Paint is classified from computed colors. Secondary steel-blue text such as `rgb(70,90,105)` has its own ink classifier; this does not widen the background/warning-color classifier. RGB channel spread up to 32 includes Meta Geo's blue-gray ink (`rgb(28,43,51)`) and selected navigation (`rgb(40,57,67)`). Blue-tinted neutral surfaces receive a distinct #292929 emphasis. Unknown color formats and visibly chromatic paint are left native.
- Light neutral/pastel gradients are removed only outside preserved islands. Dark gradients remain native because they commonly shade media. Any URL-based background image remains native and its subtree is conservatively preserved.
- Native checked/radio/switch/progress controls, alerts/status regions, and small solid circular status dots are preserved. Chromatic surfaces preserve their subtree's native text/backdrop to prevent white text on pale yellow/red warnings.
- Actual anchors and ARIA links with blue ink receive a readable blue accent; chart/status hues do not use that adapter. Neutral error-field borders defer to native `:invalid` and `aria-invalid` paint.
- Small neutral CSS-mask nodes outside preserved artwork use background paint as glyph ink and are explicitly mapped to #EAEAEA. Mask geometry and URLs remain native; colored masks remain native.
- Tiny decorative or interactive SVGs without image roles/labels qualify as UI icons only if both dimensions are at most 32 px and their sampled fills/strokes are entirely neutral. SVG images, gradients, patterns, external uses, colored marks and all larger/labeled SVGs are excluded.

## Adapters that can become fragile

| Selector family | Why present | Maintenance risk |
| --- | --- | --- |
| `data-pagelet` containing `AdPreview`/`CreativePreview`, `data-testid` containing `ad_preview`/`ad-preview`/`creative_preview`/`creative-preview` | Preserve preview content and its light/native text backdrop | Meta does not promise these testing/implementation attributes. The inspected Business Suite Home DOM had no matching preview marker; these are defensive adapters, not claimed live-verified editor selectors. |
| `data-testid`/`data-pagelet` containing `chart`, `aria-roledescription="chart"`, `role="img"` | Keep chart palettes and plotting canvases native | Some charts expose no marker. Canvas/SVG pixels are still left alone; a surrounding neutral panel can become dark. |
| English `aria-label` values `Ad preview`, `Ad preview:…`, `Creative preview`, `Preview` | Fallback for accessible preview regions/dialogs | Labels vary by product and locale. Add verified localized/structural adapters when available. A preview button may be conservatively excluded too. |
| `.fbAdPreview`, `.fbAdPreviewContainer` | Legacy Facebook preview renderer | These are semantic legacy names, but may disappear. They are not the basis of the theme. |
| `#mount_0_0`, `#content`, `#globalContainer` | Older app canvas hints | Optional hints only. Landmarks plus the large-shell fallback work without them. |
| Dominant neutral shell geometry | Geo sometimes has no `main` landmark | A neutral surface with computed CSS dimensions of at least 65% of viewport width and 80% of height becomes #000000. Smaller panels stay #111111. Recomputed after a debounced window resize. A very large dialog may therefore use black; its layout is unaffected. |

## Updating safely

Inspect a specific problem in Safari's Elements inspector. Prefer a semantic landmark or descriptive attribute that encloses only the creative/chart. Add that boundary in `policy.js`, then add a corresponding synthetic regression in `tests/fixture.html` and `fixture.js`. Do not add a global `div`, `*`, text-string matcher, or generated-class recolor rule to solve one preview. Do not theme every iframe: host permissions deliberately exclude external previews.

Every paint selector must remain gated by `data-mb-enabled`, exclude probe elements, and exclude preserved subtrees. New markers must join the engine's cleanup list. Changes must preserve off/on restoration, virtualized row reuse and warning contrast.

The observer filters attributes rather than watching every mutation type. It does not inspect text content, input values, scroll positions or clicks. It deliberately does not patch Meta's history APIs or intercept navigation. SPA navigation and portals are handled as ordinary added/mutated subtrees. A CSS-only state/stylesheet replacement with no DOM mutation can need a later render, resize or toggle to reclassify; this is a conservative lightweight tradeoff.

## Scrolling regression fix (1.1.0)

The first version probed each element and its ancestors, repeatedly alternating DOM writes, computed-style reads and geometry reads. It also treated every style/class mutation as a request to walk the whole changed subtree, and a burst could escalate to a document rescan. Virtualized lists therefore generated excessive work while scrolling.

Version 1.1.0 fingerprints only paint-relevant inline properties and semantic attributes. Layout-only transform, width/height and top/left changes do not trigger native style reads or paint-marker writes. Class changes sample the target; native ink/inherited custom-property changes and leaving preserved islands are the cases that propagate. Cached moved nodes avoid repeated classification. Each batch temporarily removes the theme gate synchronously, reads all native plans, writes only changed markers, and restores the gate in `finally` before yielding. There are no per-node probe markers or `getBoundingClientRect` calls. Removed nodes are pruned in small chunks. A passive scroll listener delays pending work until 120 ms after the most recent scroll event.

The fixture now includes 100 layout changes over a 500-node subtree, zero-read/zero-write assertions, shallow class changes, inherited semantic ink updates, scroll deferral, mask-icon contrast and secondary-ink contrast. New content can take a short moment to receive its final paint after scrolling ends; the engine never hides the page or changes its scrolling/layout.
