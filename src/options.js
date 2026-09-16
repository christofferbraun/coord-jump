'use strict';

const homeInput = document.getElementById('home');
const homePreview = document.getElementById('home-preview');
const homeEnabled = document.getElementById('home-enabled');
const homeNote = document.getElementById('home-note');
const status = document.getElementById('status');

function describeHome(text) {
  const home = CoordJump.parseHome(text);
  if (home === null) return { text: '', ok: false };
  if (typeof home === 'string') return { text: `Address: ${home}`, ok: true };
  return { text: `Coordinates: ${home.lat}, ${home.lng}`, ok: true };
}

function render() {
  const d = describeHome(homeInput.value);
  homePreview.textContent = d.text;
  homePreview.className = d.ok ? 'preview ok' : 'preview';
  homeNote.hidden = !(homeEnabled.checked && !d.ok);
}

// Save shortly after the user stops typing rather than on every keystroke.
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await CoordJumpSettings.set({ home: homeInput.value.trim(), homeEnabled: homeEnabled.checked });
    status.textContent = 'Saved';
    setTimeout(() => { status.textContent = ''; }, 1500);
  }, 250);
}

homeInput.addEventListener('input', () => { render(); save(); });
homeEnabled.addEventListener('change', () => { render(); save(); });

CoordJumpSettings.get().then((s) => {
  homeInput.value = s.home;
  homeEnabled.checked = s.homeEnabled;
  render();
});
