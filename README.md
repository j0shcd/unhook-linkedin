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

Requires Node 20+ and pnpm.
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
