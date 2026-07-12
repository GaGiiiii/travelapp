// Firebase device sync (sync-code model). Loaded as an ES module.
// It exposes window.__cloud and talks back to the app via the window.__* bridge
// defined in js/state.js and js/app.js. Replace firebaseConfig with your own project's.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, serverTimestamp }
    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== 1. PASTE YOUR FIREBASE CONFIG HERE =====
const firebaseConfig = {
    apiKey: "AIzaSyBpzQJgA0la8m9J7ixUDGf43OxnRCogI9g",
    authDomain: "travelapp-8b457.firebaseapp.com",
    projectId: "travelapp-8b457",
    storageBucket: "travelapp-8b457.firebasestorage.app",
    messagingSenderId: "635667620374",
    appId: "1:635667620374:web:aa2027d4d1ae131a554b37",
    measurementId: "G-TTKJG9HDLX"
};
// ==============================================

const configured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

let db = null;
let unsub = null;
let currentCode = null;
let pushTimer = null;

function status() {
    return { available: configured, connected: !!currentCode, code: currentCode };
}
function notify() {
    if (window.__onSyncStatus) window.__onSyncStatus(status());
}

function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars (0/O, 1/I)
    const arr = new Uint32Array(8);
    crypto.getRandomValues(arr);
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[arr[i] % chars.length];
    return code;
}

function subscribe(code) {
    if (unsub) unsub();
    unsub = onSnapshot(doc(db, 'syncs', code), snap => {
        if (snap.metadata.hasPendingWrites) return; // ignore our own local write echo
        const data = snap.data();
        if (data && Array.isArray(data.lists) && window.__applyRemoteLists) {
            window.__applyRemoteLists(data.lists);
        }
    }, err => console.error('Sync listener error:', err));
    currentCode = code;
    localStorage.setItem('syncCode', code);
    notify();
}

window.__cloud = {
    getStatus: status,
    async createCode() {
        if (!configured) return null;
        const code = randomCode();
        const lists = (window.__getLocalLists && window.__getLocalLists()) || [];
        await setDoc(doc(db, 'syncs', code), { lists, updatedAt: serverTimestamp() });
        subscribe(code);
        return code;
    },
    async connect(codeRaw) {
        if (!configured) return { ok: false, error: 'not_configured' };
        const code = (codeRaw || '').trim().toUpperCase();
        if (!code) return { ok: false, error: 'empty' };
        try {
            const ref = doc(db, 'syncs', code);
            const snap = await getDoc(ref);
            if (!snap.exists()) return { ok: false, error: 'not_found' };
            subscribe(code);
            const data = snap.data();
            if (data && Array.isArray(data.lists) && window.__applyRemoteLists) {
                window.__applyRemoteLists(data.lists);
            }
            return { ok: true };
        } catch (e) {
            console.error('Sync connect error:', e);
            return { ok: false, error: 'network' };
        }
    },
    disconnect() {
        if (unsub) { unsub(); unsub = null; }
        currentCode = null;
        localStorage.removeItem('syncCode');
        notify();
    },
    push(lists) {
        if (!configured || !currentCode) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
            setDoc(doc(db, 'syncs', currentCode), { lists, updatedAt: serverTimestamp() })
                .catch(e => console.error('Sync push error:', e));
        }, 500);
    }
};

if (configured) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    const saved = localStorage.getItem('syncCode');
    if (saved) subscribe(saved);
}
notify();
