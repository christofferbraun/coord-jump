/*
 * Background script. In Chrome this runs as a service worker (so it pulls
 * parser.js in with importScripts); in Firefox it runs as an event page with
 * parser.js already loaded via manifest background.scripts.
 */
'use strict';

if (typeof CoordJump === 'undefined' && typeof importScripts === 'function') {
  importScripts('parser.js');
}

const MENU_ID = 'coord-jump-open';

function notify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'Coord Jump',
    message,
  });
}

/** Parse text and open Google Maps in a new tab next to the current one. */
async function jump(text, tab) {
  const coords = CoordJump.parseCoordinates(text);
  if (!coords) {
    notify('No latitude/longitude found in the selected text.');
    return false;
  }
  await chrome.tabs.create({
    url: CoordJump.toGoogleMapsUrl(coords),
    index: tab ? tab.index + 1 : undefined,
    openerTabId: tab ? tab.id : undefined,
  });
  return true;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Open in Google Maps',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID) jump(info.selectionText || '', tab);
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
