# Web Dev Learning Path (from Unity/C#)

Coming from Unity/C#, OOP + event-driven habits carry over. JS async and prototypes are where those habits mislead you most.

## 1. Core web basics
- HTML/CSS: https://developer.mozilla.org/en-US/docs/Learn_web_development
- JS fundamentals: https://javascript.info (closures, async/await, prototypes)

## 2. Frontend framework
- React: https://react.dev/learn (component-based, closest mental model to Unity UI components/prefabs)
- Styling: https://tailwindcss.com/docs (utility-class CSS, used by most modern stacks)

## 3. Backend — pick based on what you want to reuse
- Reuse C#: ASP.NET Core — https://learn.microsoft.com/en-us/aspnet/core/getting-started (familiar syntax, minimal APIs are an easy on-ramp)
- Reuse JS (one language full-stack): Node.js + Express — https://nodejs.org/en/learn, https://expressjs.com/en/starter/installing.html

## 4. Database basics
- SQLite first (zero setup): https://www.sqlitetutorial.net
- Then Postgres when ready: https://www.postgresqltutorial.com

## 5. Deploy
- Frontend: GitHub Pages / Vercel (https://vercel.com)
- Backend: Railway or Render (free tiers, simple)

## Suggested order
HTML/CSS/JS → build 2-3 small static projects (like this wantlist) → React → small React+backend CRUD app → pick backend lane.

## FAQ: does splitting HTML/CSS/JS into separate files = OOP?

No. Splitting into `.html`/`.css`/`.js` is **separation of concerns**, not OOP — a different concept.

- HTML = structure (markup, no logic)
- CSS = presentation (styling rules; a CSS "class" is just a style selector, unrelated to OOP classes)
- JS = the only one of the three that runs logic, so OOP (real `class`, objects, methods, inheritance) only happens in JS

OOP-in-JS example:

```js
class WantlistItem {
  constructor(itemName, price, status) {
    this.itemName = itemName;
    this.price = price;
    this.status = status;
  }
  get displayPrice() {
    return this.price ? this.price.toLocaleString() + ' N-Meseta' : '—';
  }
}
```

Unity analogy: `class WantlistItem` ≈ a C# class (fields/constructor/methods, same idea — just not a MonoBehaviour since there's no GameObject/scene). Splitting logic across multiple `.js` files is also just organization, not what makes it OOP — using `class`/objects is what makes it OOP.

This project's `script.js` is **not** OOP-style — plain functions + a flat array of plain objects (`items.push({...})`). Fine at this size; refactor to classes only pays off once per-item behavior/state gets complex.

### Follow-up: doesn't that make HTML/CSS a "god class"?

No — "god class" is an OOP anti-pattern (one class doing too much). HTML/CSS aren't classes at all, so the term doesn't apply. But a single giant `index.html` + single giant `styles.css` does get messy at scale — a different problem, not OOP's problem.

How each scales instead:

- **CSS**: split into multiple files by concern (`base.css`, `layout.css`, `buttons.css`), or use a naming convention like BEM (`.card__title--active`) to avoid class-name collisions. Still no logic, no inheritance — just organized styling rules.
- **HTML**: plain HTML has no native "include one file into another." That's exactly why component frameworks exist — React/Vue let you write `<ItemRow />` as a reusable chunk (markup+style+logic bundled), closest analog to a Unity prefab. Native browser equivalent: **Web Components** (`class MyCard extends HTMLElement`) — actually IS a JS class, encapsulating its own HTML+CSS+behavior.

Unity analogy: `index.html` ≈ a Scene file (data describing a hierarchy, not code). `styles.css` ≈ a shared style/material preset applied by name. Neither is a class; JS is where actual class/object logic lives.

For a project this size, one `.html` + one `.css` + one `.js` is fine — modularizing pays off once markup/styles get big enough to be hard to scan, which isn't yet here.

### Correction: "god class" meaning one script carries all the logic without separating it

That's right, and broader than my first answer — "god object/class" *generally* means "one unit knows/does too much," not strictly limited to OOP `class` syntax. A single `.js` file carrying every responsibility without splitting counts too.

Concrete example: this project's `script.js` already does exactly that — one file, one IIFE, doing:
- state (`items` array)
- storage (`load`/`save`)
- rendering (`render`)
- form handling (add/edit)
- filtering + sorting
- drag/drop reorder
- import/export

9 responsibilities, ~400 lines, one file. Not a "god *class*" (no `class` keyword involved), but yes — a **god module/script** in the general sense. Fine at this size since it's easy to scan; the antipattern bites when a file like this keeps growing and nobody can find anything in it anymore. Fix at that point = split into files by responsibility (`storage.js`, `render.js`, `filters.js`) or move to a component framework where each piece owns its own slice.

## Recommended VS Code extensions

Relevant now (plain HTML/CSS/JS):

- **Live Server** (Ritwick Dey) — serves via `localhost` instead of `file://`. Fixes the storage/CORS issues that come from double-clicking `index.html` directly. Right-click `index.html` → "Open with Live Server".
- **ESLint** — catches JS bugs before runtime (undefined vars, etc).
- **Error Lens** — shows errors/warnings inline instead of only in the Problems panel.
- **Auto Rename Tag** — rename `<div>` open tag, close tag follows.
- **GitLens** — inline blame/history, useful once the repo has more commits.

Skipped as redundant with VS Code's built-ins:
- Prettier — VS Code's native formatter (`Shift+Alt+F` / format-on-save) covers plain HTML/CSS/JS fine. Prettier only earns its keep once JSX/complex configs come in and a team wants one canonical enforced style.
- Color Highlight — VS Code's built-in CSS language service already shows inline color swatches next to hex/rgb/hsl values.

For later (once you hit React/Tailwind):
- **ES7+ React/Redux/React-Native snippets** — typing shortcuts (`rafce` → full functional component boilerplate). Works for React web and React Native since both use JSX; not RN-specific despite the name.
- **Tailwind CSS IntelliSense**

Not relevant to this path: **React Native Tools** (Microsoft) — that's mobile dev tooling (debugger, device/simulator integration, Expo/RN CLI run configs). Only useful if building actual iOS/Android apps with React Native; does nothing in a React-for-web project.
