/**
 * app.js – Kitchen Craft CRM UI layer
 *
 * This file only wires the DOM. All logic lives elsewhere:
 *   utils.js  – pure helpers (tested by tests/utils.test.js)
 *   auth.js   – login/logout (Firebase Auth or local dev fallback)
 *   store.js  – customer data (Firestore live sync or localStorage)
 */

import {
  STATUS_EMOJI, filterCustomers, cycleStatus, formatDelivery, formatDate,
  avatarColor, initials, buildAttenderClass, canDelete, escHtml,
  buildProductTagsHtml, sortByNewest, validateNewPassword
} from './utils.js';
import * as auth from './auth.js';
import * as store from './store.js';

const $ = id => document.getElementById(id);

// ── STATE ─────────────────────────────────────────────────────────────────
let currentUser    = null;
let customers      = [];
let editingId      = null;
let deleteTargetId = null;
let uploadTargetId = null;
let activeFilter   = 'all';
let searchQuery    = '';

const modalOverlay  = $('modalOverlay');
const viewOverlay   = $('viewOverlay');
const deleteOverlay = $('deleteOverlay');
const pwdOverlay    = $('pwdOverlay');

// ── TOAST ─────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── LOGIN / LOGOUT ────────────────────────────────────────────────────────
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('loginBtn');
  const errEl = $('loginError');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    await auth.login($('loginUsername').value, $('loginPassword').value);
    errEl.classList.remove('visible');
  } catch (err) {
    errEl.textContent = '❌ ' + err.message;
    errEl.classList.add('visible');
    $('loginPassword').value = '';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In →';
  }
});

