(function () {
  const STORAGE_KEY = 'pso2_fashion_wantlist';
  let items = [];
  let nextId = 1;

  const tableBody = document.getElementById('table-body');
  const itemCount = document.getElementById('item-count');
  const totalAllEl = document.getElementById('total-all');
  const totalPurchasedEl = document.getElementById('total-purchased');
  const totalPendingEl = document.getElementById('total-pending');
  const totalOutEl = document.getElementById('total-out');
  const form = document.getElementById('entry-form');
  const fImage = document.getElementById('f-image');
  const fItemName = document.getElementById('f-itemname');
  const fName = document.getElementById('f-name');
  const fLink = document.getElementById('f-link');
  const fPrice = document.getElementById('f-price');
  const fStatus = document.getElementById('f-status');
  const filterNameInput = document.getElementById('filter-name');
  const filterStatusSelect = document.getElementById('filter-status');

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed.items) ? parsed.items : [];
        nextId = parsed.nextId || (items.reduce((m, i) => Math.max(m, i.id), 0) + 1);
      } catch (e) {
        items = [];
      }
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, nextId }));
  }

  function statusClass(status) {
    if (status === 'purchased') return 'status-purchased';
    if (status === 'out') return 'status-out';
    return 'status-pending';
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function populateScratchNameFilter() {
    const current = filterNameInput.value;
    const names = [...new Set(items.map(i => i.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    filterNameInput.innerHTML = '<option value="all">All Scratch Names</option>' +
      names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    filterNameInput.value = names.includes(current) ? current : 'all';
  }

  function getFilteredItems() {
    const selectedName = filterNameInput.value;
    const status = filterStatusSelect.value;
    return items.filter(item => {
      const matchesName = selectedName === 'all' || item.name === selectedName;
      const matchesStatus = status === 'all' || item.status === status;
      return matchesName && matchesStatus;
    });
  }

  function render() {
    populateScratchNameFilter();
    const filtered = getFilteredItems();
    const filterActive = filterNameInput.value !== 'all' || filterStatusSelect.value !== 'all';

    tableBody.innerHTML = '';
    if (filtered.length === 0) {
      const msg = items.length === 0
        ? 'No items yet. Add one above, or import a saved JSON file.'
        : 'No items match the current filter.';
      tableBody.innerHTML = `<tr class="empty-row"><td colspan="9">${msg}</td></tr>`;
    } else {
      filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id;
        tr.draggable = true;

        const imgCell = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'noimg',textContent:'no img'}))">`
          : `<div class="noimg">no img</div>`;

        const linkCell = item.link
          ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a>`
          : `<span style="color:var(--muted)">—</span>`;

        const priceDisplay = item.price !== '' && item.price != null
          ? Number(item.price).toLocaleString() + ' N-Meseta'
          : '—';

        tr.innerHTML = `
          <td class="drag-col"><span class="drag-handle" title="Drag to reorder">⠿</span></td>
          <td class="id-col">${item.id}</td>
          <td class="img-col">${imgCell}</td>
          <td class="name-col">${escapeHtml(item.itemName)}</td>
          <td class="name-col">${escapeHtml(item.name)}</td>
          <td>${linkCell}</td>
          <td class="price-col">${priceDisplay}</td>
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
        tableBody.appendChild(tr);
      });
    }
    itemCount.textContent = filterActive
      ? `${filtered.length} of ${items.length} items`
      : items.length + (items.length === 1 ? ' item' : ' items');

    const totals = { all: 0, purchased: 0, pending: 0, out: 0 };
    filtered.forEach(i => {
      const p = Number(i.price) || 0;
      totals.all += p;
      if (totals[i.status] != null) totals[i.status] += p;
    });
    totalAllEl.textContent = `Total: ${totals.all.toLocaleString()} N-Meseta`;
    totalPurchasedEl.textContent = `Purchased: ${totals.purchased.toLocaleString()} N-Meseta`;
    totalPendingEl.textContent = `Pending: ${totals.pending.toLocaleString()} N-Meseta`;
    totalOutEl.textContent = `Out of Stock: ${totals.out.toLocaleString()} N-Meseta`;

    save();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const itemName = fItemName.value.trim();
    const name = fName.value.trim();
    if (!itemName) return;
    items.push({
      id: nextId++,
      image: fImage.value.trim(),
      itemName: itemName,
      name: name,
      link: fLink.value.trim(),
      price: fPrice.value === '' ? '' : Number(fPrice.value),
      status: fStatus.value
    });
    render();
  });

  filterNameInput.addEventListener('change', render);
  filterStatusSelect.addEventListener('change', render);
  document.getElementById('filter-clear-btn').addEventListener('click', () => {
    filterNameInput.value = 'all';
    filterStatusSelect.value = 'all';
    render();
  });

  document.getElementById('clear-field-btn').addEventListener('click', () => {
    form.reset();
    fStatus.value = 'pending';
  });

  tableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('status-select')) {
      const id = Number(e.target.dataset.id);
      const item = items.find(i => i.id === id);
      if (item) {
        item.status = e.target.value;
        e.target.className = 'status-select ' + statusClass(item.status);
        save();
      }
    }
  });

  tableBody.addEventListener('click', (e) => {
    const id = Number(e.target.dataset.id);
    if (!id) return;

    if (e.target.classList.contains('del-btn')) {
      if (confirm('Delete this item?')) {
        items = items.filter(i => i.id !== id);
        render();
      }
    }

    if (e.target.classList.contains('edit-btn')) {
      startEdit(id);
    }
  });

  let draggedId = null;

  tableBody.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    if (e.target.closest('input, select, a, button')) { e.preventDefault(); return; }
    draggedId = Number(tr.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(draggedId));
    tr.classList.add('dragging');
  });

  tableBody.addEventListener('dragover', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || draggedId == null) return;
    e.preventDefault();
    const rect = tr.getBoundingClientRect();
    const isTopHalf = (e.clientY - rect.top) < rect.height / 2;
    tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
    tr.classList.add(isTopHalf ? 'drag-over-top' : 'drag-over-bottom');
  });

  tableBody.addEventListener('dragleave', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) tr.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  tableBody.addEventListener('drop', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || draggedId == null) return;
    e.preventDefault();
    const targetId = Number(tr.dataset.id);
    const rect = tr.getBoundingClientRect();
    const isTopHalf = (e.clientY - rect.top) < rect.height / 2;
    tr.classList.remove('drag-over-top', 'drag-over-bottom');
    if (targetId !== draggedId) {
      const fromIdx = items.findIndex(i => i.id === draggedId);
      const [moved] = items.splice(fromIdx, 1);
      let toIdx = items.findIndex(i => i.id === targetId);
      if (!isTopHalf) toIdx += 1;
      items.splice(toIdx, 0, moved);
      render();
    }
  });

  tableBody.addEventListener('dragend', () => {
    draggedId = null;
    tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom'));
  });

  function startEdit(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const tr = tableBody.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;

    tr.draggable = false;

    tr.innerHTML = `
      <td class="drag-col"></td>
      <td class="id-col">${item.id}</td>
      <td class="edit-cell"><input type="url" class="e-image" value="${escapeHtml(item.image)}" placeholder="Image URL"></td>
      <td class="edit-cell"><input type="text" class="e-itemname" value="${escapeHtml(item.itemName)}" placeholder="Item Name"></td>
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

    tr.querySelector('.save-btn').addEventListener('click', () => {
      item.image = tr.querySelector('.e-image').value.trim();
      item.itemName = tr.querySelector('.e-itemname').value.trim() || item.itemName;
      item.name = tr.querySelector('.e-name').value.trim() || item.name;
      item.link = tr.querySelector('.e-link').value.trim();
      const priceVal = tr.querySelector('.e-price').value;
      item.price = priceVal === '' ? '' : Number(priceVal);
      item.status = tr.querySelector('.e-status').value;
      render();
    });

    tr.querySelector('.cancel-btn').addEventListener('click', render);
  }

  document.getElementById('export-btn').addEventListener('click', () => {
    const data = JSON.stringify({ items, nextId, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pso2-fashion-wantlist-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const fileInput = document.getElementById('file-input');
  document.getElementById('import-btn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : null);
        if (!incoming) throw new Error('Invalid file format');
        const replace = confirm('Replace current table with imported data?\n(Cancel = merge/append instead)');
        if (replace) {
          items = incoming;
          nextId = parsed.nextId || (items.reduce((m, i) => Math.max(m, i.id || 0), 0) + 1);
        } else {
          incoming.forEach(i => {
            items.push({ ...i, id: nextId++ });
          });
        }
        render();
      } catch (err) {
        alert('Could not load file: ' + err.message);
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    if (items.length === 0) return;
    if (confirm('Delete ALL items from the table? This cannot be undone (export first if unsure).')) {
      items = [];
      nextId = 1;
      render();
    }
  });

  load();
  render();
})();
