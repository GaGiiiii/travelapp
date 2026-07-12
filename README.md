# STVARI ZA PUTOVANJE

A simple, single-file travel packing-list web app. Vanilla JavaScript + Bootstrap 5, no build step — everything lives in `index.html`. Hosted as a static site on GitHub Pages, with data stored in the browser and optional real-time sync across devices via Firebase.

## Features

- **Multiple lists** — organize by category (Bazen, Teretana, Akvapark, More, Rafting, …) with tabs to switch, plus create / rename / delete.
- **Two-panel workflow** per list — *PONESI* (to pack) and *VRATI KUĆI* (to bring back); tap an item to move it between them.
- **Priorities** — mark each item P1 / P2 / P3 via a picker.
- **Sorting** — Default (date added), A-Z, Priority, or **Custom** drag-and-drop order (works on both mouse and touch). The chosen mode is remembered.
- **Per-item delete confirmation** so nothing is removed by accident.
- **Import / export**
  - Download a single list as a `.txt` file.
  - Download **all lists** as a `.json` backup, and restore it later.
  - Paste multiple items at once from text.
- **Themes** — cycle through several color themes (Nord, One Dark, Light, Sepia).
- **Multi-device sync** — optional, via Firebase Firestore using a simple *sync code* (see below).

## Data & storage

- Lists persist in the browser's `localStorage`, so the app works fully offline.
- Data model: an array of lists, each `{ name, items: [{ name, priority }], rightItems: [...], customOrder: [...] }`.
- Legacy single-list data is migrated automatically on first load.

## Multi-device sync (optional)

Sync is off until a Firebase project is configured. It uses a **sync-code** model (no accounts):

1. Create a free Firebase project at <https://console.firebase.google.com> and register a **Web** app.
2. Paste the generated `firebaseConfig` into the marked block near the bottom of `index.html`.
3. In the Firebase console, create a **Cloud Firestore** database and publish these rules:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /syncs/{code} {
         allow read: if code.matches('[A-Z2-9]{8}');
         allow write: if code.matches('[A-Z2-9]{8}')
                      && request.resource.data.lists is list
                      && request.resource.data.size() < 100;
       }
       // Shared with the Receipt Scanner app (see note below).
       match /receiptcatalogs/{code} {
         allow read: if code.matches('[A-Z2-9]{8}');
         allow write: if code.matches('[A-Z2-9]{8}')
                      && request.resource.data.catalog is list
                      && request.resource.data.size() < 100;
       }
     }
   }
   ```

   > **Shared Firebase project.** This same Firebase project (`travelapp-8b457`) is reused by the sibling [Receipt Scanner](https://github.com/GaGiiiii/receiptscanner) app, which stores its catalog in a separate `receiptcatalogs` collection. The `receiptcatalogs` rule above is what keeps that app's sync working — keep both `match` blocks whenever you edit these rules, or one of the two apps breaks.

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
