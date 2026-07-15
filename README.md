# STVARI ZA PUTOVANJE

A simple, single-file travel packing-list web app. Vanilla JavaScript + Bootstrap 5, no build step — everything lives in `index.html`. Hosted as a static site on GitHub Pages, with data stored in the browser and optional real-time sync across devices via Firebase.

## Features

- **Multiple lists** — separate packing lists (Bazen, Teretana, Akvapark, More, Rafting, …) with tabs to switch, plus create / rename / delete.
- **Subcategories** — each list groups its items into user-managed categories (add / rename / delete). Drag a category header to reorder categories.
- **Rename & recategorize items** — rename any item, and move it between categories via a picker or by dragging it into another category's section.
- **Two-panel workflow** per list — *PONESI* (to pack) and *VRATI KUĆI* (to bring back), both grouped under the same category headers as the main list; tap an item to move it between them.
- **Priorities** — mark each item P1 / P2 / P3 via a picker.
- **Sorting** — Default (date added), A-Z, Priority (priority then A-Z), and Custom (fully manual), applied within each category. Sorting is an action that arranges items; after that you can **drag items freely and the chosen mode stays selected** — the manual arrangement persists until you press **Reset** (re-applies the current sort). Works on mouse and touch.
- **Everything via styled modals** — rename, delete confirmations, category picker, and alerts all use the app's own modals (no native browser dialogs).
- **Import / export** — full-fidelity JSON (items, priorities, categories, order, and packed/returned state are all preserved):
  - **Export this list** (`.json`) / **Export all lists** (`.json` backup).
  - **Import a list** (`.json`) — adds it (or several) alongside your current lists, auto-renaming name clashes.
  - **Restore backup** (`.json`) — replaces all lists (behind a confirmation).
  - Paste multiple items at once from text.
- **Themes** — cycle through several color themes (Nord, One Dark, Light, Sepia).
- **Multi-device sync** — optional, via Firebase Firestore using a simple *sync code* (see below).

## Data & storage

- Lists persist in the browser's `localStorage`, so the app works fully offline.
- Data model: an array of lists, each `{ name, items: [{ name, priority, category }], categories: [...], rightItems: [...], customOrder: [...] }`. Items, `rightItems`, and `customOrder` are keyed by item name (renaming propagates to all three).
- Legacy single-list data is migrated automatically on first load.

## Multi-device sync (optional)

Sync is off until a Firebase project is configured. It uses a **sync-code** model (no accounts):

1. Create a free Firebase project at <https://console.firebase.google.com> and register a **Web** app.
2. Paste the generated `firebaseConfig` into the marked block near the bottom of `index.html`.
3. In the Firebase console, create a **Cloud Firestore** database and add security rules that restrict reads/writes to your sync-code documents (e.g. only allow access to documents whose id is a valid 8-character code). Never leave the database in test/open mode.

4. Open the app, click the **cloud** button → **Napravi kod** on one device, then enter that code on another to pair them. Edits then sync both ways in real time.

> The device that *creates* the code seeds the shared data; a device that *joins* has its local lists replaced by the shared set. After pairing, sync is bidirectional (last write wins).

**Security note:** the Firebase web `apiKey` is public by design — it identifies the project, not authenticates it. Access is controlled by the Firestore rules above and (optionally) by restricting the API key to your Pages domain in the Google Cloud console. Anyone who knows a sync code can read/write that code's data, so treat codes like passwords.

## Hosting

Served via **GitHub Pages** from the `main` branch. On the free GitHub plan, Pages requires the repository to be **public**.

## Running locally

It's a static file — open `index.html` directly in a browser, or serve the folder:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tech

- [Bootstrap 5](https://getbootstrap.com/) — layout & modals
- [Font Awesome](https://fontawesome.com/) — icons
- [SortableJS](https://sortablejs.github.io/Sortable/) — drag-and-drop reordering (mouse + touch)
- [Firebase Firestore](https://firebase.google.com/docs/firestore) — optional device sync
