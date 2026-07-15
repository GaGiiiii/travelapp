// UI layer: DOM wiring, rendering, and all user actions.
// Depends on js/state.js (lists, activeListName, sortMode, getActiveList, getDisplayGroups, saveLists, ...).

// ----- DOM references & modal instances -----
const uploadModalElement = document.getElementById('uploadModal');
const deleteModalElement = document.getElementById('deleteModal');
const deleteItemModalElement = document.getElementById('deleteItemModal');
const priorityModalElement = document.getElementById('priorityModal');
const listNameModalElement = document.getElementById('listNameModal');
const deleteListModalElement = document.getElementById('deleteListModal');
const syncModalElement = document.getElementById('syncModal');
const textInputModalElement = document.getElementById('textInputModal');
const confirmModalElement = document.getElementById('confirmModal');
const categoryPickerModalElement = document.getElementById('categoryPickerModal');
const alertModalElement = document.getElementById('alertModal');
const syncModal = new bootstrap.Modal(syncModalElement);
const textInputModal = new bootstrap.Modal(textInputModalElement);
const confirmModal = new bootstrap.Modal(confirmModalElement);
const categoryPickerModal = new bootstrap.Modal(categoryPickerModalElement);
const alertModal = new bootstrap.Modal(alertModalElement);
function openAlert(message) {
    document.getElementById('alert-message').textContent = message;
    alertModal.show();
}
const uploadModal = new bootstrap.Modal(uploadModalElement);
const deleteModal = new bootstrap.Modal(deleteModalElement);
const deleteItemModal = new bootstrap.Modal(deleteItemModalElement);
const priorityModal = new bootstrap.Modal(priorityModalElement);
const listNameModal = new bootstrap.Modal(listNameModalElement);
const deleteListModal = new bootstrap.Modal(deleteListModalElement);
const deleteItemNameEl = document.getElementById('delete-item-name');
const deleteListNameEl = document.getElementById('delete-list-name');
const listNameTitle = document.getElementById('list-name-title');
const listNameInput = document.getElementById('list-name-input');
const listNameError = document.getElementById('list-name-error');
const listTabs = document.getElementById('list-tabs');
const activeListNameEl = document.getElementById('active-list-name');
const textarea = document.getElementById('upload-textarea');

const leftList = document.getElementById('left-list');
const rightList = document.getElementById('right-list');
const allItemsList = document.getElementById('all-items');
const newItemInput = document.getElementById('new-item');
const addItemBtn = document.getElementById('add-item');
const localStorageInfo = document.getElementById('localstorage-info');
const sortSelect = document.getElementById('sort-select');

// ----- Sort selector -----
// Choosing a sort applies it once (writes the order); the Reset button re-applies it.
sortSelect.value = sortMode;
sortSelect.onchange = () => applySort(sortSelect.value);

// Apply a sort criterion to the active list: recompute the saved order (per category,
// then flattened). Rendering always reads this order, so the arrangement then persists
// through manual drags until a sort is applied again.
function applySort(mode) {
    const active = getActiveList();
    sortMode = mode;
    sortSelect.value = mode;
    localStorage.setItem('sortMode', mode);
    // 'custom' is a fully manual mode: selecting it (or Reset) leaves the current
    // order untouched — the user arranges everything by dragging.
    if (mode !== 'custom') {
        const order = [];
        active.categories.forEach(cat => {
            const inCat = active.items.filter(it => it.category === cat);
            inCat.sort((a, b) => {
                if (mode === 'az') return a.name.localeCompare(b.name);
                if (mode === 'priority') {
                    const p = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
                    return p !== 0 ? p : a.name.localeCompare(b.name);
                }
                return 0; // 'default' → keep current insertion (items-array) order
            });
            inCat.forEach(it => order.push(it.name));
        });
        active.customOrder = order;
    }
    saveLists();
    renderLists();
}

