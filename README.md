# Coord Jump

Browser extension for Firefox and Chrome. Highlight any text that contains a
latitude/longitude, right-click, and jump straight to that spot in Google Maps.

Google Maps is picky about how coordinates are pasted in. Coord Jump reads
whatever format the text is in, converts it to plain decimal degrees, and
opens the map for you.

## Usage

- **Right-click**: select text containing coordinates → **Open in Google Maps**
- **Keyboard**: select text, press `Alt+Shift+G` (change it in your browser's
  extension shortcut settings)
- **Toolbar button**: paste coordinates into the popup and hit Enter

## Formats understood

| Style | Example |
|---|---|
| Decimal degrees | `40.7128, -74.0060` |
| Decimal with hemisphere | `40.7128° N, 74.0060° W` · `N 40.7128 W 74.0060` |
| Degrees minutes seconds | `40°42'46"N 74°00'21"W` · `40 42 46 N, 74 0 21 W` · `40d42m46sN` |
| Degrees decimal minutes | `40°42.767'N 74°00.35'W` |
| Labelled, any order | `lat: 40.7128, lon: -74.0060` · `Longitude -74.006 Latitude 40.713` |
| Google Maps URL bits | `@40.7128,-74.006,15z` · `geo:40.7128,-74.006` |
| Decimal-comma locales | `40,7128; -74,0060` |

Unicode primes (`′ ″`), curly quotes, non-breaking spaces, and typographic
minus signs are all normalized. Longitude-first input is fixed up when the
hemisphere letters or value ranges make the order unambiguous. The parser
ignores surrounding prose and stray numbers (dates, elevations, zoom levels)
and refuses to guess on a pair of bare integers.

Not (yet) supported: UTM, MGRS, Plus Codes, what3words.

## Install from source

**Firefox**: open `about:debugging#/runtime/this-firefox` → **Load Temporary
Add-on…** → pick `manifest.json`.

**Chrome**: open `chrome://extensions`, enable **Developer mode** → **Load
unpacked** → pick this folder.

## Development

```
npm test          # parser unit tests (node --test, no dependencies)
npm install       # only needed for the web-ext scripts below
npm run lint      # web-ext lint
npm run start:firefox
npm run build     # zip in web-ext-artifacts/
```

The parser lives in [`src/parser.js`](src/parser.js) and has no browser
dependencies, so new formats can be added test-first in
[`test/parser.test.js`](test/parser.test.js).

## Permissions

- `contextMenus` – the right-click entry
- `activeTab` + `scripting` – read the selection when the keyboard shortcut is used
- `notifications` – tell you when no coordinates were found

No data leaves your browser except the coordinates in the Google Maps URL it opens.

## License

MIT