$('eyeBtn').addEventListener('click', () => {
  const inp = $('loginPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

$('btnLogout').addEventListener('click', async () => {
  try { await auth.logout(); }
  catch { showToast('Could not sign out. Check the connection.', 'error'); }
});

function showLogin() {
  $('loginScreen').style.display = 'flex';
  $('appContent').style.display = 'none';
  $('loginForm').reset();
  $('loginError').classList.remove('visible');
}

function showApp() {
  $('loginScreen').style.display = 'none';
  $('appContent').style.display = 'block';
  $('loggedAvatar').style.background = currentUser.color;
  $('loggedAvatar').textContent = currentUser.initials;
  $('loggedUserName').textContent = currentUser.name;
  $('loggedUserRole').textContent =
    currentUser.role === 'partner' ? '🤝 Partner · Full Access' : '🏪 Store Staff · Limited';
  render();
}

function updateSyncBadge(mode) {
  const b = $('syncBadge');
  if (!b) return;
  if (mode === 'cloud') {
    b.textContent = '☁ Live sync';
    b.className = 'sync-badge cloud';
    b.title = 'Connected to Firebase — every device sees the same data.';
  } else {
    b.textContent = '💾 This device only';
    b.className = 'sync-badge local';
    b.title = 'Firebase is not configured yet — data is saved only in this browser.';
  }
}

/** Fires on login, logout, and session restore. */
async function handleUserChange(user) {
  currentUser = user;
  if (!user) {
    store.stopStore();
    showLogin();
    return;
  }
  showApp();
  const mode = await store.startStore(
    list => { customers = list; render(); },
    () => showToast('Cloud sync error — retrying automatically…', 'error')
  );
  updateSyncBadge(mode);
}

// ── RENDER ────────────────────────────────────────────────────────────────
function updateStats() {
  $('totalCount').textContent     = customers.length;
  $('hotCount').textContent       = customers.filter(c => c.status === 'Hot').length;
  $('warmCount').textContent      = customers.filter(c => c.status === 'Warm').length;
  $('convertedCount').textContent = customers.filter(c => c.status === 'Converted').length;
}

function render() {
  updateStats();
  const list = filterCustomers(sortByNewest(customers), activeFilter, searchQuery);
  const tw = $('tableWrapper');
  const es = $('emptyState');
  const tb = $('tableBody');

  if (list.length === 0) {
    tw.style.display = 'none';
    es.style.display = 'block';
    es.querySelector('h2').textContent =
      customers.length > 0 ? 'No results found' : 'No customers yet';
    es.querySelector('p').innerHTML = customers.length > 0
      ? 'Try adjusting your filter or search query.'
      : 'Start by adding your first walk-in customer using the <strong>+ Add Walk-in</strong> button.';
    return;
  }
  tw.style.display = 'block';
  es.style.display = 'none';
  tb.innerHTML = '';

  const isAdmin = canDelete(currentUser);

  list.forEach((c, idx) => {
    const delInfo = formatDelivery(c.delivery);
    const sEmoji = STATUS_EMOJI[c.status] || '';
    const sBadge = 'badge-' + String(c.status || '').replace(/\s+/g, '-');
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', c.id);
    tr.innerHTML = `
      <td><div class="row-num">${idx + 1}</div></td>
      <td>
        <div class="cust-cell">
          <div class="cust-avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
          <div>
            <div class="cust-name">${escHtml(c.name)}</div>
            ${c.notes ? `<div style="font-size:0.7rem;color:var(--text-muted);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(c.notes)}">${escHtml(c.notes)}</div>` : ''}
          </div>
        </div>
      </td>
      <td><a href="tel:${escHtml(c.phone)}" class="phone-link">📞 ${escHtml(c.phone)}</a></td>
      <td><span class="attender-badge ${buildAttenderClass(c.attender)}">${escHtml(c.attender)}</span></td>
      <td><div class="products-list">${buildProductTagsHtml(c.products)}</div></td>
      <td>${c.price ? `<span class="price-val">₹${Number(c.price).toLocaleString('en-IN')}</span>` : '<span class="price-empty">—</span>'}</td>
      <td><span class="delivery-date ${delInfo.cls}">${delInfo.text}</span></td>
      <td><span class="status-badge ${sBadge}" data-action="cycle" data-id="${c.id}" title="Click to cycle status">${sEmoji} ${escHtml(c.status)}</span></td>
      <td><span class="date-added">${formatDate(c.dateAdded)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="action-btn view" data-action="view" data-id="${c.id}" title="View">👁</button>
          <button class="action-btn edit" data-action="edit" data-id="${c.id}" title="Edit">✏️</button>
          ${isAdmin ? `<button class="action-btn del" data-action="del" data-id="${c.id}" title="Delete">🗑</button>` : ''}
        </div>
      </td>`;
    tb.appendChild(tr);
  });
}

// ── ADD/EDIT MODAL ────────────────────────────────────────────────────────
function openModal(mode = 'add', id = null) {
  editingId = id;
  $('customerForm').reset();
  document.querySelectorAll('input[name=product]').forEach(cb => (cb.checked = false));
  $('customProduct').value = '';

  if (mode === 'edit' && id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    $('modalTitle').textContent = 'Edit Customer';
    $('custName').value     = c.name;
    $('custPhone').value    = c.phone;
    $('custAttender').value = c.attender;
    $('custStatus').value   = c.status;
    $('custPrice').value    = c.price || '';
    $('custDelivery').value = c.delivery || '';
    $('custNotes').value    = c.notes || '';
    const boxes = [...document.querySelectorAll('input[name=product]')];
    const leftovers = [];
    (c.products || []).forEach(p => {
      const cb = boxes.find(b => b.value === p);
      if (cb) cb.checked = true;
      else leftovers.push(p); // custom products, whatever they're named
    });
    $('customProduct').value = leftovers.join(', ');
  } else {
    $('modalTitle').textContent = 'New Walk-in Customer';
    if (currentUser?.attender) $('custAttender').value = currentUser.attender;
  }
  modalOverlay.classList.add('open');
  setTimeout(() => $('custName').focus(), 280);
}
function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

/**
 * Waits for a save, but only up to `ms` — with Firestore offline
 * persistence the write is already queued locally, so a slow/absent
 * network shouldn't hold the modal hostage.
 * Resolves to 'ok', 'timeout', or the Error.
 */
function awaitSave(promise, ms = 4000) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve('timeout'), ms);
    promise.then(
      () => { clearTimeout(t); resolve('ok'); },
      err => { clearTimeout(t); resolve(err); }
    );
  });
}

let savingCustomer = false;
$('customerForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (savingCustomer) return; // guards against double-click double-saves
  const checked = [...document.querySelectorAll('input[name=product]:checked')].map(cb => cb.value);
  $('customProduct').value.split(',').map(s => s.trim()).filter(Boolean)
    .forEach(p => checked.push(p));
  if (!checked.length) { showToast('Please select at least one product.', 'error'); return; }

  const existing = editingId ? customers.find(x => x.id === editingId) : null;
  const entry = {
    id:       editingId || Date.now().toString(),
    name:     $('custName').value.trim(),
    phone:    $('custPhone').value.trim(),
    attender: $('custAttender').value,
    status:   $('custStatus').value,
    products: checked,
    price:    $('custPrice').value || '',
    delivery: $('custDelivery').value || '',
    notes:    $('custNotes').value.trim(),
    dateAdded: existing?.dateAdded || new Date().toISOString(),
    addedBy:   existing?.addedBy || currentUser?.name || ''
  };
  if (existing?.invoice) entry.invoice = existing.invoice; // don't lose the attachment on edit

  savingCustomer = true;
  const btn = $('custSave');
  const btnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Saving…';
  const result = await awaitSave(store.saveCustomer(entry));
  savingCustomer = false;
  btn.disabled = false;
  btn.innerHTML = btnHtml;

  if (result === 'ok') {
    showToast(existing ? 'Customer updated!' : 'Walk-in added!', 'success');
    closeModal();
  } else if (result === 'timeout') {
    showToast('Saved on this device — will sync when the connection returns.', 'info');
    closeModal();
  } else {
    showToast(result.message, 'error'); // keep the modal open so nothing typed is lost
  }
});

