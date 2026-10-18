# Validation record — 18 October 2026

## 1.1.0 regression update

- **49/49 Safari fixture checks passed** and **12/12 Node tests passed** after the scrolling and visibility fixes. The 37/11 results below document the original 1.0.0 release.
- A burst of 100 virtualizer updates over a 500-node subtree produced **zero new native paint reads and zero paint-marker writes**. A layout-only class change sampled only the target, not its 500 descendants.
- Additional regressions confirm scroll deferral, repaint after scroll quiet, preserved inherited semantic colors, release of detached nodes, readable Meta secondary ink and CSS-mask navigation glyphs. Original media/preview/chart/off-on restoration checks still pass.
- The prior version incorrectly treated a CSS mask’s background as a panel, making sidebar glyphs dark; the mask adapter now paints neutral UI glyphs as ink. No image filters were added.
- Safari Settings confirmed the installed temporary extension at **1.1.0** after Reload. The affected Inbox tab was refreshed. The real toolbar popup showed 1.1.0, switched off to the original light appearance, then switched back on; it was left on. Sidebar glyphs/secondary text and newly rendered Inbox rows were visually checked while scrolling down and back up. No messages or ads were sent or changed.
- Pending work is delayed during active scrolling. Newly rendered content may acquire its final dark paint shortly after scrolling stops.
- Safari also logged a Meta GraphQL query failure in the authenticated Inbox before this update. The extension does not make or block those requests; this update does not claim to repair Meta server/query failures.


## Environment

| Item | Observed |
| --- | --- |
| macOS | 26.6.2, build 25G83 |
| Safari | 26.6.2, SafariDriver reports 21624.5.1.11.3 |
| Apple development tools | Command Line Tools active; full Xcode, converter and packager unavailable |
| Local validation tools | Node.js 26.0.0; Python 3.14.6; Safari's own WebKit renderer |
| Safari settings | Developer tab and Add Temporary Extension present; no security setting was changed by this task |

Apple's current [running/installing documentation](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension) and [packaging documentation](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari) were checked before choosing the temporary ZIP workflow. The optional wrapper script handles both current `safari-web-extension-packager` and earlier `safari-web-extension-converter` names.

## Results

- **37/37 rendering/behavior checks passed in actual Safari 26.6.2**, using `tests/fixture.html` with the shipped policy, engine and CSS. This was not a screenshot-only mockup or a Chromium result.
- **11/11 Node tests passed**, covering exact manifest scope, supported/authentication URLs, neutral/hue classification, packaged assets, default/saved-off preference, immediate storage-event delivery in two independent mocked contexts, a stale-read race, unsupported pages, and popup success/error behavior.
- JavaScript syntax, manifest JSON, shell syntax, ZIP integrity and manifest placement passed. Icon PNG dimensions and packaging are included in the release checks.
- The optional app-packaging script correctly reports the missing full-Xcode prerequisite. An actual Xcode build/signing run was unavailable.

The Safari fixture covers exact palette values; original creative source and absence of image filters; preview background/text preservation; chart and primary-action hues; warnings and errors; neutral gradients; Meta blue-gray text and pastel gradients; dark media fades; small monochrome UI icons; link contrast; neutral status dots; new rows; row reuse from neutral to warning and back; dialogs; selected calendar cell contrast; programmatic input editing; a 500-node commit settling without an observer loop; detached-node release; complete marker/custom-property cleanup; stopped observation/work while off; and re-enable without refreshing.

## Authenticated, read-only live checks

The existing Safari session was authenticated. A separate test window/tabs was used; the original inbox window was left open. The exact shipped policy/engine/CSS were copied from the local fixture into Safari Web Inspector as a reversible single-tab development preview. This exercises the theming code on the live DOM, but is **not an installed-extension lifecycle test**.

| Surface | Checked |
| --- | --- |
| Business Suite Home | Canvas, panels, navigation labels/selection, cover photo and its native fade, media thumbnails, form-like controls and colored primary actions |
| Business Suite Content | Home → Content SPA navigation without refresh; newly rendered post/reporting table and preserved thumbnails |
| Ads Manager campaigns | Actual populated campaign table, navigation, column headings, campaign links, status switches and reporting controls |
| Ads Manager date dropdown | Opened without changing dates; panel/text contrast and native selected date-range paint; Cancel used |
| Off/cleanup | Live preview removal reported `enabled: false` and `paintMarkers: 0` |

Live testing caught and fixed Meta's blue-gray ink, pastel workspace gradients, media fade overlays, low-contrast blue links, and selected calendar-cell contrast. Corresponding regressions are in the fixture. No campaigns/ads were created, edited, published, paused or deleted. No form values or account settings were changed. Temporary test tabs were closed, and the local test server was stopped after validation. Account identifiers, campaign data and live screenshots are not bundled in the source.

## Still unverified

- Cross-tab delivery in installed Safari extension contexts and preference persistence across Safari restarts remain unverified. The 1.1.0 reload, actual popup under `browser.*`, and off/on restoration were checked in the installed temporary extension. Existing host/profile permissions were retained; no security setting was changed.
- A signed macOS containing app, Apple certificate/provisioning configuration, App Store validation or distribution.
- The complete live ad editor, preview dialogs for every placement, every localization, large reporting dashboards and third-party embedded previews. No editor was opened because Meta can create/autosave drafts. These use the generic panel/form rules and defensive preview/chart adapters, with synthetic coverage only.
- Every Meta experiment, pixel-level creative comparisons, VoiceOver audit, forced-colors mode, private browsing, long-session profiling and every large account's performance. Some original dark raster UI glyphs/logos can remain low contrast; original raster media is deliberately preserved.

## Rerun locally

1. In Terminal, change into the `MetaBlack` project directory.
2. Run `bash scripts/validate.sh` for the source/preference checks and install ZIP.
3. Run `python3 -m http.server 8765 --bind 127.0.0.1` from that directory.
4. In Safari open [the local fixture](http://localhost:8765/tests/fixture.html), then click **Run checks**. Expect **49/49 checks passed**. The synthetic data, artwork and fake form are safe to interact with.
5. Test keyboard focus, the theme toggle, additional rows, the test dialog and scrolling visually. Stop the server with Control-C when finished.

The fixture's **Copy developer preview** button is development-only. It copies the exact local theme code, which can be inspected before running it in a supported page's Web Inspector. It does not install an extension or call campaign APIs. Its preview can be removed with `__metaBlackPreview.remove()` or a reload. It is excluded from the install ZIP. Normal users should follow INSTALL.md instead.

After installing, verify the real toolbar switch with two supported tabs, reload once, and restart Safari to assess your chosen installation's lifetime. With the theme off, compare native warnings, charts and creatives; turn it on and ensure only workspace paint changes. Do not exercise campaign mutation actions as part of a visual check.
