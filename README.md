# Unhook for LinkedIn

Get your work done without distraction. Fully private, no tracking.

[Download now for Chrome](https://chromewebstore.google.com/detail/unhook-for-linkedin-block/jfpafmnlbhjckldaoadpbaknhdnopkif?hl=en-GB&authuser=1)

[Download now for Firefox](https://addons.mozilla.org/en-US/firefox/addon/unhook-for-linkedin/)

A lightweight browser extension that hides the LinkedIn home feed, while keeping what's useful (messages, jobs, your network).
It works entirely on-device: no accounts, no analytics, no automatic network requests.

## Features

- **Block the home feed** at `linkedin.com/feed`, with an optional redirect to
  your Messages or the Jobs page instead.
- **Pause anytime** with one click.
- **Light / dark / system** theme.

## Privacy

The extension collects nothing, sends nothing, and shares nothing. Your settings
are stored locally on your device. See [`PRIVACY.md`](./PRIVACY.md) or the
[public policy page](https://j0shcd.github.io/unhook-linkedin/privacy.html).

## Tech

Built with [WXT](https://wxt.dev/), React, and Tailwind CSS. The hiding is done
with CSS gated by `data-unhook-*` attributes on `<html>`, so toggles apply live
without reloading the page.

## Development

Requires patched Node 24.22.1+ in the 24.x line and pnpm 11.5.1.
Firefox builds target Firefox 121+.

```bash
pnpm install          # install dependencies
pnpm dev              # run in Chrome (dev)
pnpm dev:firefox      # run in Firefox (dev)
pnpm compile          # type-check (tsc --noEmit)
pnpm check            # type-check and production-build both browsers
pnpm build            # production build (Chrome)
pnpm build:firefox    # production build (Firefox)
pnpm zip              # packaged .zip for the Chrome Web Store
pnpm zip:firefox      # packaged .zip for Firefox Add-ons (AMO)
```

Build output lands in `.output/`.

### Loading the production build manually

To test against your real, logged-in LinkedIn account:

- **Chrome:** `pnpm build`, then go to `chrome://extensions`, enable
  **Developer mode**, click **Load unpacked**, and select
  `.output/chrome-mv3`.
- **Firefox:** `pnpm build:firefox`, then go to `about:debugging` → **This
  Firefox** → **Load Temporary Add-on**, and select any file inside
  `.output/firefox-mv2` (e.g. `manifest.json`).

## License

Dual-licensed under **AGPL-3.0** (see [`LICENSE`](./LICENSE)) or a **commercial
license**. See [`LICENSING.md`](./LICENSING.md) for details and how to obtain a
commercial license.

_Unhook for LinkedIn is an independent project and is not affiliated with,
endorsed by, or sponsored by LinkedIn Corporation._

## Dependency security

The 29 October 2026 cleanup updates WXT 0.19 to 0.21.5 and its React module to
1.2.2. The module owns its Vite React plugin, removing the unused direct plugin.
Deprecated sandbox/storage imports use the documented wxt/utils paths; the
obsolete Gecko type-error suppression is removed. Settings and behavior are
unchanged. No browser installation, store upload or deployment was performed.

The full pnpm audit falls from 54 advisory matches (two critical, 36 high) to
one moderate: phin 2.9.3 through potrace/Jimp,
[GHSA-x565-32qp-m3vf](https://github.com/advisories/GHSA-x565-32qp-m3vf).
That HTTP client is a development dependency, not shipped extension code.
The inspected icon generator supplies local buffers without HTTP requests or
sensitive headers. This limits that path's exposure but does not remove the
finding. Next bounded step: update/replace icon generation with verified output
parity; do not force a phin major override under its old parent.

The clean installation replaces the corrupted iCloud dependency tree.
pnpm check passes types and Chrome MV3/Firefox MV2 production builds in both
the isolated candidate and actual checkout. Production manifests retain storage
plus LinkedIn-only host access, document_start injection, Firefox 121 minimum,
the existing extension ID and the no-data-collection declaration. The previous
Chrome output was a development build, not a production permission baseline.

Run pnpm security:audit for a fresh result; it intentionally stays red for the
moderate finding. Runtime browser verification was blocked by automatic approval
review under the global rule requiring explicit permission for scripted browser
launches; it is not claimed performed. Build/manifest checks pass, and browser
verification remains a separately approved fixture check or manual release step.
These changes are local; each push requires owner confirmation.
