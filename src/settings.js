/*
 * Settings shared by the background script, popup, and options page.
 * Stored in chrome.storage.sync so they follow the user's browser account.
 *
 *   home        string  - home location as typed: coordinates or an address
 *   homeEnabled boolean - show the "Navigate from home" actions
 */
(function (root) {
  'use strict';

  const DEFAULTS = { home: '', homeEnabled: false };

  async function get() {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    const home = CoordJump.parseHome(stored.home);
    return {
      home: stored.home,
      homeEnabled: !!stored.homeEnabled,
      // Both conditions must hold for the feature to appear anywhere.
      homeActive: !!stored.homeEnabled && home !== null,
      homeOrigin: home,
    };
  }

  function set(values) {
    return chrome.storage.sync.set(values);
  }

  function onChange(fn) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') fn(changes);
    });
  }

  root.CoordJumpSettings = { get, set, onChange, DEFAULTS };
})(globalThis);
