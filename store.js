/**
 * store.js – Kitchen Craft CRM data layer
 *
 * Cloud mode (Firebase configured): customers live in the Firestore
 *   `customers` collection with a real-time listener, so every device
 *   sees the same data instantly. Invoices go to Firebase Storage.
 *
 * Local mode (Firebase not configured yet): customers live in
 *   localStorage on this device only, exactly like the original app.
 *   The first time cloud mode starts, existing local data is migrated
 *   up to Firestore automatically (if the collection is still empty).
 */

import { getFirebase } from './firebase-init.js';
import { sortByNewest } from './utils.js';

const STORE_KEY = 'kitchencraft_crm_v3';
const MIGRATED_BACKUP_KEY = STORE_KEY + '_backup_after_migration';
const LOCAL_INVOICE_MAX_BYTES = 500 * 1024; // localStorage is tiny; real files need Storage

let fb = null;
let mode = 'local';
let customers = [];
let notify = () => {};
let unsubscribe = null;

export function storeMode() { return mode; }
export function getCustomers() { return customers; }

// ── LOCAL PERSISTENCE ────────────────────────────────────────────────────────
function loadLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    // Corrupt data: keep a copy for recovery instead of crashing the app.
    try { localStorage.setItem(STORE_KEY + '_corrupt', localStorage.getItem(STORE_KEY)); } catch { /* ignore */ }
    localStorage.removeItem(STORE_KEY);
    return [];
  }
}

function persistLocal() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(customers));
  } catch {
    throw new Error(
      'This browser’s storage is full — the change could not be saved. ' +
      'Remove some uploaded invoices, or finish the Firebase setup to move data to the cloud.'
    );
  }
}

// ── START / STOP ─────────────────────────────────────────────────────────────
/**
 * Starts the data layer and begins delivering customer lists to
 * `onChange(customers)`. In cloud mode call this AFTER login (security
 * rules require an authenticated user). Returns 'cloud' or 'local'.
 */
export async function startStore(onChange, onError) {
  notify = onChange;
  fb = await getFirebase();

  if (!fb) {
    mode = 'local';
    customers = sortByNewest(loadLocal());
    notify(customers);
    return mode;
  }

  mode = 'cloud';
  if (unsubscribe) return mode; // already listening (e.g. re-login)

  try {
    await migrateLocalToCloud();
  } catch (err) {
    console.warn('Local→cloud migration skipped:', err);
  }

  const { collection, query, orderBy, onSnapshot } = fb.fs;
  unsubscribe = onSnapshot(
    query(collection(fb.db, 'customers'), orderBy('dateAdded', 'desc')),
    snap => {
      customers = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      notify(customers);
    },
    err => {
      console.error('Firestore listener error:', err);
      onError?.(err);
    }
  );
  return mode;
}

/** Stops listening (on logout in cloud mode). */
export function stopStore() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  customers = [];
}

// ── ONE-TIME MIGRATION ───────────────────────────────────────────────────────
async function migrateLocalToCloud() {
  const local = loadLocal();
  if (!local.length) return;

  const { collection, getDocs, query, limit, doc, setDoc } = fb.fs;
  const probe = await getDocs(query(collection(fb.db, 'customers'), limit(1)));
  if (!probe.empty) return; // cloud already has data — don't double-import

  for (const c of local) {
    const { id, ...data } = c;
    if (!data.dateAdded) data.dateAdded = new Date().toISOString();
    await setDoc(doc(fb.db, 'customers', String(id || Date.now())), data);
  }
  // Keep a safety copy in this browser, then clear the live local store.
  localStorage.setItem(MIGRATED_BACKUP_KEY, JSON.stringify(local));
  localStorage.removeItem(STORE_KEY);
}

