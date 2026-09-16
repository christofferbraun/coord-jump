#!/usr/bin/env node
/*
 * Produce clean per-browser copies of the extension under dist/.
 *
 * The root manifest.json is the Firefox manifest (background.scripts).
 * Chrome's MV3 wants background.service_worker instead and warns about
 * Firefox-only keys, so dist/chrome gets a rewritten manifest. Everything
 * else is copied verbatim.
 *
 *   node scripts/build.js          -> dist/firefox/, dist/chrome/
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

// Files shipped in every build, relative to the repo root.
const SHIPPED = ['src', 'icons', 'LICENSE'];

function copyInto(target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const entry of SHIPPED) {
    fs.cpSync(path.join(root, entry), path.join(target, entry), { recursive: true });
  }
}

function writeManifest(target, m) {
  fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
}

function firefoxManifest(m) {
  const out = structuredClone(m);
  delete out.background.service_worker;
  return out;
}

function chromeManifest(m) {
  const out = structuredClone(m);
  const scripts = out.background.scripts || [];
  // background.js pulls its dependencies in with importScripts(), so the
  // service worker only needs the entry point.
  out.background = { service_worker: scripts[scripts.length - 1] || 'src/background.js' };
  delete out.browser_specific_settings;
  return out;
}

const builds = {
  firefox: firefoxManifest(manifest),
  chrome: chromeManifest(manifest),
};

for (const [name, m] of Object.entries(builds)) {
  const target = path.join(dist, name);
  copyInto(target);
  writeManifest(target, m);
  console.log(`built dist/${name} (${m.name} ${m.version})`);
}
