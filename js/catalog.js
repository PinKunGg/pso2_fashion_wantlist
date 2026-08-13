window.App = window.App || {};

// A small, self-contained list of user-added quick links (e.g. scratch
// catalog sites, wikis) shown in the "Catalog" panel. Deliberately kept
// separate from the wantlist's `items`/`nextId` state — different data,
// own localStorage key — so this file owns its DOM elements and runs
// itself, instead of being wired up by js/script.js.
(function () {
  const STORAGE_KEY = 'pso2_fashion_wantlist_catalog';
  let links = [];
  let nextId = 1;
  let listEl = null; // set in init(); used by replaceAll/mergeAppend below to re-render after js/script.js imports data

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        links = Array.isArray(parsed.links) ? parsed.links : [];
        nextId = parsed.nextId || (links.reduce((m, l) => Math.max(m, l.id), 0) + 1);
      }
    } catch (e) {
      // Blocked/corrupted storage: fall back to an empty catalog rather
      // than crash. The main wantlist's storage warning banner already
      // covers telling the user their browser is blocking localStorage.
      console.error('Catalog load failed:', e);
      links = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ links, nextId }));
    } catch (e) {
      console.error('Catalog save failed:', e);
    }
  }

  // Same escape-via-textContent trick as js/render.js — kept local since
  // this module doesn't depend on render.js.
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function render(listEl) {
    if (links.length === 0) {
      listEl.innerHTML = '<span class="catalog-empty">No links yet — add one below.</span>';
    } else {
      // Edit/Delete live in one dropdown behind a single "⋮" trigger
      // instead of two separate buttons — see the menu-toggle/outside-click
      // handling in init() below.
      listEl.innerHTML = links.map(l => `
        <span class="catalog-item">
          <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>
          <span class="dropdown-menu">
            <button type="button" class="dropdown-menu-btn" title="More options">⋮</button>
            <div class="dropdown-menu-list">
              <button type="button" class="catalog-edit-btn" data-id="${l.id}">Edit</button>
              <button type="button" class="catalog-del-btn" data-id="${l.id}">Delete</button>
            </div>
          </span>
        </span>
      `).join('');
    }
    save();
  }

  // Read-only snapshot for js/script.js's Export JSON to embed alongside
  // the wantlist items.
  function getExportData() {
    return { links, nextId };
  }

  // Used by js/script.js's Import JSON, mirroring the wantlist's own
  // replace/merge choice: replaceAll swaps the catalog wholesale,
  // mergeAppend adds the incoming links on top of what's already there
  // (assigning fresh ids, same as how items get merged).
  function replaceAll(data) {
    if (!data || !Array.isArray(data.links)) return;
    links = data.links;
    nextId = data.nextId || (links.reduce((m, l) => Math.max(m, l.id || 0), 0) + 1);
    if (listEl) render(listEl);
  }

  function mergeAppend(data) {
    if (!data || !Array.isArray(data.links)) return;
    data.links.forEach(l => {
      links.push({ id: nextId++, label: l.label, url: l.url });
    });
    if (listEl) render(listEl);
  }

  function init() {
    listEl = document.getElementById('catalog-list');
    const addBtn = document.getElementById('catalog-add-btn');
    const overlay = document.getElementById('catalog-modal-overlay');
    const titleEl = document.getElementById('catalog-modal-title');
    const submitBtn = document.getElementById('catalog-submit-btn');
    const form = document.getElementById('catalog-form');
    const labelInput = document.getElementById('cat-label');
    const urlInput = document.getElementById('cat-url');
    const cancelBtn = document.getElementById('catalog-cancel-btn');

    // One popup does double duty for both Add and Edit. null = adding a
    // new link; otherwise the id of the link currently being edited, set
    // by openPopup() and read back in the submit handler below.
    let editingId = null;

    // Same open/close mechanics as js/modal.js's overlay (rAF-delayed
    // "open" class for the fade/scale transition, Escape/backdrop-click to
    // dismiss), kept local here since this popup needs actual input
    // fields rather than App.Modal's plain text message.
    // `link` omitted = blank "Add" popup; passed = pre-filled "Edit" popup.
    function openPopup(link) {
      editingId = link ? link.id : null;
      titleEl.textContent = link ? 'Edit Catalog Link' : 'Add Catalog Link';
      submitBtn.textContent = link ? 'Save' : 'Add Link';
      labelInput.value = link ? link.label : '';
      urlInput.value = link ? link.url : '';
      overlay.style.display = 'flex';
      requestAnimationFrame(() => overlay.classList.add('open'));
      labelInput.focus();
    }

    function closePopup() {
      overlay.classList.remove('open');
      overlay.style.display = 'none';
    }

    addBtn.addEventListener('click', () => openPopup());
    cancelBtn.addEventListener('click', closePopup);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) closePopup(); // backdrop click, not a click inside the box
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (overlay.style.display !== 'none') closePopup();
        closeAllMenus();
      }
    });

    // Only one chip's "⋮" dropdown open at a time.
    function closeAllMenus() {
      listEl.querySelectorAll('.dropdown-menu-list.open').forEach(d => d.classList.remove('open'));
    }

    // Click anywhere outside a chip's menu closes it. Runs after the
    // listEl click handler below (document is further up the bubble
    // path), so a click that just opened a menu doesn't immediately
    // close it again: e.target (the "⋮" button) is still inside
    // .dropdown-menu at that point.
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-menu')) closeAllMenus();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const label = labelInput.value.trim();
      const url = urlInput.value.trim();
      if (!label || !url) return;
      if (editingId != null) {
        const link = links.find(l => l.id === editingId);
        if (link) { link.label = label; link.url = url; }
      } else {
        links.push({ id: nextId++, label, url });
      }
      closePopup();
      render(listEl);
    });

    // Event delegation on the list, same reasoning as js/script.js's
    // table-body listeners: rows are rebuilt on every render(), so one
    // listener on the container beats re-attaching one per button.
    listEl.addEventListener('click', async (e) => {
      const menuBtn = e.target.closest('.dropdown-menu-btn');
      if (menuBtn) {
        const dropdown = menuBtn.nextElementSibling;
        const wasOpen = dropdown.classList.contains('open');
        closeAllMenus();
        if (!wasOpen) dropdown.classList.add('open');
        return;
      }

      if (e.target.classList.contains('catalog-edit-btn')) {
        closeAllMenus();
        const id = Number(e.target.dataset.id);
        const link = links.find(l => l.id === id);
        if (link) openPopup(link);
        return;
      }

      if (e.target.classList.contains('catalog-del-btn')) {
        closeAllMenus();
        const id = Number(e.target.dataset.id);
        const link = links.find(l => l.id === id);
        const ok = await window.App.Modal.confirm(
          `Remove "${link ? link.label : 'this link'}" from the catalog?`,
          { danger: true, confirmText: 'Remove' }
        );
        if (!ok) return;
        links = links.filter(l => l.id !== id);
        render(listEl);
      }
    });

    load();
    render(listEl);
  }

  window.App.Catalog = { getExportData, replaceAll, mergeAppend };

  init();
})();