// ── MUTATIONS ────────────────────────────────────────────────────────────────
/** Adds or fully replaces a customer (entry.id is the document id). */
export async function saveCustomer(entry) {
  if (mode === 'cloud') {
    const { doc, setDoc } = fb.fs;
    const { id, ...data } = entry;
    await setDoc(doc(fb.db, 'customers', String(id)), data);
    return;
  }
  const idx = customers.findIndex(c => c.id === entry.id);
  const before = customers;
  customers = idx === -1
    ? [entry, ...customers]
    : customers.map(c => (c.id === entry.id ? entry : c));
  try { persistLocal(); } catch (err) { customers = before; throw err; }
  notify(customers);
}

/** Patches specific fields on a customer (e.g. status cycling). */
export async function updateCustomer(id, patch) {
  if (mode === 'cloud') {
    const { doc, updateDoc } = fb.fs;
    await updateDoc(doc(fb.db, 'customers', String(id)), patch);
    return;
  }
  const before = customers;
  customers = customers.map(c => (c.id === id ? { ...c, ...patch } : c));
  try { persistLocal(); } catch (err) { customers = before; throw err; }
  notify(customers);
}

/** Deletes a customer (and, in cloud mode, its invoice file if any). */
export async function deleteCustomer(id) {
  if (mode === 'cloud') {
    const target = customers.find(c => c.id === id);
    const { doc, deleteDoc } = fb.fs;
    await deleteDoc(doc(fb.db, 'customers', String(id)));
    if (target?.invoice?.path) {
      try { await fb.st.deleteObject(fb.st.ref(fb.storage, target.invoice.path)); }
      catch { /* file already gone — not fatal */ }
    }
    return;
  }
  const before = customers;
  customers = customers.filter(c => c.id !== id);
  try { persistLocal(); } catch (err) { customers = before; throw err; }
  notify(customers);
}

// ── INVOICES ─────────────────────────────────────────────────────────────────
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
}

/**
 * Attaches an invoice file to a customer.
 * Cloud mode: uploads to Firebase Storage, stores {url, path, …} on the doc.
 * Local mode: stores a small base64 copy in localStorage (500 KB cap).
 */
export async function attachInvoice(id, file, uploadedBy) {
  const meta = {
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: uploadedBy || ''
  };

  if (mode === 'cloud') {
    const prev = customers.find(c => c.id === id)?.invoice;
    const path = `invoices/${id}/${Date.now()}_${file.name}`;
    const fileRef = fb.st.ref(fb.storage, path);
    await fb.st.uploadBytes(fileRef, file, { contentType: file.type });
    const url = await fb.st.getDownloadURL(fileRef);
    const { doc, updateDoc } = fb.fs;
    await updateDoc(doc(fb.db, 'customers', String(id)), {
      invoice: { ...meta, url, path }
    });
    if (prev?.path && prev.path !== path) {
      try { await fb.st.deleteObject(fb.st.ref(fb.storage, prev.path)); }
      catch { /* old file already gone — not fatal */ }
    }
    return;
  }

  if (file.size > LOCAL_INVOICE_MAX_BYTES) {
    throw new Error(
      'Until cloud sync is set up, invoices are limited to 500 KB on this device. ' +
      'Finish the Firebase setup to upload full-size PDFs.'
    );
  }
  const data = await readAsDataURL(file);
  await updateCustomer(id, { invoice: { ...meta, data } });
}

/** Removes a customer's invoice (and its Storage file in cloud mode). */
export async function removeInvoice(id) {
  if (mode === 'cloud') {
    const prev = customers.find(c => c.id === id)?.invoice;
    const { doc, updateDoc, deleteField } = fb.fs;
    await updateDoc(doc(fb.db, 'customers', String(id)), { invoice: deleteField() });
    if (prev?.path) {
      try { await fb.st.deleteObject(fb.st.ref(fb.storage, prev.path)); }
      catch { /* already gone */ }
    }
    return;
  }
  const before = customers;
  customers = customers.map(c => {
    if (c.id !== id) return c;
    const { invoice, ...rest } = c;
    return rest;
  });
  try { persistLocal(); } catch (err) { customers = before; throw err; }
  notify(customers);
}