// ── TABLE ACTIONS ─────────────────────────────────────────────────────────
$('tableBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'view') openViewModal(id);
  if (action === 'edit') openModal('edit', id);
  if (action === 'del') {
    if (!canDelete(currentUser)) { showToast('Only partners can delete records.', 'error'); return; }
    deleteTargetId = id;
    deleteOverlay.classList.add('open');
  }
  if (action === 'cycle') {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    const next = cycleStatus(c.status);
    store.updateCustomer(id, { status: next })
      .then(() => showToast(`Status → ${next}`, 'info'))
      .catch(err => showToast(err.message, 'error'));
  }
});

// ── DELETE MODAL ──────────────────────────────────────────────────────────
$('deleteConfirmBtn').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    await store.deleteCustomer(deleteTargetId);
    showToast('Customer deleted.', 'error');
  } catch (err) {
    showToast(err.message, 'error');
  }
  deleteOverlay.classList.remove('open');
  deleteTargetId = null;
});
$('deleteCancelBtn').addEventListener('click', () => {
  deleteOverlay.classList.remove('open');
  deleteTargetId = null;
});

// ── VIEW MODAL ────────────────────────────────────────────────────────────
function buildInvoiceAttachment(c) {
  if (!c.invoice) return '';
  const inv = c.invoice;
  const isPDF = inv.type === 'application/pdf';
  const sizeKB = (inv.size / 1024).toFixed(1);
  const href = inv.url || inv.data || '#';
  return `
    <div class="invoice-attachment">
      <div class="inv-att-icon">${isPDF ? '📄' : '🖼'}</div>
      <div class="inv-att-info">
        <div class="inv-att-name">${escHtml(inv.name)}</div>
        <div class="inv-att-meta">${isPDF ? 'PDF' : 'JPEG'} &nbsp;&bull;&nbsp; ${sizeKB} KB &nbsp;&bull;&nbsp; Uploaded ${formatDate(inv.uploadedAt)}
          ${inv.uploadedBy ? ` by ${escHtml(inv.uploadedBy)}` : ''}
        </div>
      </div>
      <div class="inv-att-actions">
        <a class="inv-att-btn view-btn" href="${escHtml(href)}" target="_blank" rel="noopener" title="View">👁 View</a>
        <a class="inv-att-btn download-btn" href="${escHtml(href)}" download="${escHtml(inv.name)}" title="Download">⬇ Save</a>
        <button class="inv-att-btn remove-btn" data-action="remove-invoice" data-id="${c.id}" title="Remove">🗑 Remove</button>
      </div>
    </div>`;
}

function openViewModal(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  const d = formatDelivery(c.delivery);
  const sEmoji = STATUS_EMOJI[c.status] || '';
  const waText = encodeURIComponent(
    `Hi ${c.name}, thank you for visiting Kitchen Craft! We are happy to assist you further.`
  );
  $('viewBody').innerHTML = `
    <div class="view-section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div class="cust-avatar" style="background:${avatarColor(c.name)};width:50px;height:50px;border-radius:13px;font-size:1.1rem;display:flex;align-items:center;justify-content:center;font-weight:700">${initials(c.name)}</div>
        <div><div style="font-size:1.1rem;font-weight:700">${escHtml(c.name)}</div>
          <a href="tel:${escHtml(c.phone)}" class="phone-link">📞 ${escHtml(c.phone)}</a></div>
      </div>
      <div class="view-row"><span class="view-key">Attender</span><span class="view-val">${escHtml(c.attender)}</span></div>
      <div class="view-row"><span class="view-key">Status</span><span class="view-val">${sEmoji} ${escHtml(c.status)}</span></div>
      <div class="view-row"><span class="view-key">Date Added</span><span class="view-val">${formatDate(c.dateAdded)}</span></div>
      ${c.addedBy ? `<div class="view-row"><span class="view-key">Entered By</span><span class="view-val">${escHtml(c.addedBy)}</span></div>` : ''}
    </div>
    <div class="view-section"><h3>💡 Products Seen</h3>
      <div class="products-list" style="max-width:100%">${buildProductTagsHtml(c.products)}</div></div>
    <div class="view-section"><h3>💰 Quote & Delivery</h3>
      <div class="view-row"><span class="view-key">Price Quoted</span>
        <span class="view-val" style="color:var(--green);font-weight:700">${c.price ? '₹' + Number(c.price).toLocaleString('en-IN') : '—'}</span></div>
      <div class="view-row"><span class="view-key">Expected Delivery</span>
        <span class="view-val ${d.cls}">${d.text || '—'}</span></div></div>
    ${c.notes ? `<div class="view-section"><h3>📝 Remarks</h3>
      <p style="font-size:0.86rem;line-height:1.7;color:var(--text-muted)">${escHtml(c.notes)}</p></div>` : ''}
    <div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap">
      <button class="btn-save" style="flex:1;justify-content:center;min-width:110px"
        data-action="edit-from-view" data-id="${c.id}">✏️ Edit</button>
      <a href="https://wa.me/91${escHtml(c.phone)}?text=${waText}"
        target="_blank" rel="noopener"
        style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;
          border-radius:10px;background:linear-gradient(135deg,#25D366,#128C7E);
          color:white;font-weight:600;font-size:0.86rem;text-decoration:none;
          box-shadow:0 4px 14px rgba(37,211,102,0.3)">💬 WhatsApp</a>
      ${c.status === 'Converted' ? `<button class="btn-invoice" data-action="upload-invoice" data-id="${c.id}">📂 Upload Invoice</button>` : ''}
    </div>
    ${c.status === 'Converted' ? buildInvoiceAttachment(c) : ''}
  `;
  viewOverlay.classList.add('open');
}
function closeViewModal() { viewOverlay.classList.remove('open'); }

