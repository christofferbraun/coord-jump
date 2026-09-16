# Publishing checklist

How to get Coord Jump onto addons.mozilla.org (AMO) and the Chrome Web
Store (CWS). Status as of September 2026; both stores change their rules
periodically, so skim the linked pages before each submission.

## Before either store

- [ ] Bump `version` in `manifest.json` (both stores reject re-uploads of the same version)
- [ ] `npm test` and `npm run lint` clean
- [ ] `npm run package` → `dist/coord-jump-<version>-firefox.zip` and `-chrome.zip`
- [ ] Smoke-test each zip in its browser (Firefox: `about:debugging` → load the zip; Chrome: unzip and Load unpacked)
- [ ] Tag the release: `git tag v<version> && git push --tags`
- [ ] Screenshots (both stores want at least one): the right-click menu over
      some coordinates, the popup, the settings page. CWS wants 1280×800 or
      640×400 PNG/JPEG; AMO accepts most sizes.

## Firefox (addons.mozilla.org)

One-time setup:
- [ ] Firefox account → <https://addons.mozilla.org/developers/> → agree to the distribution agreement. No fee.

Per release:
- [ ] Submit `dist/coord-jump-<version>-firefox.zip` via **Submit a New Add-on** (first time) or **Upload New Version**
- [ ] Choose **On this site** (listed) distribution
- [ ] Listing: name, summary (≤250 chars), description, category **Search Tools** or **Other**, support URL and homepage (the GitHub repo), license MIT
- [ ] Privacy policy: paste the contents of `PRIVACY.md`, or link to it
- [ ] Notes to reviewers: "Plain unminified JavaScript, no bundler. `scripts/build.js` only rewrites `manifest.json` per browser. Source at https://github.com/christofferbraun/coord-jump"
- [ ] Source code upload: not required (nothing is minified or transpiled), but linking the repo in reviewer notes is good practice

Manifest requirements already handled:
- `browser_specific_settings.gecko.id` set (required for MV3 submission)
- `browser_specific_settings.gecko.data_collection_permissions.required = ["none"]` —
  mandatory for all new extensions since 2025-11-03, and for all extensions
  from H1 2026. "none" is correct: the extension has no server and transmits
  nothing to the developer. The home location lives in `storage.sync`, which
  is the browser's own encrypted sync, not data collection by the add-on.
- No `background.service_worker` key in the Firefox build (AMO rejects it)

Review usually takes a few days for a first submission; the listing is live
once approved. Signed XPIs are handled by AMO.

## Chrome (Chrome Web Store)

One-time setup:
- [ ] Google account → <https://chrome.google.com/webstore/devconsole> → pay the one-time **$5** developer registration fee
- [ ] Verify a contact email in the dashboard (required before publishing)

Per release:
- [ ] Upload `dist/coord-jump-<version>-chrome.zip` as a new item / new package
- [ ] **Store listing**: title, summary (≤132 chars), description, category **Productivity → Tools**, language, at least one screenshot, 128×128 icon (auto-pulled from the manifest). A 440×280 small promo tile is optional but recommended
- [ ] **Privacy** tab:
  - Single purpose: "Parses latitude/longitude from selected text and opens it in Google Maps."
  - Permission justifications (one line each):
    - `contextMenus` — right-click "Open in Google Maps" entry on selected text
    - `activeTab` + `scripting` — read the current selection when the keyboard shortcut is pressed
    - `notifications` — tell the user when the selection contains no coordinates
    - `storage` — remember the optional home location and settings
  - Data usage: the extension collects **no** user data (nothing is transmitted to the developer). Tick the certifications: no sale of data, no use unrelated to the single purpose, no creditworthiness use
  - Privacy policy URL: <https://github.com/christofferbraun/coord-jump/blob/main/PRIVACY.md>
- [ ] **Distribution**: public, all regions
- [ ] Submit for review. First reviews commonly take 1–3 days; extensions using `scripting` are sometimes given a closer look

Policy notes:
- CWS's 2026 policy update (enforced from 2026-08-01) tightens the *limited
  use* and *disclosure* rules: any data handled must be strictly necessary
  for the single purpose and prominently disclosed. Coord Jump's only
  handled data is the selection (parsed locally) and the optional home
  location (stored locally, sent only inside the Google Maps URL the user
  asked to open). `PRIVACY.md` spells this out.
- Keep permissions minimal. Do not add `clipboardRead` or `<all_urls>` host
  permissions without updating the justifications and privacy policy.

## Google Maps terms

Coord Jump only opens **Maps URLs** (`https://www.google.com/maps/search/?api=1&query=…`
and `/maps/dir/?api=1&origin=…&destination=…`). Google documents Maps URLs as
the one Maps Platform feature that needs **no API key, no billing, and no
registration**; they are intended precisely for launching Google Maps with a
search or directions from third-party apps. There is no scraping, embedding,
or automated querying, and every request is a user-initiated navigation in
their own browser, so nothing here conflicts with the Maps Platform terms.
Things that *would* change that: embedding map tiles, calling the
Geocoding/Directions web APIs, or auto-opening URLs without a user action.

## Releasing a new version

1. Update `manifest.json` version, commit, tag
2. `npm run package`
3. Upload the Firefox zip to AMO and the Chrome zip to CWS
4. Once both are live, attach the zips to a GitHub release for people who sideload

## Sources

- AMO data collection requirement: <https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/>
- AMO `browser_specific_settings`: <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings>
- Firefox MV3 background scripts: <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background>
- CWS 2026 policy update: <https://developer.chrome.com/blog/cws-policy-updates-2026>
- Google Maps URLs: <https://developers.google.com/maps/documentation/urls/get-started>
