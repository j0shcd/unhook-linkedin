# Store Listing Copy — Unhook for LinkedIn

Reference for the Chrome Web Store and Firefox Add-ons (AMO) submission forms.
Copy/paste from here.

---

## Name

Unhook for LinkedIn - Block the LinkedIn home feed

## Short description (≤132 chars)

Hide your LinkedIn feed and get your work done without distraction. Fully private, no tracking.

## Category

Productivity

---

## Long description (store listing body)

Hide your LinkedIn home feed so you do what you came to do and avoid distractions. No tracking, no sign-up.

The LinkedIn home feed is built to keep you scrolling. Unhook for LinkedIn removes it while keeping everything else, messaging, jobs, your network, exactly as it is. Toggle it through the popup to set up your own distraction-free LinkedIn.

OPTIONS:
- Hide the home feed
- Redirect the feed to your Messages or the Jobs page instead
- Pause anytime, then turn it back on in one click
- Light or dark theme

Unhook collects no data, has no analytics or trackers, and needs no account. Your settings stay on your device and never leave it. It runs only on LinkedIn, hides elements with CSS so nothing slows down, and never deletes anything. Every change is instant and reversible.

Unhook for LinkedIn is an independent project and is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation.

---

## Chrome Web Store — data usage disclosure (Privacy tab)

Answer these as follows in the Developer Dashboard:

- **Does this item collect or use data?** No.
- **Personally identifiable / health / financial / authentication / personal communications / location / web history / user activity / website content:** None collected.
- **Privacy policy URL:** https://j0shcd.github.io/unhook-linkedin/privacy.html
- **Certify:** the three compliance checkboxes (does not sell data, does not use
  data for unrelated purposes, does not use data for creditworthiness/lending).

## Permission justifications (if review asks)

- **`storage`:** Saves the user's hide/redirect/theme preferences locally on
  their device. No data is transmitted.
- **Host permission `https://www.linkedin.com/*`:** Required to hide elements
  and apply redirect preferences on LinkedIn pages. The extension functions only
  on LinkedIn.

## Firefox AMO notes

- AMO reviews source. The submitted JS is bundled by Vite/WXT. In the
  "source code" step, point reviewers to the public Git repository and the build
  command: `pnpm install && pnpm zip:firefox` (Node 20+, Firefox 121+). Output
  is in `.output/`.
- No minification obfuscation, no remote code — review should be quick.

---

## Assets checklist (you still need to create these)

- [ ] At least 1 screenshot (Chrome: 1280×800 or 640×400; recommend 3–5)
- [ ] Chrome small promo tile 440×280 (optional but recommended)
- [x] A real icon
- [x] Privacy policy hosted at a public URL
