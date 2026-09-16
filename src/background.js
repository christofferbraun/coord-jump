/*
 * Background script. In Chrome this runs as a service worker (so it pulls
 * its dependencies in with importScripts); in Firefox it runs as an event
 * page with them already loaded via manifest background.scripts.
 */
'use strict';

if (typeof CoordJump === 'undefined' && typeof importScripts === 'function') {
  importScripts('parser.js', 'settings.js');
}

const MENU_OPEN = 'coord-jump-open';
const MENU_FROM_HOME = 'coord-jump-from-home';

function notify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'Coord Jump',
    message,
  });
}

function openNextTo(url, tab) {
  return chrome.tabs.create({
    url,
    index: tab ? tab.index + 1 : undefined,
    openerTabId: tab ? tab.id : undefined,
  });
}

/** Parse text and open the location in Google Maps next to the current tab. */
async function jump(text, tab) {
  const coords = CoordJump.parseCoordinates(text);
  if (!coords) {
    notify('No latitude/longitude found in the selected text.');
    return false;
  }
  await openNextTo(CoordJump.toGoogleMapsUrl(coords), tab);
  return true;
}

/** Parse text and open directions from the configured home to it. */
async function jumpFromHome(text, tab) {
  const coords = CoordJump.parseCoordinates(text);
  if (!coords) {
    notify('No latitude/longitude found in the selected text.');
    return false;
  }
  const settings = await CoordJumpSettings.get();
  if (!settings.homeActive) {
    notify('Set a home location in the Coord Jump settings first.');
    return false;
  }
  await openNextTo(CoordJump.toGoogleMapsDirectionsUrl(settings.homeOrigin, coords), tab);
  return true;
}

/** (Re)create the context menu to match current settings. */
async function buildMenus() {
  const settings = await CoordJumpSettings.get();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_OPEN, title: 'Open in Google Maps', contexts: ['selection'] });
  if (settings.homeActive) {
    chrome.contextMenus.create({ id: MENU_FROM_HOME, title: 'Navigate from home', contexts: ['selection'] });
  }
}

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);
CoordJumpSettings.onChange(buildMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = info.selectionText || '';
  if (info.menuItemId === MENU_OPEN) jump(text, tab);
  else if (info.menuItemId === MENU_FROM_HOME) jumpFromHome(text, tab);
});

// Keyboard shortcut: grab the current selection from the active tab.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'jump-to-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  let text = '';
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => String(window.getSelection()),
    });
    text = (results && results[0] && results[0].result) || '';
  } catch (e) {
    // Privileged pages (about:, chrome://, the add-on store) refuse injection.
    notify('Cannot read the selection on this page.');
    return;
  }
  if (!text.trim()) {
    notify('Select some text containing coordinates first.');
    return;
  }
  jump(text, tab);
});
