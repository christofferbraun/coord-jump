'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCoordinates, toGoogleMapsUrl } = require('../src/parser.js');

// Spelled out by code point so the test file stays ASCII.
const DEG = String.fromCharCode(0xb0);
const PRIME = String.fromCharCode(0x2032);
const DPRIME = String.fromCharCode(0x2033);
const NBSP = String.fromCharCode(0xa0);
const MINUS = String.fromCharCode(0x2212);

const NYC = { lat: 40.7128, lng: -74.006 };
const NYC_DMS = { lat: 40.712778, lng: -74.005833 }; // 40°42'46"N 74°00'21"W

const cases = [
  // decimal degrees
  ['40.7128, -74.0060', NYC],
  ['40.7128 -74.0060', NYC],
  ['40.7128;-74.0060', NYC],
  ['40.7128/-74.0060', NYC],
  [`40.7128${DEG}, -74.0060${DEG}`, NYC],
  ['-33.8688, 151.2093', { lat: -33.8688, lng: 151.2093 }],
  [`${MINUS}33.8688, 151.2093`, { lat: -33.8688, lng: 151.2093 }],
  ['+40.7128, +074.0060', { lat: 40.7128, lng: 74.006 }],

  // hemisphere letters and words, prefix and suffix
  ['40.7128 N, 74.0060 W', NYC],
  ['40.7128N 74.0060W', NYC],
  [`40.7128${DEG} N, 74.0060${DEG} W`, NYC],
  ['N 40.7128 W 74.0060', NYC],
  ['N40.7128 W74.0060', NYC],
  ['40.7128 S 74.0060 E', { lat: -40.7128, lng: 74.006 }],
  ['40.7128 North, 74.0060 West', NYC],
  ['south 33.8688, east 151.2093', { lat: -33.8688, lng: 151.2093 }],

  // lon before lat is resolved by hemisphere
  ['74.0060 W, 40.7128 N', NYC],
  ['W 74.0060 N 40.7128', NYC],

  // DMS
  [`40${DEG}42'46"N 74${DEG}00'21"W`, NYC_DMS],
  [`40${DEG}42${PRIME}46${DPRIME}N 74${DEG}00${PRIME}21${DPRIME}W`, NYC_DMS],
  [`40${DEG} 42' 46" N, 74${DEG} 0' 21" W`, NYC_DMS],
  ['40 42 46 N 74 0 21 W', NYC_DMS],
  ['40 42 46 S, 74 0 21 W', { lat: -40.712778, lng: -74.005833 }],
  ['40:42:46N 74:00:21W', NYC_DMS],
  ['40d42m46sN 74d0m21sW', NYC_DMS],
  ['40 deg 42 min 46 sec N, 74 deg 0 min 21 sec W', NYC_DMS],
  [`-40${DEG}42'46" -74${DEG}00'21"`, { lat: -40.712778, lng: -74.005833 }],
  [`40${DEG}42'46.8"N 74${DEG}00'21.6"W`, { lat: 40.713, lng: -74.006 }],

  // DDM
  [`40${DEG}42.767'N 74${DEG}00.36'W`, { lat: 40.712783, lng: -74.006 }],
  ['40 42.767 N 74 0.36 W', { lat: 40.712783, lng: -74.006 }],

  // labelled, either order, various spellings
  ['lat: 40.7128, lon: -74.0060', NYC],
  ['Latitude 40.7128 Longitude -74.0060', NYC],
  ['Longitude: -74.0060 Latitude: 40.7128', NYC],
  ['lng=-74.0060 lat=40.7128', NYC],
  ['long -74.0060, lat 40.7128', NYC],
  ['Lat 40.7128 N Long 74.0060 W', NYC],

  // things that get pasted from URLs / apps
  ['@40.7128,-74.006,15z', NYC],
  ['https://www.google.com/maps/@40.7128,-74.006,15z', NYC],
  ['geo:40.7128,-74.006', NYC],
  ['q=40.7128,-74.006', NYC],

  // decimal-comma locales
  ['40,7128; -74,0060', NYC],
  ['40,7128 -74,0060', NYC],

  // typography / whitespace
  [`40.7128,${NBSP}-74.0060`, NYC],
  ['  40.7128 ,\n -74.0060 \n', NYC],
  ['(40.7128, -74.0060)', NYC],
  ['[40.7128, -74.0060]', NYC],

  // embedded in prose, with noise numbers around
  ['Elevation 1200 m at 40.7128 -74.0060, taken 2024-05-12', NYC],
  ['Meet at N 40.7128, W 74.0060 tomorrow at 5', NYC],
  ['West Virginia at 38.5, -80.2', { lat: 38.5, lng: -80.2 }],
  ['Site 7: 40.7128, -74.0060 (approx.)', NYC],
  ['Zoom 15, coords 40.7128, -74.0060', NYC],

  // when the order is ambiguous, a value > 90 must be the longitude
  ['151.2093, -33.8688', { lat: -33.8688, lng: 151.2093 }],

  // nothing to find
  ['hello world', null],
  ['', null],
  ['   ', null],
  ['12 05', null],
  ['40 74', null],
  ['The meeting is at 3:30 pm on 12/05', null],
  ['Call 555-1234', null],
  ['95.0, 95.0', null],           // neither can be a latitude
  ['40.7 N, 74.0 N', null],       // two latitudes
  ['lat 40.7 lat 74.0', null],
  ['181.0, 40.0', null],          // out of range longitude
  ['40.0', null],                 // only one value
];

for (const [input, expected] of cases) {
  test(JSON.stringify(input), () => {
    assert.deepEqual(parseCoordinates(input), expected);
  });
}

test('null and undefined input', () => {
  assert.equal(parseCoordinates(null), null);
  assert.equal(parseCoordinates(undefined), null);
});

test('rounds to 6 decimal places', () => {
  assert.deepEqual(parseCoordinates('40.71283456789, -74.00601234567'), { lat: 40.712835, lng: -74.006012 });
});

test('toGoogleMapsUrl builds a Maps URLs API search link', () => {
  assert.equal(
    toGoogleMapsUrl(NYC),
    'https://www.google.com/maps/search/?api=1&query=40.7128%2C-74.006'
  );
});
