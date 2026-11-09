# Unhook for LinkedIn

Get your work done without distraction. Fully private, no tracking.

[Download now for Chrome](https://chromewebstore.google.com/detail/unhook-for-linkedin-block/jfpafmnlbhjckldaoadpbaknhdnopkif?hl=en-GB&authuser=1)

[Download now for Firefox](https://addons.mozilla.org/en-US/firefox/addon/unhook-for-linkedin/)

A lightweight browser extension that hides the LinkedIn home feed, while keeping what's useful (messages, jobs, your network).
It works entirely on-device: no accounts, no analytics, no automatic network requests.

## Features

- **Block the home feed** at `linkedin.com/feed/` and `linkedin.com/feed/foryou/`,
  with an optional redirect to your Messages or the Jobs page instead.
- **Pause anytime** with one click.
- **Light / dark / system** theme.

If settings cannot be loaded, the popup shows **Try again** and the LinkedIn
page stays usable without blocking. A later settings change restores normal
operation. Failed saves keep your selection visible with a retry button.

## Privacy

The extension collects nothing, sends nothing, and shares nothing. Your settings
are stored locally on your device. See [`PRIVACY.md`](./PRIVACY.md) or the
[public policy page](https://j0shcd.github.io/unhook-linkedin/privacy.html).

## Tech

Built with [WXT](https://wxt.dev/), React, and Tailwind CSS. The hiding is done
with CSS gated by `data-unhook-*` attributes on `<html>`, so toggles apply live
without reloading the page.

## Development

Requires patched Node 24.22.1+ in the 24.x line and pnpm 11.28.8.
Firefox builds target Firefox 121+.

```bash
pnpm install          # install dependencies
pnpm dev              # run in Chrome (dev)
pnpm dev:firefox      # run in Firefox (dev)
pnpm compile          # type-check (tsc --noEmit)
pnpm test             # regression tests (no browser launch)
pnpm check            # tests, type-check and production-build both browsers
pnpm build            # production build (Chrome)
pnpm build:firefox    # production build (Firefox)
pnpm zip              # packaged .zip for the Chrome Web Store
pnpm zip:firefox      # packaged .zip for Firefox Add-ons (AMO)
```

Build output lands in `.output/`.

The feed routes share one pathname matcher for blocking, redirects, and the
early click gate. Both routes accept an optional trailing slash and query
parameters; individual post pages remain accessible. Feed targeting selects
direct children of the recognized feed containers, excluding the composer;
it does not scan post descendants or action labels. Regression tests execute
the content script with a small DOM and storage fixture, covering startup,
settings changes, dynamically inserted posts, and client-side navigation.
They do not verify browser layout or LinkedIn's current markup.

Settings tests control storage reads, writes, and notifications to cover queued
edits, failed saves, startup recovery, and stale reads. The popup keeps the latest
requested settings while writes finish; notifications trigger a fresh read
instead of applying an older snapshot. Redirect exclusivity is enforced in
`lib/settings.ts`: choosing a destination clears the other, and existing stored
values with both enabled retain the previous Messages priority.

### Reinstall recovery

`pnpm reinstall` installs outside iCloud, then retains the previous dependency
tree, generated WXT state, and manifests until `pnpm rebuild` and `wxt prepare`
succeed. Failed preparation or a handled interrupt restores the previous
generation. The helper refuses symlinked targets and concurrent reinstalls or
recoveries using an operating-system lock (`lockf` on macOS/BSD, `flock` on
Linux). Keep the ignored `.reinstall.lock` file in place; it holds no settings
or recovery state, and its existence does not mean a process is active.
Fault-injection tests cover success, failures, interrupts, and recovery without
installing real dependencies.

After an uncatchable interruption, run `pnpm reinstall --recover` to restore the
previous generation, then retry `pnpm reinstall`. Recovery refuses to run while
the recorded installer process is alive. Do not delete `.reinstall-backup`:
it holds the rollback data. An uncatchable interruption can also leave the
temporary install directory printed by the helper; remove that specific
directory after recovery if it remains.

### Loading the production build manually

To test against your real, logged-in LinkedIn account:

- **Chrome:** `pnpm build`, then go to `chrome://extensions`, enable
  **Developer mode**, click **Load unpacked**, and select
  `.output/chrome-mv3`.
- **Firefox:** `pnpm build:firefox`, then go to `about:debugging` → **This
  Firefox** → **Load Temporary Add-on**, and select any file inside
  `.output/firefox-mv2` (e.g. `manifest.json`).

Before a store release, check both `/feed/` and `/feed/foryou/` on LinkedIn:
posts should hide while the composer remains available, and each redirect
setting should take you to its selected destination. Check direct loads and
navigation from another LinkedIn page. Pause should restore the feed, and
individual post pages should remain accessible. Rebuilding does not update an
installed or store extension.

## License

Dual-licensed under **AGPL-3.0** (see [`LICENSE`](./LICENSE)) or a **commercial
license**. See [`LICENSING.md`](./LICENSING.md) for details and how to obtain a
commercial license.

_Unhook for LinkedIn is an independent project and is not affiliated with,
endorsed by, or sponsored by LinkedIn Corporation._

## Dependency security

On 31 October, the package-manager pin and minimum move from pnpm 11.5.1 to
11.28.8 within the supported major. The former matches published installer
path-traversal and configuration vulnerabilities, including arbitrary writes
with lifecycle scripts disabled. The new release has no current matched pnpm
advisory; its registry signature and provenance were verified. This changes no
application dependency versions or lockfile. `verifyDepsBeforeRun: false` keeps
command execution from implicitly reinstalling dependencies under iCloud; use
the existing explicit reinstall workflow. A frozen isolated install,
typecheck and both production builds pass under Node 24.22.1 in the isolated
candidate and actual checkout. Reappeared iCloud dependency conflicts were
removed by a guarded fresh-tree swap; the complete prior tree is retained for
rollback.
[Installer advisory](https://github.com/pnpm/pnpm/security/advisories/GHSA-vq4v-j7r6-jq4m).
The Volta global pnpm default is separate and remains unchanged pending owner
approval; do not assume this repository pin updated other installations.


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

### Review repair verification — 9 November 2026

All seven review findings are repaired locally. `pnpm check` passes 91 tests,
TypeScript, and Chrome/Firefox production builds. The Pages workflow uses
commit-pinned actions and passes actionlint. Targeted tests fail when the old
settings, startup, normalization, and installer bugs are restored in isolated
copies. Independent verification also covers recovery interrupted halfway
through restoring a generation. The macOS `lockf` path is exercised; Linux's
`flock` branch has not been run on Linux.

A real frozen install, a second offline reinstall over that installation, and
type-checking pass in a disposable copy with a separate package store. The
working checkout's dependencies are untouched. The fixes are committed locally
and await owner approval to push. Next: push the approved commits and inspect
the Pages run; perform the manual LinkedIn checks above before a store release.
The Pages job publishes the privacy site and does not run the extension tests.
The existing moderate icon-tooling advisory remains the separate dependency
follow-up described above. No installed extension or store listing is updated
by these local commits.
