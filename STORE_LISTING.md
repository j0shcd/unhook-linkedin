# Store Listing Copy — Unhook for LinkedIn

Reference for the Chrome Web Store and Firefox Add-ons (AMO) submission forms.
Copy/paste from here.

---

## Name

Unhook for LinkedIn

## Short description (≤132 chars — used by both stores)

Take back control of LinkedIn. Hide the home feed — distraction-free, private, no tracking.

## Category

Productivity

---

## Long description (store listing body)

**Stop doomscrolling LinkedIn. Keep what's useful, hide the rest.**

Unhook for LinkedIn puts you back in control of your LinkedIn experience. LinkedIn is great for messaging, jobs, and your network — but the endless home feed is engineered to keep you scrolling. Unhook quietly removes it, so you can get in, do what you came to do, and get out.

**What you can do:**

• **Block the home feed** — Replace the infinite scroll at linkedin.com/feed with a calm, empty page.
• **Redirect the feed** — Optionally send yourself straight to your Messages or the Jobs page instead of the feed, so LinkedIn opens on something useful.
• **Pause anytime** — One click pauses everything when you actually want the full LinkedIn. Turn it back on just as fast.
• **Light, dark, or system theme** — Matches how you like to browse.

**Built to respect you:**

• **No tracking. No analytics. No data collection.** Your settings stay on your device and never leave it.
• **No account or sign-up.** Install it and it just works.
• **Runs only on LinkedIn.** It has no access to any other site.
• **Lightweight and fast.** It hides elements with CSS — it doesn't slow LinkedIn down.

Every change is instant and reversible. Nothing is ever deleted from LinkedIn — Unhook simply hides it from view while it's turned on.

Take back your attention. Use LinkedIn on your terms.

_Unhook for LinkedIn is an independent project and is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation._

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