// Seed the order for a list that has never been arranged, so the stored sort label is honored.
function ensureOrder() {
    const active = getActiveList();
    if ((!active.customOrder || active.customOrder.length === 0) && active.items.length) {
        applySort(sortMode);
    }
}

// ----- Rendering -----
function renderTabs() {
    listTabs.innerHTML = '';
    lists.forEach(list => {
        const btn = document.createElement('button');
        btn.className = 'list-tab' + (list.name === activeListName ? ' active' : '');
        btn.textContent = list.name;
        btn.onclick = () => switchList(list.name);
        listTabs.appendChild(btn);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'list-add-btn';
    addBtn.title = 'Nova lista';
    addBtn.innerHTML = '<i class="fas fa-plus"></i>';
    addBtn.onclick = openNewListModal;
    listTabs.appendChild(addBtn);
}

function switchList(name) {
    activeListName = name;
    ensureOrder();
    saveLists();
    renderLists();
}

function priorityBadgeClass(priority) {
    if (priority === 'P1') return 'bg-danger';
    if (priority === 'P2') return 'bg-warning text-dark';
    return 'bg-secondary';
}

let sortableInstances = [];

// Small clickable icon control (pen, trash, folder, …). Reuses .copy-btn theming.
function iconCtrl(iconClass, title, onClick, extraClass) {
    const b = document.createElement('span');
    b.className = 'copy-btn ' + (extraClass || '');
    b.title = title;
    b.innerHTML = `<i class="fas ${iconClass}"></i>`;
    b.onclick = (e) => { e.stopPropagation(); onClick(e); };
    return b;
}

// A category header. In the LISTA STVARI panel it carries a drag handle + rename/delete.
function categoryHeader(category, manage) {
    const h = document.createElement('div');
    h.className = 'cat-header d-flex justify-content-between align-items-center';

    const left = document.createElement('span');
    left.className = 'd-flex align-items-center gap-2';
    if (manage) {
        const grip = document.createElement('span');
        grip.className = 'drag-handle cat-drag copy-btn';
        grip.title = 'Prevuci da preurediš kategorije';
        grip.innerHTML = '<i class="fas fa-grip-vertical"></i>';
        left.appendChild(grip);
    }
    const title = document.createElement('span');
    title.className = 'cat-title';
    title.textContent = category;
    left.appendChild(title);
    h.appendChild(left);

    if (manage) {
        const ctrls = document.createElement('span');
        ctrls.className = 'd-flex align-items-center gap-2';
        ctrls.append(
            iconCtrl('fa-pen', 'Preimenuj kategoriju', () => openRenameCategory(category)),
            iconCtrl('fa-trash', 'Obriši kategoriju', () => openDeleteCategory(category), 'text-danger')
        );
        h.appendChild(ctrls);
    }
    return h;
}

// One row in the LISTA STVARI (manage) panel: handle, name, category, priority, delete.
function renderManageRow(item, active) {
    const li = document.createElement('li');
    li.className = 'list-group-item item-row d-flex justify-content-between align-items-center text-start';
    li.dataset.name = item.name;

    const left = document.createElement('span');
    left.className = 'd-flex align-items-center gap-2';
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name;
    name.style.cursor = 'pointer';
    name.title = 'Klikni da preimenuješ';
    name.onclick = () => openRenameItem(item.name);
    left.append(handle, name);

    const controls = document.createElement('span');
    controls.className = 'd-flex align-items-center gap-2';

    const catBtn = iconCtrl('fa-folder', 'Premesti u kategoriju', () => openCategoryPicker(item.name));

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge rounded-pill ${priorityBadgeClass(item.priority)}`;
    priorityBadge.style.cursor = 'pointer';
    priorityBadge.title = 'Klikni da izabereš prioritet';
    priorityBadge.textContent = item.priority;
    priorityBadge.onclick = (e) => {
        e.stopPropagation();
        pendingPriorityName = item.name;
        priorityModal.show();
    };

    const delBtn = document.createElement('span');
    delBtn.className = 'badge bg-danger rounded-pill';
    delBtn.style.cursor = 'pointer';
    delBtn.textContent = 'X';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        pendingDeleteName = item.name;
        deleteItemNameEl.textContent = item.name;
        deleteItemModal.show();
    };

    controls.append(catBtn, priorityBadge, delBtn);
    li.append(left, controls);
    return li;
}

function renderLists() {
    renderTabs();
    const active = getActiveList();
    activeListNameEl.textContent = active.name;

    leftList.innerHTML = '';
    rightList.innerHTML = '';
    allItemsList.innerHTML = '';
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    getDisplayGroups().forEach(({ category, items }) => {
        // ---- LISTA STVARI (manage) — every category shown, even empty ones (drop targets) ----
        const block = document.createElement('div');
        block.className = 'cat-block';
        block.dataset.category = category;
        block.appendChild(categoryHeader(category, true));
        const manageUl = document.createElement('ul');
        manageUl.className = 'list-group cat-list mb-3';
        manageUl.dataset.category = category;
        items.forEach(item => manageUl.appendChild(renderManageRow(item, active)));
        block.appendChild(manageUl);
        allItemsList.appendChild(block);

        // ---- PONESI (left) — all items; strike-through when returned; tap to mark returned ----
        if (items.length) {
            leftList.appendChild(categoryHeader(category, false));
            const leftUl = document.createElement('ul');
            leftUl.className = 'list-group mb-3';
            items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item item-row';
                li.dataset.name = item.name;
                const span = document.createElement('span');
                span.className = 'item-name';
                span.textContent = item.name;
                li.appendChild(span);
                if (active.rightItems.includes(item.name)) li.classList.add('text-decoration-line-through', 'text-muted');
                li.onclick = () => {
                    if (!active.rightItems.includes(item.name)) {
                        active.rightItems.push(item.name);
                        saveLists();
                        renderLists();
                    }
                };
                leftUl.appendChild(li);
            });
            leftList.appendChild(leftUl);
        }

        // ---- VRATI KUĆI (right) — only returned items; tap or X to unmark ----
        const returned = items.filter(it => active.rightItems.includes(it.name));
        if (returned.length) {
            rightList.appendChild(categoryHeader(category, false));
            const rightUl = document.createElement('ul');
            rightUl.className = 'list-group mb-3';
            returned.forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item item-row d-flex justify-content-between align-items-center';
                li.dataset.name = item.name;
                const span = document.createElement('span');
                span.className = 'item-name';
                span.textContent = item.name;
                const unmark = () => {
                    active.rightItems = active.rightItems.filter(i => i !== item.name);
                    saveLists();
                    renderLists();
                };
                span.onclick = unmark;
                const removeBtn = document.createElement('span');
                removeBtn.className = 'badge bg-danger rounded-pill';
                removeBtn.textContent = 'X';
                removeBtn.onclick = unmark;
                li.append(span, removeBtn);
                rightUl.appendChild(li);
            });
            rightList.appendChild(rightUl);
        }
    });

    // Two levels of drag in LISTA STVARI: reorder categories (handle on the header),
    // and reorder/move items within & between categories. Both work in any sort mode and
    // just persist the new arrangement — the selected sort label is left unchanged.
    if (window.Sortable) {
        sortableInstances.push(window.Sortable.create(allItemsList, {
            group: 'categories',
            draggable: '.cat-block',
            handle: '.cat-drag',
            animation: 150,
            onEnd: commitCategoryOrder
        }));
        allItemsList.querySelectorAll('.cat-list').forEach(ul => {
            sortableInstances.push(window.Sortable.create(ul, {
                group: 'items',
                handle: '.drag-handle',
                animation: 150,
                onEnd: commitItemOrder
            }));
        });
    }

    updateLocalStorageInfo();
}

// Read the current DOM order across all category lists → update each item's category
// and the saved order. Does NOT change the selected sort — the arrangement just persists.
function commitItemOrder() {
    const active = getActiveList();
    const order = [];
    allItemsList.querySelectorAll('.cat-list').forEach(ul => {
        const cat = ul.dataset.category;
        ul.querySelectorAll('li.item-row').forEach(li => {
            const it = active.items.find(i => i.name === li.dataset.name);
            if (it) it.category = cat;
            order.push(li.dataset.name);
        });
    });
    active.customOrder = order;
    saveLists();
    setTimeout(renderLists, 0); // let Sortable finish before we destroy/rebuild
}

// Reorder the list's categories to match the dragged header order.
function commitCategoryOrder() {
    const active = getActiveList();
    const order = Array.from(allItemsList.querySelectorAll('.cat-block')).map(b => b.dataset.category);
    active.categories.forEach(c => { if (!order.includes(c)) order.push(c); });
    active.categories = order;
    saveLists();
    setTimeout(renderLists, 0);
}

// ----- Generic styled modals (replace native prompt/confirm) -----
// Text-input modal: onSave(value) returns an error string to show inline, or null on success.
let textInputCallback = null;
function openTextModal(title, value, onSave) {
    document.getElementById('text-input-title').textContent = title;
    const field = document.getElementById('text-input-field');
    field.value = value || '';
    document.getElementById('text-input-error').classList.add('d-none');
    textInputCallback = onSave;
    textInputModal.show();
    setTimeout(() => { field.focus(); field.select(); }, 300);
}
function submitTextInput() {
    const field = document.getElementById('text-input-field');
    const err = document.getElementById('text-input-error');
    const result = textInputCallback ? textInputCallback(field.value.trim()) : null;
    if (result) { err.textContent = result; err.classList.remove('d-none'); return; }
    textInputModal.hide();
}

// Confirm modal.
let confirmCallback = null;
function openConfirm(message, onConfirm, okLabel = 'Obriši') {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-ok-btn').textContent = okLabel;
    confirmCallback = onConfirm;
    confirmModal.show();
}
function submitConfirm() {
    const cb = confirmCallback;
    confirmCallback = null;
    confirmModal.hide();
    if (cb) cb();
}

// ----- Rename item / category actions -----
function openRenameItem(oldName) {
    openTextModal('Preimenuj stvar', oldName, (val) => {
        const active = getActiveList();
        if (!val) return 'Naziv ne može biti prazan.';
        if (val === oldName) return null;
        if (active.items.some(i => i.name === val)) return 'Stvar sa tim nazivom već postoji.';
        const item = active.items.find(i => i.name === oldName);
        item.name = val;
        active.rightItems = active.rightItems.map(n => n === oldName ? val : n);
        active.customOrder = (active.customOrder || []).map(n => n === oldName ? val : n);
        saveLists();
        renderLists();
        return null;
    });
}

function addCategoryFromInput() {
    const active = getActiveList();
    const input = document.getElementById('new-category');
    const name = input.value.trim();
    if (name && !active.categories.includes(name)) {
        active.categories.push(name);
        saveLists();
        renderLists();
    }
    input.value = '';
}

function openRenameCategory(oldName) {
    openTextModal('Preimenuj kategoriju', oldName, (val) => {
        const active = getActiveList();
        if (!val) return 'Naziv ne može biti prazan.';
        if (val === oldName) return null;
        if (active.categories.includes(val)) return 'Kategorija sa tim nazivom već postoji.';
        active.categories = active.categories.map(c => c === oldName ? val : c);
        active.items.forEach(it => { if (it.category === oldName) it.category = val; });
        saveLists();
        renderLists();
        return null;
    });
}

function openDeleteCategory(name) {
    const active = getActiveList();
    const count = active.items.filter(it => it.category === name).length;
    const msg = count
        ? `Obriši kategoriju "${name}"? ${count} stvari će biti premešteno u drugu kategoriju.`
        : `Obriši kategoriju "${name}"?`;
    openConfirm(msg, () => {
        const remaining = active.categories.filter(c => c !== name);
        const fallback = remaining[0] || DEFAULT_CATEGORY;
        active.categories = remaining.length ? remaining : [DEFAULT_CATEGORY];
        active.items.forEach(it => { if (it.category === name) it.category = fallback; });
        saveLists();
        renderLists();
    });
}

function openCategoryPicker(itemName) {
    const active = getActiveList();
    const item = active.items.find(i => i.name === itemName);
    const body = document.getElementById('category-picker-body');
    body.innerHTML = '';
    active.categories.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ' + (item && item.category === c ? 'btn-primary' : 'btn-secondary');
        btn.textContent = c;
        btn.onclick = () => { changeItemCategory(itemName, c); categoryPickerModal.hide(); };
        body.appendChild(btn);
    });
    categoryPickerModal.show();
}

function changeItemCategory(name, newCategory) {
    const active = getActiveList();
    const it = active.items.find(i => i.name === name);
    if (it) {
        it.category = newCategory;
        saveLists();
        renderLists();
    }
}

// ----- Modal helpers & centering -----
function openUploadModal() {
    textarea.value = '';
    uploadModal.show();
}

function openDeleteModal() {
    textarea.value = '';
    deleteModal.show();
}

const modals = [uploadModalElement, deleteModalElement, deleteItemModalElement, priorityModalElement, listNameModalElement, deleteListModalElement, syncModalElement, textInputModalElement, confirmModalElement, categoryPickerModalElement, alertModalElement];

modals.forEach(modal => {
    modal.addEventListener('show.bs.modal', () => {
        modal.classList.add('d-flex', 'align-items-center');
    });
    modal.addEventListener('hidden.bs.modal', () => {
        modal.classList.remove('d-flex', 'align-items-center');
    });
});

// ----- Item actions -----
let pendingDeleteName = null;
let pendingPriorityName = null;

function setPriority(priority) {
    if (pendingPriorityName !== null) {
        const target = getActiveList().items.find(i => i.name === pendingPriorityName);
        if (target) {
            target.priority = priority;
            saveLists();
            renderLists();
        }
        pendingPriorityName = null;
    }
    priorityModal.hide();
}

function confirmDeleteItem() {
    if (pendingDeleteName !== null) {
        const active = getActiveList();
        active.items = active.items.filter(i => i.name !== pendingDeleteName);
        active.rightItems = active.rightItems.filter(i => i !== pendingDeleteName);
        saveLists();
        pendingDeleteName = null;
        renderLists();
    }
    deleteItemModal.hide();
}

function uploadItems() {
    const active = getActiveList();
    const cat = active.categories[0] || DEFAULT_CATEGORY;
    const lines = textarea.value.split('\n').map(line => line.trim()).filter(Boolean);
    lines.forEach(line => {
        if (!active.items.some(i => i.name === line)) active.items.push({ name: line, priority: DEFAULT_PRIORITY, category: cat });
    });
    saveLists();
    renderLists();
    uploadModal.hide();
}

function deleteItems() {
    const active = getActiveList();
    active.items = [];
    active.rightItems = [];
    saveLists();
    renderLists();
    deleteModal.hide();
}

addItemBtn.onclick = () => {
    const active = getActiveList();
    const value = newItemInput.value.trim();
    if (value && !active.items.some(i => i.name === value)) {
        const cat = active.categories[0] || DEFAULT_CATEGORY;
        active.items.push({ name: value, priority: DEFAULT_PRIORITY, category: cat });
        saveLists();
        newItemInput.value = '';
        renderLists();
    }
};

// ----- List management (new / rename / delete) -----
let listNameMode = null; // 'new' | 'rename'
let pendingDeleteListName = null;

function openNewListModal() {
    listNameMode = 'new';
    listNameTitle.textContent = 'Nova lista';
    listNameInput.value = '';
    listNameError.classList.add('d-none');
    listNameModal.show();
}

function openRenameListModal() {
    listNameMode = 'rename';
    listNameTitle.textContent = 'Preimenuj listu';
    listNameInput.value = activeListName;
    listNameError.classList.add('d-none');
    listNameModal.show();
}

function saveListName() {
    const name = listNameInput.value.trim();
    if (!name) return;
    const duplicate = lists.some(l => l.name === name && !(listNameMode === 'rename' && l.name === activeListName));
    if (duplicate) {
        listNameError.classList.remove('d-none');
        return;
    }
    if (listNameMode === 'new') {
        lists.push(normalizeList({ name, items: [], rightItems: [] }));
        activeListName = name;
    } else if (listNameMode === 'rename') {
        getActiveList().name = name;
        activeListName = name;
    }
    saveLists();
    renderLists();
    listNameModal.hide();
}

function openDeleteListModal() {
    if (lists.length <= 1) return; // keep at least one list
    pendingDeleteListName = activeListName;
    deleteListNameEl.textContent = activeListName;
    deleteListModal.show();
}

function confirmDeleteList() {
    if (pendingDeleteListName !== null) {
        lists = lists.filter(l => l.name !== pendingDeleteListName);
        if (!lists.some(l => l.name === activeListName)) activeListName = lists[0].name;
        pendingDeleteListName = null;
        saveLists();
        renderLists();
    }
    deleteListModal.hide();
}

// ----- Device sync UI (Firebase, sync-code model) -----
function updateSyncButton(connected) {
    const btn = document.getElementById('sync-btn');
    if (btn) btn.classList.toggle('sync-active', !!connected);
}

function updateSyncUI(st) {
    const disc = document.getElementById('sync-disconnected');
    const conn = document.getElementById('sync-connected');
    const unavail = document.getElementById('sync-unavailable');
    disc.classList.add('d-none');
    conn.classList.add('d-none');
    unavail.classList.add('d-none');

    if (!st || !st.available) {
        unavail.textContent = st && st.reason === 'not_loaded'
            ? 'Sinhronizacija se nije učitala (proveri internet / otvori preko http servera).'
            : 'Sinhronizacija trenutno nije dostupna.';
        unavail.classList.remove('d-none');
        updateSyncButton(false);
        return;
    }
    if (st.connected) {
        document.getElementById('sync-code-display').textContent = st.code;
        conn.classList.remove('d-none');
        updateSyncButton(true);
    } else {
        disc.classList.remove('d-none');
        updateSyncButton(false);
    }
}
// The sync module calls this whenever connection status changes.
window.__onSyncStatus = updateSyncUI;

function currentSyncStatus() {
    return (window.__cloud && window.__cloud.getStatus()) || { available: false };
}

function openSyncModal() {
    document.getElementById('sync-error').classList.add('d-none');
    document.getElementById('sync-code-input').value = '';
    updateSyncUI(currentSyncStatus());
    syncModal.show();
}

async function cloudCreateCode() {
    if (!window.__cloud) return;
    await window.__cloud.createCode();
    updateSyncUI(currentSyncStatus());
}

async function cloudConnect() {
    const input = document.getElementById('sync-code-input');
    const err = document.getElementById('sync-error');
    err.classList.add('d-none');
    if (!window.__cloud) return;
    const res = await window.__cloud.connect(input.value);
    if (res && res.ok) {
        input.value = '';
        updateSyncUI(currentSyncStatus());
    } else {
        err.textContent = res && res.error === 'not_found'
            ? 'Kod ne postoji.'
            : 'Neuspešno povezivanje. Proveri kod i internet.';
        err.classList.remove('d-none');
    }
}

function cloudDisconnect() {
    if (window.__cloud) window.__cloud.disconnect();
    updateSyncUI(currentSyncStatus());
}

function copySyncCode() {
    const code = document.getElementById('sync-code-display').textContent;
    const btn = document.getElementById('copy-code-btn');
    navigator.clipboard.writeText(code).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Kopirano!';
        setTimeout(() => { btn.textContent = original; }, 1500);
    });
}

// ----- Copy / download / restore / misc utilities -----
// Walk a panel's grouped DOM in order, emitting a "[Category]" line before its items.
function extractText(containerId) {
    const container = document.getElementById(containerId);
    const out = [];
    container.querySelectorAll('.cat-header, .item-row').forEach(el => {
        if (el.classList.contains('cat-header')) {
            out.push(`[${el.querySelector('.cat-title').textContent.trim()}]`);
        } else {
            const n = el.querySelector('.item-name');
            if (n) out.push(n.textContent.trim());
        }
    });
    return out.filter(Boolean);
}

function copyList(listId) {
    const text = extractText(listId).join('\n');
    navigator.clipboard.writeText(text).then(() => showPopup());
}

function triggerDownload(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

function sanitizeFilename(name) {
    return name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'lista';
}

// Full-fidelity single-list export (name, categories, items with priority+category,
// rightItems, customOrder) — so a re-import restores everything, not just item names.
function downloadCurrentList() {
    const active = getActiveList();
    triggerDownload(JSON.stringify(active, null, 2), `${sanitizeFilename(active.name)}.json`, 'application/json');
}

function downloadAllLists() {
    triggerDownload(JSON.stringify(lists, null, 2), 'sve_liste_backup.json', 'application/json');
}

function uniqueListName(base) {
    let name = base, i = 2;
    while (lists.some(l => l.name === name)) name = `${base} (${i++})`;
    return name;
}

// Import one or more lists from a JSON file (a single list object, or an array of them),
// ADDING them alongside the current lists (never replacing). Duplicate names get a suffix.
function importList(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            const incoming = Array.isArray(parsed) ? parsed : [parsed];
            const valid = incoming.length > 0 && incoming.every(l => l && typeof l.name === 'string');
            if (!valid) {
                openAlert('Neispravan format fajla za listu.');
            } else {
                let lastName = null;
                incoming.forEach(l => {
                    const norm = normalizeList(l);
                    norm.name = uniqueListName(norm.name);
                    lists.push(norm);
                    lastName = norm.name;
                });
                if (lastName) activeListName = lastName;
                saveLists();
                renderLists();
            }
        } catch (err) {
            openAlert('Neispravan JSON fajl.');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// Restore a full backup — REPLACES all lists (behind a confirmation).
function restoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            const valid = Array.isArray(parsed) && parsed.length > 0
                && parsed.every(l => l && typeof l.name === 'string');
            if (!valid) {
                openAlert('Neispravan format backup fajla.');
            } else {
                openConfirm('Ovo će zameniti SVE postojeće liste. Nastavi?', () => {
                    lists = parsed.map(normalizeList);
                    activeListName = lists[0].name;
                    saveLists();
                    renderLists();
                }, 'Nastavi');
            }
        } catch (err) {
            openAlert('Neispravan JSON fajl.');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function showPopup() {
    const popup = document.getElementById('copy-popup');
    popup.style.display = 'block';
    clearTimeout(popup.timer);
    popup.timer = setTimeout(() => { popup.style.display = 'none'; }, 2000);
}

function hidePopup() {
    document.getElementById('copy-popup').style.display = 'none';
}

function updateLocalStorageInfo() {
    const usedBytes = new Blob(Object.values(localStorage)).size;
    const usedKB = (usedBytes / 1024).toFixed(2);
    localStorageInfo.innerHTML = `<strong>Storage:</strong> ${usedKB} KB / 5 MB`;
}

ensureOrder();
renderLists();
