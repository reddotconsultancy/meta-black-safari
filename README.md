# Meta Black 1.1.0

A small Safari Web Extension for Meta Business Suite and Ads Manager. Main canvases use **#000000**, panels **#111111**, neutral text **#EAEAEA**, and borders **#292929**. Links use a readable blue accent. Everything runs locally.

**Start with [INSTALL.md](INSTALL.md).** Verified on Safari **26.6.2** on macOS **26.6.2**. Its Developer settings include **Add Temporary Extension…**, so you can install the `extension` folder or a locally packaged ZIP without Xcode. This is a temporary development installation, removed on quitting Safari or after 24 hours. A signed containing-app workflow is also documented.

## Included

- `extension/`: complete, unbundled Manifest V3 source and seven original PNG icons.
- `scripts/package.py`: reproducible packaging procedure; creates a ZIP whose root contains `manifest.json`.
- `scripts/package-safari.sh`: optional Apple packager/converter launcher for a macOS containing-app project after full Xcode is installed.
- `tests/`: synthetic visual fixture, original test artwork, and dependency-free Node tests.
- [SELECTORS.md](SELECTORS.md): site adapters, preservation rules, and maintenance notes.
- [TESTING.md](TESTING.md): validation performed, how to rerun it, and remaining checks.

## How it works

Safari injects a gated CSS sheet and a small content script at `document_start`. The script reads the saved `browser.storage.local` preference before enabling the theme. The popup changes that preference; Safari's storage-change event updates every open, permitted supported tab immediately. No background worker or tabs permission is required. Existing tabs need one refresh after the initial installation.

Meta mixes semantic markup with generated classes and inline paint. The engine classifies neutral computed backgrounds, text, and borders, then adds extension-owned `data-mb-*` markers. CSS supplies the actual colors. It does not rewrite Meta's style declarations, change text, replace controls, or cancel page events. A single observer handles added subtrees and a limited attribute list. Paint fingerprints ignore virtualizer transforms, sizes and offsets. Unchanged elements are cached; routine attribute changes revisit only the changed element. Native styles are read together in batches of at most 48 candidates before any paint markers are written, with no per-element or ancestor probes. Pending paint work waits for 120 ms of scroll quiet. Scroll observation is passive and never changes scroll positions. Inheritance changes still propagate to descendants. Protected subtrees are pruned. Disabling stops observation, cancels queued work, removes the markers, and restores any temporary custom properties at preservation boundaries.

Images, videos, iframes and creative pixels stay native. Recognized preview/chart boundaries, colored surfaces, status controls, warning regions, and media fade gradients retain their appearance. Charts may keep their original light plotting canvas. Small neutral CSS-mask glyphs use light ink instead of a dark panel fill. Tiny decorative or interactive and entirely monochrome SVG UI icons are adapted for contrast; labeled SVG artwork, colored icons and chart series are preserved. No whole-page inversion or image filters are used.

## Scope and privacy

Only these two HTTPS hosts are requested:

| Host | Purpose |
| --- | --- |
| `business.facebook.com` | Business Suite, its dynamic tools and legacy business/Ads Manager routes |
| `adsmanager.facebook.com` | Current Ads Manager, reporting and related routes; confirmed in the authenticated interface |

No `*.facebook.com`, personal Facebook feed, Instagram, Meta login service, CDN, or external preview hosts are requested. CDN media still loads through Meta normally. Embedded frames are left alone (`all_frames: false`). Authentication/checkpoint routes on the supported hosts are skipped. No additional host was needed in the inspected interfaces. If Meta introduces a different workspace host, review it before widening the manifest.

The sole API permission is `storage`. Only the boolean theme preference is saved. The production extension does not read input values, campaign data, cookies or credentials, and makes no network requests. It contains no analytics, remote libraries, external fonts, or external services. Page styles and structure are inspected in memory for theming and are never transmitted or logged.

## Validation and limits

The actual Safari/WebKit engine was used for the synthetic fixture. Authenticated Business Suite and Ads Manager were also inspected and tested using reversible, exact-source Web Inspector previews. Business Suite navigation from Home to Content kept the theme active without refreshing. No campaigns or ads were created, edited, published, paused, or deleted.

The installed 1.1.0 extension was reloaded in Safari, the affected Inbox tab was refreshed, and the actual toolbar off/on switch was checked. Cross-tab delivery, restart persistence and the signed containing-app build still need separate validation. The complete ad editor and every localized preview variant were not live-tested. Meta changes frequently: preview boundary adapters are conservative but cannot guarantee detection of an unlabelled future preview. See [TESTING.md](TESTING.md) for the precise coverage. A short flash can still occur while Safari retrieves the preference or Meta renders a large new subtree; the page is never hidden to mask it.

## Development

From this directory, run `bash scripts/validate.sh` with Node.js and Python 3 installed. The extension itself has no runtime dependencies. Rebuilding the PNG icons additionally needs Pillow; the generated icons are already included. See [TESTING.md](TESTING.md) for Safari rendering tests.

After changing sources, run `python3 scripts/package.py`, then reload the temporary extension in Safari Settings. Refresh supported pages after changing the installed content script. Toggling the running theme does not require refreshing.

GitHub updates do not automatically update Safari. To use new code, pull the latest sources, reload the temporary extension (or rebuild its containing app), and refresh Meta tabs once.
