// Orchestrator file: owns the app's state, grabs all the DOM element
// references, and wires up event listeners. Delegates actual work
// (storage, filtering/sorting, rendering) to App.Storage / App.Filters /
// App.Render, which must already be loaded (see <script> order in index.html).
(function () {
  const { Storage, Render, Filters, Modal } = window.App;

  // The single source of truth for app data. `items` is the array of
  // wantlist entries; `nextId` is the id to assign to the next new item.
  // Passed by reference into Storage/Render/Filters functions so they can
  // read/mutate it without each file needing its own copy.
  const state = { items: [], nextId: 1 };

  // Cache all the DOM elements render.js/filters.js need, in one object
  // (`dom`) so they don't have to call document.getElementById themselves.
  const dom = {
    tableBody: document.getElementById('table-body'),
    itemCount: document.getElementById('item-count'),
    totalAllEl: document.getElementById('total-all'),
    totalPurchasedEl: document.getElementById('total-purchased'),
    totalPendingEl: document.getElementById('total-pending'),
    totalOutEl: document.getElementById('total-out'),
    filterNameInput: document.getElementById('filter-name'),
    filterStatusSelect: document.getElementById('filter-status'),
    filterItemTypeSelect: document.getElementById('filter-itemtype'),
    sortPriceSelect: document.getElementById('sort-price'),
    sortStatusSelect: document.getElementById('sort-status'),
    searchItemNameInput: document.getElementById('search-itemname')
  };

  // Elements only used here in script.js (the "Add Item" form + its
  // duplicate-name indicator), kept separate from `dom` since render.js
  // and filters.js don't need them.
  const form = document.getElementById('entry-form');
  const fImage = document.getElementById('f-image');
  const fItemName = document.getElementById('f-itemname');
  const fItemType = document.getElementById('f-itemtype');
  const fName = document.getElementById('f-name');
  const fLink = document.getElementById('f-link');
  const fPrice = document.getElementById('f-price');
  const fStatus = document.getElementById('f-status');
  const dupIndicator = document.getElementById('dup-indicator');
  const batchItemTypeSelect = document.getElementById('batch-itemtype-select');
  const batchApplyBtn = document.getElementById('batch-apply-itemtype-btn');

  // Item type is a fixed list (App.ITEM_TYPES, defined in js/filters.js),
  // not derived from data — fill in the Add Item form select, the filter
  // select, and the batch-edit select once at startup, defaulting to
  // App.DEFAULT_ITEM_TYPE.
  const itemTypeOptionsHtml = window.App.ITEM_TYPES
    .map(t => `<option value="${t}" ${t === window.App.DEFAULT_ITEM_TYPE ? 'selected' : ''}>${t}</option>`)
    .join('');
  fItemType.innerHTML = itemTypeOptionsHtml;
  dom.filterItemTypeSelect.innerHTML = '<option value="all">All Item Types</option>' + itemTypeOptionsHtml;
  dom.filterItemTypeSelect.value = 'all';
  batchItemTypeSelect.innerHTML = itemTypeOptionsHtml;

  // True if an item with this name (case-insensitive, trimmed) is already
  // in the list. Used both to block adding duplicates and to live-warn
  // while typing in the Add Item form.
  function isDuplicateName(name) {
    const val = name.trim().toLowerCase();
    return !!val && state.items.some(i => (i.itemName || '').trim().toLowerCase() === val);
  }

  // Updates the "⚠ Already in list" / "✓ New item" hint next to the Item
  // Name field as the user types.
  function checkDuplicate() {
    const val = fItemName.value.trim();
    if (!val) {
      dupIndicator.className = 'dup-indicator';
      dupIndicator.textContent = '';
      return;
    }
    const exists = isDuplicateName(val);
    dupIndicator.textContent = exists ? '⚠ Already in list' : '✓ New item';
    dupIndicator.className = 'dup-indicator ' + (exists ? 'dup-exists' : 'dup-new');
  }

  fItemName.addEventListener('input', checkDuplicate);

  // Shows a persistent red banner (see #storage-warning in index.html)
  // when localStorage read/write fails, e.g. blocked by the browser — the
  // message already includes the specific reason (e.name) from
  // js/storage.js. Also pops a one-time modal so it's impossible to miss,
  // without spamming a popup on every render() (save() runs on every one).
  let storageWarned = false;
  function warnStorage(message) {
    const el = document.getElementById('storage-warning');
    el.textContent = message;
    el.style.display = 'block';
    if (!storageWarned) {
      storageWarned = true;
      Modal.alert(message, { title: 'Storage error', danger: true });
    }
  }

  // Batch edit only makes sense once the item-type filter narrows things
  // down to a specific type — with it on "All Item Types" the "filtered"
  // set is effectively everything, so disable the controls to avoid an
  // accidental mass-overwrite.
  function updateBatchEditState() {
    const disabled = dom.filterItemTypeSelect.value === 'all';
    batchItemTypeSelect.disabled = disabled;
    batchApplyBtn.disabled = disabled;
  }

  // The single function every event handler below calls after changing
  // state: re-renders the table, then (via the callback) re-checks the
  // duplicate indicator and persists state to localStorage.
  function render() {
    updateBatchEditState();
    Render.render(state, dom, () => {
      checkDuplicate();
      Storage.save(state, warnStorage);
    });
  }

  // --- Add Item form ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // stop the browser's default full-page-reload form submit
    const itemName = fItemName.value.trim();
    const name = fName.value.trim();
    if (!itemName) return; // "required" on the input already blocks this, this is a safety net
    if (isDuplicateName(itemName)) {
      await Modal.alert(`"${itemName}" is already in the list.`);
      return;
    }
    state.items.push({
      id: state.nextId++, // use current value, then increment for next time
      image: fImage.value.trim(),
      itemName: itemName,
      itemType: fItemType.value,
      name: name,
      link: fLink.value.trim(),
      price: fPrice.value === '' ? '' : Number(fPrice.value),
      status: fStatus.value
    });
    render();
  });

  // --- Filter / sort / search controls ---
  dom.filterNameInput.addEventListener('change', render);
  dom.filterStatusSelect.addEventListener('change', render);
  dom.filterItemTypeSelect.addEventListener('change', render);
  dom.searchItemNameInput.addEventListener('input', render); // 'input' = fires on every keystroke, not just on blur
  dom.sortPriceSelect.addEventListener('change', () => {
    // Only one sort can be active at a time — picking a price sort clears
    // the status sort dropdown back to "none".
    if (dom.sortPriceSelect.value !== 'none') dom.sortStatusSelect.value = 'none';
    render();
  });
  dom.sortStatusSelect.addEventListener('change', () => {
    if (dom.sortStatusSelect.value !== 'none') dom.sortPriceSelect.value = 'none';
    render();
  });
  document.getElementById('filter-clear-btn').addEventListener('click', () => {
    dom.filterNameInput.value = 'all';
    dom.filterStatusSelect.value = 'all';
    dom.filterItemTypeSelect.value = 'all';
    dom.searchItemNameInput.value = '';
    render();
  });

  // "Clear Field" button on the Add Item form — confirms first if you've
  // typed something that hasn't been added yet, to avoid losing work.
  document.getElementById('clear-field-btn').addEventListener('click', async () => {
    const itemName = fItemName.value.trim();
    if (itemName && !isDuplicateName(itemName)) {
      const proceed = await Modal.confirm(`"${itemName}" has not been added yet. Clear the field anyway?`);
      if (!proceed) return;
    }
    form.reset();
    fStatus.value = 'pending'; // form.reset() alone would leave this at its HTML default, which is already 'pending', but set explicitly for clarity
    checkDuplicate();
  });

  // --- Table row interactions (event delegation: one listener on the
  // whole <tbody> instead of one per row/button, since rows are rebuilt
  // on every render() and re-attaching listeners each time would be slower
  // and easy to get wrong) ---

  // Status dropdown inside a row changed.
  dom.tableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('status-select')) {
      const id = Number(e.target.dataset.id);
      const item = state.items.find(i => i.id === id);
      if (item) {
        item.status = e.target.value;
        render();
      }
    }
  });

  // Edit/Delete buttons inside a row.
  dom.tableBody.addEventListener('click', async (e) => {
    const id = Number(e.target.dataset.id);
    if (!id) return; // click wasn't on a button that has a data-id (e.g. clicked empty table space)

    if (e.target.classList.contains('del-btn')) {
      if (await Modal.confirm('Delete this item?', { danger: true, confirmText: 'Delete' })) {
        state.items = state.items.filter(i => i.id !== id);
        render();
      }
    }

    if (e.target.classList.contains('edit-btn')) {
      Render.startEdit(state, dom, id, render);
    }
  });

  // --- Drag-and-drop row reordering (manual sort order) ---
  let draggedId = null; // id of the row currently being dragged, or null when not dragging

  dom.tableBody.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const sortActive = dom.sortPriceSelect.value !== 'none' || dom.sortStatusSelect.value !== 'none';
    // Only allow starting a drag from the ⠿⠿ handle, and only when no
    // price/status sort is overriding the manual order (see drag-handle
    // "disabled" styling in render.js when sortActive).
    if (!e.target.closest('.drag-handle') || sortActive) { e.preventDefault(); return; }
    draggedId = Number(tr.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(draggedId)); // required by some browsers for drag to work at all
    tr.classList.add('dragging'); // dims the row being dragged (see styles.css)
  });

  dom.tableBody.addEventListener('dragover', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || draggedId == null) return;
    e.preventDefault(); // required to allow a drop to happen here at all
    const rect = tr.getBoundingClientRect();
    // Figure out whether the mouse is over the top or bottom half of this
    // row, to show a drop-indicator line above or below it.
    const isTopHalf = (e.clientY - rect.top) < rect.height / 2;
    dom.tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
    tr.classList.add(isTopHalf ? 'drag-over-top' : 'drag-over-bottom');
  });

  dom.tableBody.addEventListener('dragleave', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) tr.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  dom.tableBody.addEventListener('drop', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || draggedId == null) return;
    e.preventDefault();
    const targetId = Number(tr.dataset.id);
    const rect = tr.getBoundingClientRect();
    const isTopHalf = (e.clientY - rect.top) < rect.height / 2;
    tr.classList.remove('drag-over-top', 'drag-over-bottom');
    if (targetId !== draggedId) {
      // Remove the dragged item from its old position, then re-insert it
      // just before (top half) or after (bottom half) the drop target.
      const fromIdx = state.items.findIndex(i => i.id === draggedId);
      const [moved] = state.items.splice(fromIdx, 1);
      let toIdx = state.items.findIndex(i => i.id === targetId);
      if (!isTopHalf) toIdx += 1;
      state.items.splice(toIdx, 0, moved);
      render();
    }
  });

  dom.tableBody.addEventListener('dragend', () => {
    draggedId = null;
    dom.tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom'));
  });

  // --- Export / Import JSON ---
  document.getElementById('export-btn').addEventListener('click', () => {
    const data = JSON.stringify({ items: state.items, nextId: state.nextId, exportedAt: new Date().toISOString() }, null, 2);
    // Build a downloadable file entirely in the browser: wrap the JSON
    // string in a Blob, turn that into a temporary object URL, then
    // simulate a click on an invisible <a download> link to trigger the
    // browser's save-file dialog.
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    a.href = url;
    a.download = `pso2-fashion-wantlist-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url); // free the memory backing the temporary URL
  });

  const fileInput = document.getElementById('file-input');
  // The visible "Import JSON" button just proxies to the (hidden) native
  // file picker input, so we get OS file-dialog styling for free.
  document.getElementById('import-btn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return; // user opened the picker and cancelled
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        // Accept both our own export format ({ items: [...] }) and a bare
        // array, in case someone hand-edits or generates a simpler file.
        const incoming = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : null);
        if (!incoming) throw new Error('JSON has no "items" array');
        const replace = await Modal.confirm('Replace current table with imported data?\n(Cancel = merge/append instead)', { confirmText: 'Replace' });
        if (replace) {
          state.items = incoming;
          state.nextId = parsed.nextId || (state.items.reduce((m, i) => Math.max(m, i.id || 0), 0) + 1);
        } else {
          // Merge: give every incoming item a fresh id so it can't collide
          // with an existing one, instead of trusting the imported ids.
          incoming.forEach(i => {
            state.items.push({ ...i, id: state.nextId++ });
          });
        }
        render();
      } catch (err) {
        console.error('Import failed:', err);
        await Modal.alert('Could not load file: ' + (err && err.message ? err.message : err));
      }
      fileInput.value = ''; // reset so selecting the same file again still fires 'change'
    };
    reader.onerror = async () => {
      console.error('File read failed:', reader.error);
      await Modal.alert('Could not read file: ' + (reader.error ? reader.error.message || reader.error.name : 'unknown error'));
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Guesses an item type from the item name for every item still set to
  // "None" (see AUTO_TYPE_RULES in js/filters.js); leaves already-typed
  // items and non-matching names alone.
  document.getElementById('auto-assign-type-btn').addEventListener('click', async () => {
    const proceed = await Modal.confirm('Auto-assign item type for every item currently set to "None", based on its name? Items already typed are left alone.', { confirmText: 'Auto-assign' });
    if (!proceed) return;
    const count = Filters.autoAssignItemTypes(state.items);
    await Modal.alert(count > 0
      ? `Updated item type for ${count} item${count === 1 ? '' : 's'}.`
      : 'No items updated — nothing matched, or no items are set to "None".');
    if (count > 0) render();
  });

  // Sets item type for whatever the filter toolbar is currently showing
  // (not all items) — overrides existing types unconditionally, unlike
  // Auto-assign Type which only touches items still set to "None".
  document.getElementById('batch-apply-itemtype-btn').addEventListener('click', async () => {
    const filtered = Filters.getFilteredItems(state.items, dom);
    if (filtered.length === 0) {
      await Modal.alert('No items match the current filter — nothing to update.');
      return;
    }
    const target = batchItemTypeSelect.value;
    const proceed = await Modal.confirm(`Set item type to "${target}" for ${filtered.length} filtered item${filtered.length === 1 ? '' : 's'}?`, { confirmText: 'Set Type' });
    if (!proceed) return;
    filtered.forEach(item => { item.itemType = target; });
    render();
  });

  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (state.items.length === 0) return; // nothing to clear
    if (await Modal.confirm('Delete ALL items from the table? This cannot be undone (export first if unsure).', { danger: true, confirmText: 'Delete All' })) {
      state.items = [];
      state.nextId = 1;
      render();
    }
  });

  // --- Startup: load saved data, then do the first render ---
  Storage.load(state, warnStorage);
  render();
})();