$('viewBody').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'edit-from-view') {
    closeViewModal();
    openModal('edit', id);
  }
  if (action === 'upload-invoice') {
    uploadTargetId = id;
    const input = $('invoiceFileInput');
    input.value = ''; // reset so the same file can be re-uploaded
    input.click();
  }
  if (action === 'remove-invoice') {
    try {
      await store.removeInvoice(id);
      showToast('Invoice removed.', 'info');
      openViewModal(id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
});

// ── INVOICE FILE UPLOAD ───────────────────────────────────────────────────
$('invoiceFileInput').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file || !uploadTargetId) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large. Max 5MB allowed.', 'error');
    return;
  }
  if (!['application/pdf', 'image/jpeg'].includes(file.type)) {
    showToast('Only PDF or JPEG files are allowed.', 'error');
    return;
  }
  showToast('Uploading invoice…', 'info');
  try {
    await store.attachInvoice(uploadTargetId, file, currentUser?.name || '');
    showToast('Invoice uploaded successfully!', 'success');
    openViewModal(uploadTargetId);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────
function closePwdModal() {
  pwdOverlay.classList.remove('open');
  $('pwdForm').reset();
}

$('btnChangePwd').addEventListener('click', () => {
  if (!auth.canChangePassword()) {
    showToast('Password change works only after Firebase cloud sync is set up.', 'info');
    return;
  }
  $('pwdForm').reset();
  pwdOverlay.classList.add('open');
  setTimeout(() => $('pwdCurrent').focus(), 280);
});

$('pwdForm').addEventListener('submit', async e => {
  e.preventDefault();
  const validationError = validateNewPassword($('pwdNew').value, $('pwdConfirm').value);
  if (validationError) { showToast(validationError, 'error'); return; }

  const btn = $('pwdSave');
  btn.disabled = true;
  btn.textContent = 'Updating…';
  try {
    await auth.changePassword($('pwdCurrent').value, $('pwdNew').value);
    closePwdModal();
    showToast('Password updated! Use the new password from your next sign-in.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔑 Update Password';
  }
});

$('pwdClose').addEventListener('click', closePwdModal);
$('pwdCancel').addEventListener('click', closePwdModal);
pwdOverlay.addEventListener('click', e => { if (e.target === pwdOverlay) closePwdModal(); });

// ── TABS & SEARCH ─────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    render();
  });
});

$('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  render();
});

// ── MISC EVENTS ───────────────────────────────────────────────────────────
$('btnOpenModal').addEventListener('click', () => openModal('add'));
$('modalClose').addEventListener('click', closeModal);
$('btnCancel').addEventListener('click', closeModal);
$('viewClose').addEventListener('click', closeViewModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) closeViewModal(); });
deleteOverlay.addEventListener('click', e => {
  if (e.target === deleteOverlay) { deleteOverlay.classList.remove('open'); deleteTargetId = null; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal(); closeViewModal(); closePwdModal();
    deleteOverlay.classList.remove('open');
  }
});
$('custPhone').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
});

// ── INIT ──────────────────────────────────────────────────────────────────
auth.initAuth(handleUserChange).catch(err => {
  console.error('Auth init failed:', err);
  showToast('Could not start the app. Check the internet connection and reload.', 'error');
});
