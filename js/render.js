window.App = window.App || {};

(function () {
  // Converts arbitrary text into safe HTML by round-tripping it through a
  // real DOM element's textContent → innerHTML. This is how user-typed
  // strings (item names, links, etc.) get inserted into template literals
  // below without allowing HTML/script injection (XSS).
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  // Maps a status value to the CSS class that colors it (see styles.css).
  function statusClass(status) {
    if (status === 'purchased') return 'status-purchased';
    if (status === 'out') return 'status-out';
    return 'status-pending';
  }

  // Rebuilds the whole table from `state.items`, applying filters/sort,
  // and updates the item count + total price chips.
  // `afterRender` is an optional callback (script.js passes one that does
  // duplicate-check + localStorage save) run after the DOM is updated.
  function render(state, dom, afterRender) {
    const { Filters } = window.App;
    Filters.populateScratchNameFilter(state.items, dom.filterNameInput, escapeHtml);
    const filtered = Filters.getSortedItems(Filters.getFilteredItems(state.items, dom), dom);
    const filterActive = dom.filterNameInput.value !== 'all' || dom.filterStatusSelect.value !== 'all' || dom.filterItemTypeSelect.value !== 'all' || dom.searchItemNameInput.value.trim() !== '';
    const sortActive = dom.sortPriceSelect.value !== 'none' || dom.sortStatusSelect.value !== 'none';

    dom.tableBody.innerHTML = ''; // clear old rows before rebuilding
    if (filtered.length === 0) {
      // Different empty-state message depending on whether there are no
      // items at all, or just none matching the current filter.
      const msg = state.items.length === 0
        ? 'No items yet. Add one above, or import a saved JSON file.'
        : 'No items match the current filter.';
      dom.tableBody.innerHTML = `<tr class="empty-row"><td colspan="10">${msg}</td></tr>`;
    } else {
      // Build one <tr> per item.
      filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id; // stored as data-id="..." attribute, used by event handlers to find which item was clicked/dragged

        // Show the image, or a placeholder if there's no URL. onerror
        // swaps in the placeholder too, if the URL is broken/unreachable.
        const imgCell = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'noimg',textContent:'no img'}))">`
          : `<div class="noimg">no img</div>`;

        const linkCell = item.link
          ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a>`
          : `<span style="color:var(--muted)">—</span>`;

        // '' and null/undefined both mean "no price entered" -> show a dash.
        const priceDisplay = item.price !== '' && item.price != null
          ? Number(item.price).toLocaleString() + ' N-Meseta'
          : '—';

        tr.innerHTML = `
          <td class="drag-col">${sortActive
            ? `<span class="drag-handle disabled" title="Set Sort to Manual to reorder">⠿⠿</span>`
            : `<span class="drag-handle" draggable="true" title="Drag to reorder">⠿⠿</span>`}</td>
          <td class="id-col">${item.id}</td>
          <td class="img-col">${imgCell}</td>
          <td class="name-col">${escapeHtml(item.itemName)}</td>
          <td class="name-col">${escapeHtml(item.itemType || window.App.DEFAULT_ITEM_TYPE)}</td>
          <td class="name-col">${escapeHtml(item.name)}</td>
          <td>${linkCell}</td>
          <td class="price-col ${statusClass(item.status)}">${priceDisplay}</td>
          <td>
            <select class="status-select ${statusClass(item.status)}" data-id="${item.id}">
              <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="purchased" ${item.status === 'purchased' ? 'selected' : ''}>Purchased</option>
              <option value="out" ${item.status === 'out' ? 'selected' : ''}>Out of Stock</option>
            </select>
          </td>
          <td class="actions-col">
            <button class="btn-secondary btn-small edit-btn" data-id="${item.id}">Edit</button>
            <button class="btn-danger btn-small del-btn" data-id="${item.id}">Delete</button>
          </td>
        `;
        dom.tableBody.appendChild(tr);
      });
    }

    // "3 of 10 items" when a filter/search is active, otherwise just "10 items".
    dom.itemCount.textContent = filterActive
      ? `${filtered.length} of ${state.items.length} items`
      : state.items.length + (state.items.length === 1 ? ' item' : ' items');

    // Sum prices for the currently filtered/visible rows, split by status.
    const totals = { all: 0, purchased: 0, pending: 0, out: 0 };
    filtered.forEach(i => {
      const p = Number(i.price) || 0;
      totals.all += p;
      if (totals[i.status] != null) totals[i.status] += p;
    });
    dom.totalAllEl.textContent = `Total: ${totals.all.toLocaleString()} N-Meseta`;
    dom.totalPurchasedEl.textContent = `Purchased: ${totals.purchased.toLocaleString()} N-Meseta`;
    dom.totalPendingEl.textContent = `Pending: ${totals.pending.toLocaleString()} N-Meseta`;
    dom.totalOutEl.textContent = `Out of Stock: ${totals.out.toLocaleString()} N-Meseta`;

    if (afterRender) afterRender();
  }

  // Swaps one table row into an inline edit form (called when "Edit" is
  // clicked). `renderFn` is script.js's render() — called again on
  // Save/Cancel to rebuild the row back to its normal display state.
  function startEdit(state, dom, id, renderFn) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    const tr = dom.tableBody.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;

    // Replace the row's cells with <input>/<select> editable fields,
    // pre-filled with the item's current values.
    tr.innerHTML = `
      <td class="drag-col"></td>
      <td class="id-col">${item.id}</td>
      <td class="edit-cell"><input type="url" class="e-image" value="${escapeHtml(item.image)}" placeholder="Image URL"></td>
      <td class="edit-cell"><input type="text" class="e-itemname" value="${escapeHtml(item.itemName)}" placeholder="Item Name"></td>
      <td class="edit-cell">
        <select class="e-itemtype">
          ${window.App.ITEM_TYPES.map(t => `<option value="${t}" ${(item.itemType || window.App.DEFAULT_ITEM_TYPE) === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td class="edit-cell"><input type="text" class="e-name" value="${escapeHtml(item.name)}" placeholder="Scratch Name"></td>
      <td class="edit-cell"><input type="url" class="e-link" value="${escapeHtml(item.link)}" placeholder="Scratch Link"></td>
      <td class="edit-cell"><input type="number" class="e-price" value="${item.price === '' ? '' : item.price}" placeholder="Avg Price"></td>
      <td>
        <select class="status-select ${statusClass(item.status)} e-status">
          <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="purchased" ${item.status === 'purchased' ? 'selected' : ''}>Purchased</option>
          <option value="out" ${item.status === 'out' ? 'selected' : ''}>Out of Stock</option>
        </select>
      </td>
      <td class="actions-col">
        <button class="btn-primary btn-small save-btn" data-id="${id}">Save</button>
        <button class="btn-secondary btn-small cancel-btn" data-id="${id}">Cancel</button>
      </td>
    `;

    // Save: copy each input's value back onto the real item object, then
    // re-render (this mutates `item` directly since it's a reference into
    // state.items — no need to find/replace it in the array).
    tr.querySelector('.save-btn').addEventListener('click', () => {
      item.image = tr.querySelector('.e-image').value.trim();
      // "|| item.itemName" keeps the old name if the field was cleared,
      // since itemName is required elsewhere (duplicate checks, search).
      item.itemName = tr.querySelector('.e-itemname').value.trim() || item.itemName;
      item.itemType = tr.querySelector('.e-itemtype').value;
      item.name = tr.querySelector('.e-name').value.trim() || item.name;
      item.link = tr.querySelector('.e-link').value.trim();
      const priceVal = tr.querySelector('.e-price').value;
      item.price = priceVal === '' ? '' : Number(priceVal);
      item.status = tr.querySelector('.e-status').value;
      renderFn();
    });

    // Cancel: just re-render, discarding whatever was typed (item was
    // never mutated, so this rebuilds the row from its original values).
    tr.querySelector('.cancel-btn').addEventListener('click', renderFn);
  }

  window.App.Render = { render, startEdit };
})();
