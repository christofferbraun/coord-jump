/*
 * coord-jump coordinate parser.
 *
 * Takes an arbitrary block of text and tries to find one latitude/longitude
 * pair in it. Handles the formats people actually paste around:
 *
 *   40.7128, -74.0060            decimal degrees (DD)
 *   40.7128° N, 74.0060° W       DD with hemisphere letters
 *   N 40.7128 W 74.0060          hemisphere prefix
 *   40°42'46"N 74°00'21"W        degrees/minutes/seconds (DMS)
 *   40°42.767'N 74°00.35'W       degrees/decimal minutes (DDM)
 *   40 42 46 N, 74 0 21 W        DMS with no symbols
 *   lat: 40.7128, lon: -74.0060  labelled, in either order
 *   @40.7128,-74.006,15z         Google Maps URL fragment
 *   40,7128; -74,0060            decimal-comma locales
 *
 * Plain script on purpose: loaded via importScripts() in the Chrome service
 * worker, via background.scripts in Firefox, and via require() in tests.
 */
(function (root) {
  'use strict';

  const HEMI_SIGN = { N: 1, S: -1, E: 1, W: -1 };
  const LAT_HEMIS = 'NS';

  // Characters are spelled out by code point so the source stays plain ASCII.
  const ch = (...codes) => String.fromCharCode(...codes);
  const cls = (...codes) => new RegExp('[' + codes.map((c) => Array.isArray(c) ? ch(c[0]) + '-' + ch(c[1]) : ch(c)).join('') + ']', 'g');
  const DEG = ch(0xb0);
  // A unit letter (d/m/s) ends a token if followed by a non-letter, end of text, or a
  // hemisphere letter that itself ends a word: "46sN", "21sW".
  const UNIT_END = '(?=[^A-Za-z]|$|[NSEW](?![A-Za-z]))';
  const unitRe = (u) => new RegExp('(\\d)\\s*(?:' + u + ')' + UNIT_END, 'g');
  const RE_UNIT_DEG = unitRe('[Dd]eg|d');
  const RE_UNIT_MIN = unitRe('[Mm]in|m');
  const RE_UNIT_SEC = unitRe('[Ss]ec|s');

  const RE_SPACES  = cls(0xa0, [0x2000, 0x200b], 0x202f, 0x3000);   // nbsp, en/em/hair/zero-width spaces, ideographic space
  const RE_DASHES  = cls(0x2212, [0x2010, 0x2015]);                  // minus sign, hyphens, en/em dashes
  const RE_DEGREES = cls(0xba, 0x2da, 0x2070);                       // masculine ordinal, ring above, superscript zero
  const RE_MINUTES = cls(0x2032, 0x2019, 0x2018, 0xb4, 0x60);        // prime, curly single quotes, acute, backtick
  const RE_SECONDS = new RegExp(cls(0x2033, 0x201d, 0x201c).source + "|''", 'g'); // double prime, curly double quotes, ''

  /** Normalize typography so the tokenizer only has to know one spelling. */
  function normalize(text) {
    return String(text)
      .replace(RE_SPACES, ' ')
      .replace(RE_DASHES, '-')
      .replace(RE_DEGREES, DEG)
      .replace(RE_MINUTES, "'")
      .replace(RE_SECONDS, '"')
      .replace(RE_UNIT_DEG, '$1' + DEG)                          // 40d / 40 deg -> 40°
      .replace(RE_UNIT_MIN, "$1'")                               // 42m / 42 min -> 42'
      .replace(RE_UNIT_SEC, '$1"')                               // 46s / 46 sec -> 46"  (lowercase only: S is a hemisphere)
      .replace(/(\d):(?=\d)/g, '$1 ');                           // 40:42:46 -> 40 42 46
  }

  /**
   * Decimal-comma locales write 40,7128 instead of 40.7128. Only rewrite
   * when the text has no periods and commas are clearly being used as
   * decimal points (digit,digit with a non-comma separator between pairs).
   */
  function fixDecimalCommas(text) {
    if (text.includes('.')) return text;
    const m = text.match(/-?\d+,\d+/g);
    if (!m || m.length < 2) return text;
    return text.replace(/(\d),(\d)/g, '$1.$2');
  }

  const TOKEN_RE = new RegExp(
    [
      '(\\d+(?:\\.\\d+)?)',                                  // 1 number
      '([' + DEG + "'\"])",                                  // 2 symbol
      '\\b(lat(?:itude)?|lon(?:gitude)?|lng|long)\\b',       // 3 label
      '\\b(north|south|east|west)\\b',                       // 4 hemisphere word
      '(?<![A-Za-z])([NSEW])(?![A-Za-z])',                    // 5 hemisphere letter
      '([-+])(?=\\d)',                                       // 6 sign
      '([,;|/])',                                            // 7 separator
    ].join('|'),
    'gi'
  );

  function tokenize(text) {
    const tokens = [];
    let m;
    TOKEN_RE.lastIndex = 0;
    let prevEnd = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      // `pre` is the raw text between this token and the previous one; the
      // component reader uses it to tell "40 42" (degrees, minutes) from
      // "Site 7: 40" (an unrelated number, then degrees).
      const at = { i: m.index, e: m.index + m[0].length, pre: text.slice(prevEnd, m.index) };
      prevEnd = at.e;
      if (m[1] !== undefined) {
        tokens.push({ t: 'num', v: parseFloat(m[1]), int: !m[1].includes('.'), ...at });
      } else if (m[2] !== undefined) {
        tokens.push({ t: 'sym', v: m[2], ...at });
      } else if (m[3] !== undefined) {
        tokens.push({ t: 'label', v: /^la/i.test(m[3]) ? 'lat' : 'lon', ...at });
      } else if (m[4] !== undefined) {
        tokens.push({ t: 'hemi', v: m[4][0].toUpperCase(), ...at });
      } else if (m[5] !== undefined) {
        // Hemisphere letters are only trusted in upper case; a lone lowercase
        // "e" or "s" in prose is far more likely to be a word than a direction.
        if (m[5] === m[5].toUpperCase()) tokens.push({ t: 'hemi', v: m[5], ...at });
      } else if (m[6] !== undefined) {
        tokens.push({ t: 'sign', v: m[6] === '-' ? -1 : 1, ...at });
      } else if (m[7] !== undefined) {
        tokens.push({ t: 'sep', ...at });
      }
    }
    return tokens;
  }

  // Max characters allowed between neighbouring parts of one component:
  // "lat: 40", "N 40", "46\" N", "40° 42'". Anything further apart is prose.
  const LABEL_JOIN = /^[\s:=]{0,4}$/;   // "lat: 40", "lat = 40"
  const HEMI_JOIN = /^[\s:]{0,2}$/;     // "N 40", "N: 40", '46" N'
  const PART_JOIN = /^\s{0,2}$/;        // "40 42", "40°42", "40° 42"
  const joined = (tok, re) => !!tok && re.test(tok.pre);
  const is = (tok, t, v) => !!tok && tok.t === t && (v === undefined || tok.v === v);

  /**
   * Try to read one coordinate component starting at tokens[pos].
   *   [label] [hemi] [sign] deg [°] [min ['] [sec ["]]] [hemi]
   * Returns { comp, next } or null.
   */
  function readComponent(tokens, pos) {
    let p = pos;
    const c = { hemi: null, label: null, sign: 1, deg: 0, min: 0, sec: 0, symbols: 0, decimals: 0, dms: false, start: null };

    if (is(tokens[p], 'label') && joined(tokens[p + 1], LABEL_JOIN)) { c.label = tokens[p].v; p++; }
    if (is(tokens[p], 'hemi') && joined(tokens[p + 1], HEMI_JOIN)) { c.hemi = tokens[p].v; p++; }
    if (is(tokens[p], 'sign')) { c.sign = tokens[p].v; p++; }
    if (!is(tokens[p], 'num')) return null;

    c.start = tokens[p].i;
    const deg = tokens[p++];
    c.deg = deg.v;
    if (!deg.int) c.decimals++;
    if (is(tokens[p], 'sym', DEG)) { c.symbols++; p++; }

    // Minutes/seconds only make sense after an integer degree value.
    if (deg.int && is(tokens[p], 'num') && tokens[p].v < 60 && joined(tokens[p], PART_JOIN)) {
      const min = tokens[p];
      let q = p + 1;
      const minSym = is(tokens[q], 'sym', "'");
      if (minSym) q++;
      // Bare decimal minutes ("7 40.7128") are more often an unrelated integer
      // followed by a decimal-degree value; only accept them as DDM when
      // something else marks this as a coordinate component.
      const hemiAfter = is(tokens[q], 'hemi') && joined(tokens[q], HEMI_JOIN);
      const believable = min.int || c.symbols || minSym || c.hemi || hemiAfter;
      if (believable) {
        c.min = min.v; c.dms = true; c.symbols += minSym ? 1 : 0; if (!min.int) c.decimals++;
        p = q;

        if (min.int && is(tokens[p], 'num') && tokens[p].v < 60 && joined(tokens[p], PART_JOIN)) {
          const sec = tokens[p];
          let r = p + 1;
          const secSym = is(tokens[r], 'sym', '"');
          if (secSym) r++;
          c.sec = sec.v; c.symbols += secSym ? 1 : 0; if (!sec.int) c.decimals++;
          p = r;
        }
      }
    }

    if (!c.hemi && is(tokens[p], 'hemi') && joined(tokens[p], HEMI_JOIN)) { c.hemi = tokens[p].v; p++; }

    c.value = c.sign * (c.deg + c.min / 60 + c.sec / 3600);
    if (c.hemi) c.value = Math.abs(c.value) * HEMI_SIGN[c.hemi];
    return { comp: c, next: p };
  }

  function scanComponents(tokens) {
    const comps = [];
    let p = 0;
    while (p < tokens.length) {
      const r = readComponent(tokens, p);
      if (r) { comps.push(r.comp); p = r.next; }
      else p++;
    }
    return comps;
  }

  const isLat = (c) => c.hemi ? LAT_HEMIS.includes(c.hemi) : null;
  const inLatRange = (v) => Math.abs(v) <= 90;
  const inLonRange = (v) => Math.abs(v) <= 180;

  /** Decide which of two components is lat and which is lon, or null if impossible. */
  function orient(a, b) {
    const la = a.label ? a.label === 'lat' : isLat(a);
    const lb = b.label ? b.label === 'lat' : isLat(b);
    let lat, lon;
    if (la === true || lb === false) { lat = a; lon = b; }
    else if (la === false || lb === true) { lat = b; lon = a; }
    else {
      // Nothing tells us the order; assume lat,lon unless only the swap fits.
      if (inLatRange(a.value) && inLonRange(b.value)) { lat = a; lon = b; }
      else if (inLatRange(b.value) && inLonRange(a.value)) { lat = b; lon = a; }
      else return null;
    }
    if (la !== null && lb !== null && la === lb) return null; // N + N, lat + lat
    if (!inLatRange(lat.value) || !inLonRange(lon.value)) return null;
    return { lat, lon };
  }

  /**
   * How much a pair looks like a deliberate coordinate. A score of 0 means
   * two bare integers, which we refuse: "12 05" is a date far more often than
   * it is 12°N 5°E.
   */
  function score(lat, lon) {
    let s = 0;
    if (lat.label && lon.label) s += 8;
    if (lat.hemi && lon.hemi) s += 4;
    if (lat.symbols && lon.symbols) s += 2;
    if (lat.decimals && lon.decimals) s += 2;
    else if (lat.decimals || lon.decimals) s += 1;
    if (lat.dms && lon.dms) s += 1;
    return s;
  }

  function round(v) {
    return Math.round(v * 1e6) / 1e6;
  }

  /**
   * Parse text and return { lat, lng } (decimal degrees, 6 dp) or null.
   */
  function parseCoordinates(text) {
    if (text == null) return null;
    const tokens = tokenize(fixDecimalCommas(normalize(text)));
    const comps = scanComponents(tokens);

    // Labelled values win outright, even if they're far apart in the text.
    const labLat = comps.find((c) => c.label === 'lat');
    const labLon = comps.find((c) => c.label === 'lon');
    if (labLat && labLon) {
      const o = orient(labLat, labLon);
      if (o) return { lat: round(o.lat.value), lng: round(o.lon.value) };
    }

    // Otherwise take the best-looking adjacent pair.
    let best = null;
    for (let i = 0; i + 1 < comps.length; i++) {
      const o = orient(comps[i], comps[i + 1]);
      if (!o) continue;
      const s = score(o.lat, o.lon);
      if (s > 0 && (!best || s > best.s)) best = { o, s };
    }
    if (!best) return null;
    return { lat: round(best.o.lat.value), lng: round(best.o.lon.value) };
  }

  function toGoogleMapsUrl(coords) {
    const q = `${coords.lat},${coords.lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  /**
   * Directions from `origin` to `coords`. `origin` is either a {lat, lng}
   * object or a free-text place/address string, which Google resolves itself.
   */
  function toGoogleMapsDirectionsUrl(origin, coords) {
    const o = typeof origin === 'string' ? origin.trim() : `${origin.lat},${origin.lng}`;
    const d = `${coords.lat},${coords.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`;
  }

  /**
   * A home location as typed by the user: coordinates in any supported
   * format, or an address. Returns null for blank input.
   */
  function parseHome(text) {
    const s = String(text == null ? '' : text).trim();
    if (!s) return null;
    return parseCoordinates(s) || s;
  }

  const api = { parseCoordinates, parseHome, toGoogleMapsUrl, toGoogleMapsDirectionsUrl, normalize, tokenize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CoordJump = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
