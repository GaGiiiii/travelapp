// Application state: the list data model, persistence, and the sync bridge.
// A "list" is { name, items: [{ name, priority }], rightItems: [name], customOrder: [name] }.
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
const PRESET_LISTS = ['Bazen', 'Teretana', 'Akvapark', 'More', 'Rafting'];

// Normalize any stored value (legacy plain strings or {name, priority}) into an object.
function normalizeItem(item) {
    if (typeof item === 'string') return { name: item, priority: DEFAULT_PRIORITY };
    return {
        name: item.name,
        priority: PRIORITY_ORDER.includes(item.priority) ? item.priority : DEFAULT_PRIORITY
    };
}

function normalizeList(l) {
    return {
        name: l.name,
        items: Array.isArray(l.items) ? l.items.map(normalizeItem) : [],
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
        : defaultItems.map(name => ({ name, priority: DEFAULT_PRIORITY }));
    lists = [{ name: 'Podrazumevano', items: defaultListItems, rightItems: legacyRight }];
    PRESET_LISTS.forEach(name => lists.push({ name, items: [], rightItems: [] }));
    localStorage.removeItem('items');
    localStorage.removeItem('rightItems');
}
if (lists.length === 0) {
    lists = [{ name: 'Podrazumevano', items: [], rightItems: [] }];
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
    if (lists.length === 0) lists = [{ name: 'Podrazumevano', items: [], rightItems: [] }];
    if (!lists.some(l => l.name === activeListName)) activeListName = lists[0].name;
    persistLocal();
    renderLists();
};

saveLists();

let sortMode = localStorage.getItem('sortMode') || 'default';

// Returns the active list's items in the order dictated by the current sort mode.
function getDisplayItems() {
    const active = getActiveList();
    const copy = active.items.slice();
    if (sortMode === 'az') {
        copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'priority') {
        copy.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
    } else if (sortMode === 'custom') {
        const order = active.customOrder || [];
        const rank = name => {
            const i = order.indexOf(name);
            return i === -1 ? Infinity : i; // unranked items keep insertion order at the end
        };
        copy.sort((a, b) => rank(a.name) - rank(b.name));
    }
    return copy;
}
