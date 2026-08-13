window.App = window.App || {};

(function () {
  // Defines the sort position of each status when sorting by status:
  // pending (0) comes before purchased (1) comes before out (2).
  const STATUS_ORDER = { pending: 0, purchased: 1, out: 2 };

  // Fixed set of item type categories (not derived from data, unlike scratch
  // names). Shared by the Add Item form, the item-type filter, and the
  // inline edit row — see js/script.js and js/render.js.
  const ITEM_TYPES = [
    'None',
    'Outerwear', 'Basewear', 'Setwear', 'Innerwear', 'Hairstyles',
    'Accessories', 'BodyPaint', 'Outfits', 'BodyParts', 'ArmParts',
    'LegParts', 'HeadParts', 'Motion', 'Emote', 'Weapon Camo', 'Consumables', 'Misc.'
  ];
  // Falls back to this when an item has no itemType set (e.g. data
  // imported from before this field existed), and is preselected on the
  // Add Item form.
  const DEFAULT_ITEM_TYPE = 'None';

  // Rebuilds the "All Scratch Names" <select> dropdown options from the
  // current item list, so it always reflects what's actually in the table.
  // `escapeHtml` is passed in (defined in render.js) instead of imported,
  // to keep this file only responsible for filter/sort logic.
  function populateScratchNameFilter(items, filterNameInput, escapeHtml) {
    const current = filterNameInput.value; // remember current selection
    // Set = collapses duplicate scratch names to unique values; Boolean
    // filters out empty/undefined names; localeCompare sorts alphabetically.
    const names = [...new Set(items.map(i => i.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    filterNameInput.innerHTML = '<option value="all">All Scratch Names</option>' +
      names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    // Restore the previous selection if it still exists, otherwise reset to "all".
    filterNameInput.value = names.includes(current) ? current : 'all';
  }

  // Returns only the items that match the current scratch-name filter,
  // status filter, item-type filter, and item-name search box (all must match).
  // `dom` is the shared object of element references from script.js.
  function getFilteredItems(items, dom) {
    const selectedName = dom.filterNameInput.value;
    const status = dom.filterStatusSelect.value;
    const itemType = dom.filterItemTypeSelect.value;
    const search = dom.searchItemNameInput.value.trim().toLowerCase();
    return items.filter(item => {
      const matchesName = selectedName === 'all' || item.name === selectedName;
      const matchesStatus = status === 'all' || item.status === status;
      const matchesType = itemType === 'all' || (item.itemType || DEFAULT_ITEM_TYPE) === itemType;
      const matchesSearch = !search || (item.itemName || '').toLowerCase().includes(search);
      return matchesName && matchesStatus && matchesType && matchesSearch;
    });
  }

  // Returns a new sorted array (does not mutate `list`) based on the
  // price/status sort dropdowns. Both can be active together: status is
  // the primary (outer) key and price the secondary (tiebreaker) key, so
  // e.g. status=pending→out + price=low→high groups items by status first
  // (out-of-stock landing last, since it's the highest STATUS_ORDER value
  // in ascending direction) and sorts by price within each status group.
  function getSortedItems(list, dom) {
    const priceDir = dom.sortPriceSelect.value;   // 'none' | 'asc' | 'desc'
    const statusDir = dom.sortStatusSelect.value;  // 'none' | 'asc' | 'desc'
    if (priceDir === 'none' && statusDir === 'none') return list; // no sort active
    const sorted = [...list]; // copy so the original array order isn't touched
    sorted.sort((a, b) => {
      if (statusDir !== 'none') {
        const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        const dir = statusDir === 'desc' ? -diff : diff;
        if (dir !== 0) return dir; // different status groups — status alone decides
      }
      if (priceDir !== 'none') {
        // Number(a.price) || 0 treats '' / missing price as 0 for sorting purposes.
        const diff = (Number(a.price) || 0) - (Number(b.price) || 0);
        return priceDir === 'desc' ? -diff : diff;
      }
      return 0;
    });
    return sorted;
  }

  // Ordered rules for guessing an item type from its item name — first
  // match wins. The numbered-emote pattern and bracketed gear-slot codes
  // are checked before the looser body-part/hair keyword matches, since a
  // bracket code is a more reliable signal than a bare substring.
  const AUTO_TYPE_RULES = [
    { test: (n) => /^\d+\s*:/.test(n), type: 'Emote' },       // "1184: Photo Pose 2"
    { test: (n) => /\[ba\]/i.test(n), type: 'Basewear' },
    { test: (n) => /\[se\]/i.test(n), type: 'Setwear' },
    { test: (n) => /\[to\]/i.test(n), type: 'Setwear' },
    { test: (n) => /\[ou\]/i.test(n), type: 'Outerwear' },
    { test: (n) => /\[in\]/i.test(n), type: 'Innerwear' },
    { test: (n) => /body/i.test(n), type: 'BodyParts' },
    { test: (n) => /arms/i.test(n), type: 'ArmParts' },
    { test: (n) => /legs/i.test(n), type: 'LegParts' },
    { test: (n) => /hair/i.test(n), type: 'Hairstyles' }
  ];

  // Returns the guessed type for an item name, or null if nothing matches.
  function guessItemType(itemName) {
    const name = itemName || '';
    const rule = AUTO_TYPE_RULES.find(r => r.test(name));
    return rule ? rule.type : null;
  }

  // Auto-assigns a type to every item still set to the default ("None"),
  // based on its item name, leaving anything already categorized alone.
  // Items whose name matches no rule are left as "None" too. Mutates
  // `items` in place; returns how many items were actually changed.
  function autoAssignItemTypes(items) {
    let count = 0;
    items.forEach(item => {
      const current = item.itemType || DEFAULT_ITEM_TYPE;
      if (current !== DEFAULT_ITEM_TYPE) return; // only touch unassigned items
      const guessed = guessItemType(item.itemName);
      if (guessed) {
        item.itemType = guessed;
        count++;
      }
    });
    return count;
  }

  window.App.ITEM_TYPES = ITEM_TYPES;
  window.App.DEFAULT_ITEM_TYPE = DEFAULT_ITEM_TYPE;
  window.App.Filters = { populateScratchNameFilter, getFilteredItems, getSortedItems, guessItemType, autoAssignItemTypes };
})();
