// Application state: the list data model, persistence, and the sync bridge.
// A "list" is { name, items: [{ name, priority, category }], categories: [name],
// rightItems: [name], customOrder: [name] }.
// This file owns `lists`, `activeListName`, and `sortMode`; the UI layer (app.js) reads them.

const defaultItems = [
    "Dokumenta (pasoš, lična karta, vozačka, saobraćajna, platne kartice)",
    "Dokumenta dodatna (zeleni karton, žuti karton, međunarodna vozačka, dozvola za upravljanje tuđim vozilom)",

    "Naočare",

    "Punjač za telefon",
    "Power bank",
    "Slušalice",

    "Maramice (obične, vlažne)",
    "Voda",
    "Grickalice",

    "Kozmetika (parfem, dezodorans, brijač, šampon, četkica, pasta)",
    "Lekovi",
    "Autan",

    "Šorts, bermude",
    "Majice kratki rukav",
    "Trenerka, duks",
    "Jakna",
    "Patike, cipele",
    "Kapa, šal",

    "Kupaći",
    "Peškir",
    "Papuče",
    "Krema za sunčanje",

    "Pidžama",
];

const DEFAULT_PRIORITY = 'P2';
const PRIORITY_ORDER = ['P1', 'P2', 'P3'];
const DEFAULT_CATEGORY = 'Ostalo';
const PRESET_LISTS = ['Bazen', 'Teretana', 'Akvapark', 'More', 'Rafting'];

// Normalize any stored value (legacy plain strings or {name, priority}) into an object.
function normalizeItem(item) {
    if (typeof item === 'string') return { name: item, priority: DEFAULT_PRIORITY, category: DEFAULT_CATEGORY };
    return {
        name: item.name,
        priority: PRIORITY_ORDER.includes(item.priority) ? item.priority : DEFAULT_PRIORITY,
        category: (typeof item.category === 'string' && item.category.trim()) ? item.category : DEFAULT_CATEGORY
    };
}

function normalizeList(l) {
    const items = Array.isArray(l.items) ? l.items.map(normalizeItem) : [];
    let categories = Array.isArray(l.categories)
        ? l.categories.filter(c => typeof c === 'string' && c.trim())
        : [];
    // Every category an item references must exist (preserve any explicit order first).
    items.forEach(it => { if (!categories.includes(it.category)) categories.push(it.category); });
    if (categories.length === 0) categories = [DEFAULT_CATEGORY];
    return {
        name: l.name,
        items,
        categories,
        rightItems: Array.isArray(l.rightItems) ? l.rightItems : [],
        customOrder: Array.isArray(l.customOrder) ? l.customOrder : []
    };
}

let lists;
const storedLists = localStorage.getItem('lists');
if (storedLists) {
    lists = JSON.parse(storedLists).map(normalizeList);
} else {
    // Migrate legacy single-list storage into the new multi-list model.
    const legacyItems = JSON.parse(localStorage.getItem('items') || '[]').map(normalizeItem);
    const legacyRight = JSON.parse(localStorage.getItem('rightItems') || '[]');
    const defaultListItems = legacyItems.length
        ? legacyItems
        : defaultItems.map(name => ({ name, priority: DEFAULT_PRIORITY, category: DEFAULT_CATEGORY }));
    const raw = [{ name: 'Podrazumevano', items: defaultListItems, rightItems: legacyRight }];
    PRESET_LISTS.forEach(name => raw.push({ name, items: [], rightItems: [] }));
    lists = raw.map(normalizeList);
    localStorage.removeItem('items');
    localStorage.removeItem('rightItems');
}
if (lists.length === 0) {
    lists = [normalizeList({ name: 'Podrazumevano', items: [] })];
}

let activeListName = localStorage.getItem('activeList');
if (!lists.some(l => l.name === activeListName)) activeListName = lists[0].name;

function getActiveList() {
    return lists.find(l => l.name === activeListName) || lists[0];
}

function persistLocal() {
    localStorage.setItem('lists', JSON.stringify(lists));
    localStorage.setItem('activeList', activeListName);
}

// Save locally and (if paired) push to the cloud.
function saveLists() {
    persistLocal();
    window.__cloud && window.__cloud.push(lists);
}

// --- Bridge for the Firebase sync module (js/firebase-sync.js) ---
window.__getLocalLists = () => lists;

// Called when a remote change arrives; updates local state WITHOUT pushing back.
window.__applyRemoteLists = (remoteLists) => {
    if (!Array.isArray(remoteLists)) return;
    lists = remoteLists.map(normalizeList);
    if (lists.length === 0) lists = [normalizeList({ name: 'Podrazumevano', items: [] })];
    if (!lists.some(l => l.name === activeListName)) activeListName = lists[0].name;
    persistLocal();
    renderLists();
};

saveLists();

let sortMode = localStorage.getItem('sortMode') || 'default';
if (!['default', 'az', 'priority', 'custom'].includes(sortMode)) sortMode = 'default';

// The display order is ALWAYS the persisted manual order (customOrder). Choosing a sort
// (see applySort in app.js) rewrites customOrder; dragging edits it. So sorting is a
// one-off action, and a manual drag never changes the selected sort label — the arrangement
// simply persists until the user re-applies a sort (Reset) or picks another one.
function orderComparator() {
    const order = getActiveList().customOrder || [];
    const rank = name => {
        const i = order.indexOf(name);
        return i === -1 ? Infinity : i; // unranked (e.g. newly added) items go to the end
    };
    return (a, b) => rank(a.name) - rank(b.name);
}

// Returns the active list's items grouped by category (in the list's category order),
// each group internally ordered by the saved order.
function getDisplayGroups() {
    const active = getActiveList();
    const cmp = orderComparator();
    return active.categories.map(category => ({
        category,
        items: active.items.filter(it => it.category === category).sort(cmp)
    }));
}
