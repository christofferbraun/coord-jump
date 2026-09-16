# Coord Jump privacy policy

_Last updated: 2026-09-16_

Coord Jump is a browser extension that reads text you select, looks for a
latitude/longitude in it, and opens that location in Google Maps.

## What the extension accesses

- **Selected text**: only when you invoke the extension (right-click menu,
  keyboard shortcut, or the toolbar popup). The text is parsed locally in
  your browser and is not stored.
- **Home location** (optional): if you set one in the extension settings, it
  is stored in your browser's extension storage (`storage.sync`), which your
  browser may synchronise between your own devices through your browser
  account. It is used only to build the "Navigate from home" directions link.

## What leaves your browser

The only network activity is opening a `https://www.google.com/maps/...` URL
in a new tab. That URL contains the parsed coordinates and, for "Navigate
from home", your home location. Google's handling of that request is covered
by [Google's privacy policy](https://policies.google.com/privacy).

## What the developer receives

Nothing. Coord Jump has no servers, no analytics, no telemetry, and no
crash reporting. The developer never sees your selections, your home
location, or anything else.

## Data retention and deletion

The home location persists until you clear it in the settings or uninstall
the extension. Nothing else is retained.

## Changes

Changes to this policy will be recorded in the project's commit history at
<https://github.com/christofferbraun/coord-jump>.

## Contact

Open an issue at <https://github.com/christofferbraun/coord-jump/issues>.
