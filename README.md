# PSO2 Fashion Wantlist

A single-page, no-backend tool for tracking Phantasy Star Online 2 AC Scratch fashion items you want to buy — image, item name, scratch name/link, average price, and purchase status, all in one sortable table.

Open `index.html` directly in a browser, or host the folder on GitHub Pages.

## Features

- **Add items** with image URL, item name, scratch name, scratch link, average price (N-Meseta), and status (Pending / Purchased / Out of Stock).
- **Duplicate check** — a live indicator next to Item Name shows whether the item is already in the list, and adding a duplicate is blocked.
- **Inline editing** — edit any field directly in the table, or delete a row.
- **Drag to reorder** — grab the ⠿⠿ handle on the left of a row to reorder the list.
- **Filter** by scratch name and/or status, with a live "X of Y" count.
- **Totals** — running total price (and a breakdown per status) for whatever is currently filtered.
- **Export / Import JSON** — save the table to a `.json` file and load it back later (on this device or another) to keep editing.
- **Persistent** — data is auto-saved to the browser's `localStorage`, so it survives a page refresh even without exporting.
- **Responsive** — usable on mobile/tablet; the table scrolls horizontally on narrow screens.

## Project structure

```
index.html   markup only
styles.css   all styling
script.js    all app logic (state, rendering, events)
```

No build step, no dependencies — just static files.

## Usage

1. Open `index.html` in a browser (double-click it, or serve the folder any way you like).
2. Fill in the "Add Item" form and click **+ Add**.
3. Use **Export JSON** to back up your list; use **Import JSON** to load a previously exported file back in (choose to replace or merge with the current table).

## Notes

- Data lives in `localStorage`, which is scoped per browser origin. A list built while testing locally (`file://`) will **not** automatically appear on a hosted version (e.g. GitHub Pages) — export locally and import on the hosted site to carry it over.
- Image `<img>` tags are loaded with `referrerpolicy="no-referrer"` so that image hosts with hotlink protection (which key off the `Referer` header) don't serve a broken placeholder when the page is hosted elsewhere.
