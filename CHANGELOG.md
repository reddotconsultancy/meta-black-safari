# 1.1.0 — 18 October 2026

Fixes scrolling jitter and low-contrast Business Suite controls reported after the initial installation.

- Ignore layout-only inline transforms, positions and dimensions used by Meta virtualizers.
- Cache paint fingerprints; sample the target of a class change without recursively rescanning its subtree unless inheritance/protection changes.
- Batch native style reads before writes. Remove per-element/ancestor probes and bounding-rectangle reads; write only changed markers.
- Delay pending paint until 120 ms of scroll quiet, using a passive listener.
- Paint small neutral CSS-mask glyphs as ink, including sidebar icons whose links are overlaid siblings. Preserve colored status masks and artwork.
- Adapt secondary Geo ink `rgb(70,90,105)` without broadening the background/warning classifier.
- Prune detached elements in chunks and ignore text-only removals for pruning.
- Show version 1.1.0 in the popup. Host/API permissions are unchanged.

Validation: 49 Safari fixture checks and 12 Node tests. Safari's installed temporary extension was reloaded and the actual Inbox, scrolling, sidebar glyphs, secondary text and toolbar off/on behavior were checked. Meta's own GraphQL loading failure was observed separately; no network/request behavior was changed.
