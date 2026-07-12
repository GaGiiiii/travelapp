// UI layer: DOM wiring, rendering, and all user actions.
// Depends on js/state.js (lists, activeListName, sortMode, getActiveList, getDisplayItems, saveLists, ...).

// ----- DOM references & modal instances -----
const uploadModalElement = document.getElementById('uploadModal');
const deleteModalElement = document.getElementById('deleteModal');
const deleteItemModalElement = document.getElementById('deleteItemModal');
const priorityModalElement = document.getElementById('priorityModal');
const listNameModalElement = document.getElementById('listNameModal');
const deleteListModalElement = document.getElementById('deleteListModal');
const syncModalElement = document.getElementById('syncModal');
const syncModal = new bootstrap.Modal(syncModalElement);
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
sortSelect.value = sortMode;
sortSelect.onchange = () => {
    sortMode = sortSelect.value;
    localStorage.setItem('sortMode', sortMode);
    renderLists();
};

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
    saveLists();
    renderLists();
}

function priorityBadgeClass(priority) {
    if (priority === 'P1') return 'bg-danger';
    if (priority === 'P2') return 'bg-warning text-dark';
    return 'bg-secondary';
}

let sortableInstance = null;

function renderLists() {
    renderTabs();
    const active = getActiveList();
    activeListNameEl.textContent = active.name;
    const isCustom = sortMode === 'custom';

    leftList.innerHTML = '';
    rightList.innerHTML = '';
    allItemsList.innerHTML = '';

    getDisplayItems().forEach(item => {
        // PONESI (left) — tap to mark an item as returned home.
        const leftLi = document.createElement('li');
        leftLi.textContent = item.name;
        leftLi.className = 'list-group-item';
        if (active.rightItems.includes(item.name)) leftLi.classList.add('text-decoration-line-through', 'text-muted');
        leftLi.onclick = () => {
            if (!active.rightItems.includes(item.name)) {
                active.rightItems.push(item.name);
                saveLists();
                renderLists();
            }
        };
        leftList.appendChild(leftLi);

        // VRATI KUĆI (right) — items marked as returned; tap or X to unmark.
        if (active.rightItems.includes(item.name)) {
            const rightLi = document.createElement('li');
            rightLi.className = 'list-group-item d-flex justify-content-between align-items-center';
            const span = document.createElement('span');
            span.textContent = item.name;
            span.onclick = () => {
                active.rightItems = active.rightItems.filter(i => i !== item.name);
                saveLists();
                renderLists();
            };
            const removeBtn = document.createElement('span');
            removeBtn.className = 'badge bg-danger rounded-pill';
            removeBtn.textContent = 'X';
            removeBtn.onclick = () => {
                active.rightItems = active.rightItems.filter(i => i !== item.name);
                saveLists();
                renderLists();
            };
            rightLi.append(span, removeBtn);
            rightList.appendChild(rightLi);
        }

        // LISTA STVARI (all items) — priority badge, delete, and (in custom mode) a drag handle.
        const allLi = document.createElement('li');
        allLi.className = 'list-group-item d-flex justify-content-between align-items-center text-start';
        allLi.dataset.name = item.name;

        const left = document.createElement('span');
        left.className = 'd-flex align-items-center';
        if (isCustom) {
            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
            left.appendChild(handle);
        }
        const itemText = document.createElement('span');
        itemText.textContent = item.name;
        left.appendChild(itemText);

        const controls = document.createElement('span');
        controls.className = 'd-flex align-items-center gap-2';

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

        controls.append(priorityBadge, delBtn);
        allLi.append(left, controls);
        allItemsList.appendChild(allLi);
    });

    // Enable drag-and-drop reordering only in custom mode.
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    if (isCustom && window.Sortable) {
        sortableInstance = window.Sortable.create(allItemsList, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: () => {
                const active = getActiveList();
                active.customOrder = Array.from(allItemsList.children).map(li => li.dataset.name);
                saveLists();
                // defer so Sortable can finish its own event before we re-render/destroy it
                setTimeout(renderLists, 0);
            }
        });
    }

    updateLocalStorageInfo();
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

const modals = [uploadModalElement, deleteModalElement, deleteItemModalElement, priorityModalElement, listNameModalElement, deleteListModalElement, syncModalElement];

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
    const lines = textarea.value.split('\n').map(line => line.trim()).filter(Boolean);
    lines.forEach(line => {
        if (!active.items.some(i => i.name === line)) active.items.push({ name: line, priority: DEFAULT_PRIORITY });
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
        active.items.push({ name: value, priority: DEFAULT_PRIORITY });
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
        lists.push({ name, items: [], rightItems: [] });
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
function extractText(listId) {
    const list = document.getElementById(listId);
    return Array.from(list.children).map(li => li.firstChild.textContent.trim()).filter(Boolean);
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

function downloadCurrentList() {
    const active = getActiveList();
    const text = active.items.map(i => i.name).join('\n');
    triggerDownload(text, `${sanitizeFilename(active.name)}.txt`, 'text/plain');
}

function downloadAllLists() {
    triggerDownload(JSON.stringify(lists, null, 2), 'sve_liste_backup.json', 'application/json');
}

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
                alert('Neispravan format backup fajla.');
            } else {
                lists = parsed.map(normalizeList);
                activeListName = lists[0].name;
                saveLists();
                renderLists();
            }
        } catch (err) {
            alert('Neispravan JSON fajl.');
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

renderLists();
