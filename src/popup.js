'use strict';

const input = document.getElementById('input');
const preview = document.getElementById('preview');
const go = document.getElementById('go');
const fromHome = document.getElementById('from-home');
const form = document.getElementById('form');

let coords = null;
let settings = { homeActive: false, homeOrigin: null };

function update() {
  coords = CoordJump.parseCoordinates(input.value);
  if (coords) {
    preview.textContent = `${coords.lat}, ${coords.lng}`;
    preview.className = 'preview ok';
  } else {
    preview.textContent = input.value.trim() ? 'No coordinates found' : '';
    preview.className = 'preview bad';
  }
  go.disabled = !coords;
  fromHome.disabled = !coords;
  fromHome.hidden = !settings.homeActive;
}

function open(url) {
  chrome.tabs.create({ url });
  window.close();
}

input.addEventListener('input', update);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (coords) open(CoordJump.toGoogleMapsUrl(coords));
});

fromHome.addEventListener('click', () => {
  if (coords && settings.homeActive) open(CoordJump.toGoogleMapsDirectionsUrl(settings.homeOrigin, coords));
});

// Ctrl/Cmd+Enter submits from inside the textarea.
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit();
});

document.getElementById('settings').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
  window.close();
});

CoordJumpSettings.get().then((s) => { settings = s; update(); });

// Show the shortcut the user actually has configured, if it differs.
chrome.commands.getAll().then((cmds) => {
  const cmd = cmds.find((c) => c.name === 'jump-to-selection');
  const el = document.getElementById('shortcut');
  if (cmd && cmd.shortcut) el.textContent = cmd.shortcut;
  else if (cmd) el.textContent = 'no shortcut set';
}).catch(() => {});
