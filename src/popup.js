'use strict';

const input = document.getElementById('input');
const preview = document.getElementById('preview');
const go = document.getElementById('go');
const form = document.getElementById('form');

let coords = null;

function update() {
  coords = CoordJump.parseCoordinates(input.value);
  if (coords) {
    preview.textContent = `${coords.lat}, ${coords.lng}`;
    preview.className = 'preview ok';
    go.disabled = false;
  } else {
    preview.textContent = input.value.trim() ? 'No coordinates found' : '';
    preview.className = 'preview bad';
    go.disabled = true;
  }
}

input.addEventListener('input', update);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!coords) return;
  chrome.tabs.create({ url: CoordJump.toGoogleMapsUrl(coords) });
  window.close();
});

// Ctrl/Cmd+Enter submits from inside the textarea.
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit();
});

// Show the shortcut the user actually has configured, if it differs.
chrome.commands.getAll().then((cmds) => {
  const cmd = cmds.find((c) => c.name === 'jump-to-selection');
  const el = document.getElementById('shortcut');
  if (cmd && cmd.shortcut) el.textContent = cmd.shortcut;
  else if (cmd) el.textContent = 'no shortcut set';
}).catch(() => {});
