// Shared namespace object all script files attach to (defined here first
// since storage.js loads first; the `|| {}` avoids overwriting it if this
// file ever gets loaded twice).
window.App = window.App || {};

// IIFE (Immediately Invoked Function Expression) — runs once on load and
// keeps STORAGE_KEY/load/save private to this file instead of leaking them
// as global variables. Only what's assigned to window.App.Storage is public.
(function () {
  // Key used to read/write this app's data in the browser's localStorage.
  const STORAGE_KEY = 'pso2_fashion_wantlist';

  // Reads saved data from localStorage into `state` (mutates state.items /
  // state.nextId directly, no return value).
  // `warn` is a callback (passed in by script.js) used to show an on-page
  // message if storage access fails — e.g. browser blocks localStorage.
  function load(state, warn) {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // Some browsers throw here (e.g. file:// pages, privacy settings)
      // instead of just returning null.
      console.error('localStorage read failed:', e);
      warn('⚠ Browser storage is blocked (' + e.name + '), so your data will not be saved between visits. Export JSON after each session, or open this page over http:// (e.g. via a local server) instead of double-clicking the file.');
      return;
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Array.isArray guard: fall back to [] if storage got corrupted
        // or manually edited into something unexpected.
        state.items = Array.isArray(parsed.items) ? parsed.items : [];
        // nextId is the next unique id to hand out. If it wasn't saved,
        // rebuild it from the highest existing item id + 1.
        state.nextId = parsed.nextId || (state.items.reduce((m, i) => Math.max(m, i.id), 0) + 1);
      } catch (e) {
        // JSON.parse failed — treat as no saved data rather than crashing.
        state.items = [];
      }
    }
  }

  // Writes the current state to localStorage as one JSON string.
  function save(state, warn) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items, nextId: state.nextId }));
    } catch (e) {
      console.error('localStorage write failed:', e);
      warn('⚠ Could not save to browser storage (' + e.name + '), so your changes will be lost on refresh. Export JSON now to back up, and see the console (F12) for details.');
    }
  }

  // Expose only load/save to the rest of the app.
  window.App.Storage = { load, save };
})();
