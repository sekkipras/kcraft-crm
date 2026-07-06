/* Kitchen Craft CRM – App Logic */

// ── USER ACCOUNTS ──────────────────────────────────────────────────────────
const USER_ACCOUNTS = [
  { id:'vishnu', name:'Vishnu Prakash', username:'vishnuprakash', password:'vishnu@123',
    role:'partner', attender:'VishnuPrakash', initials:'VP',
    color:'linear-gradient(135deg,#845EC2,#C3A8F0)' },
  { id:'ram', name:'Ramkumar', username:'ramkumar', password:'ram@123',
    role:'partner', attender:'Ramkumar', initials:'RK',
    color:'linear-gradient(135deg,#1D6FA4,#5BC0EB)' },
  { id:'store', name:'Store Incharge', username:'store', password:'store@123',
    role:'store', attender:null, initials:'SI',
    color:'linear-gradient(135deg,#06D6A0,#0aaa7f)' }
];

// ── STATE ─────────────────────────────────────────────────────────────────
const STORE_KEY = 'kitchencraft_crm_v3';
let customers    = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
let currentUser  = null;
let editingId    = null;
let deleteTargetId = null;
let activeFilter = 'all';
let searchQuery  = '';

// ── LOGIN ─────────────────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const uname = document.getElementById('loginUsername').value.trim().toLowerCase();
  const pwd   = document.getElementById('loginPassword').value;
  const user  = USER_ACCOUNTS.find(u => u.username === uname && u.password === pwd);
  const errEl = document.getElementById('loginError');

  if (!user) {
    errEl.textContent = '❌ Invalid username or password. Please try again.';
    errEl.classList.add('visible');
    document.getElementById('loginPassword').value = '';
    return;
  }
  errEl.classList.remove('visible');
  currentUser = user;
  sessionStorage.setItem('kc_session', JSON.stringify(user));
  showApp();
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('kc_session');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContent').style.display  = 'none';
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').classList.remove('visible');
}

function togglePwd() {
  const inp = document.getElementById('loginPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContent').style.display  = 'block';
  // Header user chip
  const chip = document.getElementById('loggedUserChip');
  document.getElementById('loggedAvatar').style.background = currentUser.color;
  document.getElementById('loggedAvatar').textContent = currentUser.initials;
  document.getElementById('loggedUserName').textContent = currentUser.name;
  document.getElementById('loggedUserRole').textContent  =
    currentUser.role === 'partner' ? '🤝 Partner · Full Access' : '🏪 Store Staff · Limited';
  // Auto-set attender for promoters
  if (currentUser.attender) {
    document.getElementById('custAttender').value = currentUser.attender;
  }
  render();
}

// ── SAVE / LOAD ────────────────────────────────────────────────────────────
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(customers)); }

// ── FILTER ─────────────────────────────────────────────────────────────────
function filteredCustomers() {
  return customers.filter(c => {
    const matchFilter = activeFilter === 'all' || c.status === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    return matchFilter && matchSearch;
  });
}

// ── STATS ──────────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('totalCount').textContent     = customers.length;
  document.getElementById('hotCount').textContent       = customers.filter(c=>c.status==='Hot').length;
  document.getElementById('warmCount').textContent      = customers.filter(c=>c.status==='Warm').length;
  document.getElementById('convertedCount').textContent = customers.filter(c=>c.status==='Converted').length;
}

// ── RENDER ─────────────────────────────────────────────────────────────────
function render() {
  updateStats();
  const list = filteredCustomers();
  const tw   = document.getElementById('tableWrapper');
  const es   = document.getElementById('emptyState');
  const tb   = document.getElementById('tableBody');

  if (list.length === 0) {
    tw.style.display = 'none'; es.style.display = 'block';
    es.querySelector('h2').textContent = customers.length > 0 ? 'No results found' : 'No customers yet';
    es.querySelector('p').innerHTML = customers.length > 0
      ? 'Try adjusting your filter or search query.'
      : 'Start by adding your first walk-in customer using the <strong>+ Add Walk-in</strong> button.';
    return;
  }
  tw.style.display = 'block'; es.style.display = 'none';
  tb.innerHTML = '';

  const isAdmin = currentUser && currentUser.role === 'partner';

  list.forEach((c, idx) => {
    const delInfo = formatDelivery(c.delivery);
    const sEmoji  = {Hot:'🔥',Warm:'🌤',Cold:'❄️',Converted:'✅','Not Interested':'🚫'}[c.status]||'';
    const sBadge  = 'badge-' + c.status.replace(/\s+/g,'-');
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', c.id);
    tr.innerHTML = `
      <td><div class="row-num">${idx+1}</div></td>
      <td>
        <div class="cust-cell">
          <div class="cust-avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
          <div>
            <div class="cust-name">${esc(c.name)}</div>
            ${c.notes?`<div style="font-size:0.7rem;color:var(--text-muted);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(c.notes)}">${esc(c.notes)}</div>`:''}
          </div>
        </div>
      </td>
      <td><a href="tel:${esc(c.phone)}" class="phone-link">📞 ${esc(c.phone)}</a></td>
      <td><span class="attender-badge ${attClass(c.attender)}">${esc(c.attender)}</span></td>
      <td><div class="products-list">${buildProductTags(c.products)}</div></td>
      <td>${c.price?`<span class="price-val">₹${Number(c.price).toLocaleString('en-IN')}</span>`:'<span class="price-empty">—</span>'}</td>
      <td><span class="delivery-date ${delInfo.cls}">${delInfo.text}</span></td>
      <td><span class="status-badge ${sBadge}" data-action="cycle" data-id="${c.id}" title="Click to cycle status">${sEmoji} ${esc(c.status)}</span></td>
      <td><span class="date-added">${formatDate(c.dateAdded)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="action-btn view" data-action="view" data-id="${c.id}" title="View">👁</button>
          <button class="action-btn edit" data-action="edit" data-id="${c.id}" title="Edit">✏️</button>
          ${isAdmin?`<button class="action-btn del" data-action="del" data-id="${c.id}" title="Delete">🗑</button>`:''}
        </div>
      </td>`;
    tb.appendChild(tr);
  });
}

// ── ATTENDER CSS CLASS ─────────────────────────────────────────────────────
function attClass(a) {
  const m = {Sangeetha:'att-sg',Kani:'att-kn',Ramkumar:'att-rk',VishnuPrakash:'att-vp'};
  return m[a] || '';
}

// ── AVATAR HELPERS ──────────────────────────────────────────────────────────
const AV_COLORS=[['#E63946','#FF6B35'],['#1D6FA4','#5BC0EB'],['#845EC2','#C3A8F0'],
  ['#06D6A0','#0aaa7f'],['#FFD166','#FF6B35'],['#FF6B6B','#845EC2']];
function avatarColor(n){let h=0;for(let c of n)h=(h*31+c.charCodeAt(0))&0xffffffff;
  const[a,b]=AV_COLORS[Math.abs(h)%AV_COLORS.length];return `linear-gradient(135deg,${a},${b})`}
function initials(n){return n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()}

// ── PRODUCT TAGS ────────────────────────────────────────────────────────────
function buildProductTags(products) {
  if (!products || !products.length) return '<span style="color:var(--text-muted);font-size:0.76rem">—</span>';
  return products.map(p=>{
    const isS=p.toLowerCase().startsWith('siemens');
    return `<span class="product-tag ${isS?'siemens-tag':''}">${esc(p)}</span>`;
  }).join('');
}

// ── DATE HELPERS ─────────────────────────────────────────────────────────────
function formatDelivery(d) {
  if(!d) return {text:'—',cls:''};
  const dt=new Date(d),now=new Date();now.setHours(0,0,0,0);
  const diff=Math.ceil((dt-now)/(86400000));
  const fmt=dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  if(diff<0)  return {text:`⚠ ${fmt}`,cls:'delivery-passed'};
  if(diff<=3) return {text:`🔔 ${fmt}`,cls:'delivery-soon'};
  return {text:fmt,cls:'delivery-ok'};
}
function formatDate(iso){
  if(!iso)return '—';
  return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ── MODAL OPEN/CLOSE ──────────────────────────────────────────────────────────
const modalOverlay  = document.getElementById('modalOverlay');
const viewOverlay   = document.getElementById('viewOverlay');
const deleteOverlay = document.getElementById('deleteOverlay');

function openModal(mode='add', id=null) {
  editingId = id;
  const form = document.getElementById('customerForm');
  form.reset();
  document.querySelectorAll('input[name=product]').forEach(cb=>cb.checked=false);
  document.getElementById('customProduct').value='';

  if (mode==='edit' && id) {
    const c = customers.find(x=>x.id===id);
    if(!c) return;
    document.getElementById('modalTitle').textContent = 'Edit Customer';
    document.getElementById('custName').value     = c.name;
    document.getElementById('custPhone').value    = c.phone;
    document.getElementById('custAttender').value = c.attender;
    document.getElementById('custStatus').value   = c.status;
    document.getElementById('custPrice').value    = c.price||'';
    document.getElementById('custDelivery').value = c.delivery||'';
    document.getElementById('custNotes').value    = c.notes||'';
    c.products.forEach(p=>{
      const cb=document.querySelector(`input[name=product][value="${p}"]`);
      if(cb) cb.checked=true;
      else if(!p.startsWith('Bosch')&&!p.startsWith('Siemens'))
        document.getElementById('customProduct').value=p;
    });
  } else {
    document.getElementById('modalTitle').textContent = 'New Walk-in Customer';
    if(currentUser && currentUser.attender)
      document.getElementById('custAttender').value = currentUser.attender;
  }
  modalOverlay.classList.add('open');
  setTimeout(()=>document.getElementById('custName').focus(), 280);
}
function closeModal(){ modalOverlay.classList.remove('open'); editingId=null; }

// ── FORM SUBMIT ───────────────────────────────────────────────────────────────
document.getElementById('customerForm').addEventListener('submit', e=>{
  e.preventDefault();
  const checked=[...document.querySelectorAll('input[name=product]:checked')].map(cb=>cb.value);
  const custom=document.getElementById('customProduct').value.trim();
  if(custom) checked.push(custom);
  if(!checked.length){ showToast('Please select at least one product.','error'); return; }

  const entry={
    id:       editingId || Date.now().toString(),
    name:     document.getElementById('custName').value.trim(),
    phone:    document.getElementById('custPhone').value.trim(),
    attender: document.getElementById('custAttender').value,
    status:   document.getElementById('custStatus').value,
    products: checked,
    price:    document.getElementById('custPrice').value||'',
    delivery: document.getElementById('custDelivery').value||'',
    notes:    document.getElementById('custNotes').value.trim(),
    dateAdded: editingId
      ? (customers.find(x=>x.id===editingId)?.dateAdded||new Date().toISOString())
      : new Date().toISOString(),
    addedBy: currentUser?.name || ''
  };

  if(editingId){
    customers[customers.findIndex(x=>x.id===editingId)]=entry;
    showToast('Customer updated!','success');
  } else {
    customers.unshift(entry);
    showToast('Walk-in added!','success');
  }
  save(); render(); closeModal();
});

// ── TABLE CLICK DELEGATION ─────────────────────────────────────────────────
document.getElementById('tableBody').addEventListener('click', e=>{
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const {action,id} = btn.dataset;
  if(action==='view')  openViewModal(id);
  if(action==='edit')  openModal('edit',id);
  if(action==='del')   openDeleteModal(id);
  if(action==='cycle') cycleStatus(id);
});

// ── CYCLE STATUS ────────────────────────────────────────────────────────────
const STATUS_CYCLE=['Hot','Warm','Cold','Converted','Not Interested'];
function cycleStatus(id){
  const c=customers.find(x=>x.id===id); if(!c)return;
  c.status=STATUS_CYCLE[(STATUS_CYCLE.indexOf(c.status)+1)%STATUS_CYCLE.length];
  save(); render(); showToast(`Status → ${c.status}`,'info');
}

// ── VIEW MODAL ──────────────────────────────────────────────────────────────
function openViewModal(id) {
  const c=customers.find(x=>x.id===id); if(!c)return;
  const d=formatDelivery(c.delivery);
  const sEmoji={Hot:'🔥',Warm:'🌤',Cold:'❄️',Converted:'✅','Not Interested':'🚫'}[c.status]||'';
  document.getElementById('viewBody').innerHTML=`
    <div class="view-section">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div class="cust-avatar" style="background:${avatarColor(c.name)};width:50px;height:50px;border-radius:13px;font-size:1.1rem;display:flex;align-items:center;justify-content:center;font-weight:700">${initials(c.name)}</div>
        <div><div style="font-size:1.1rem;font-weight:700">${esc(c.name)}</div>
          <a href="tel:${esc(c.phone)}" class="phone-link">📞 ${esc(c.phone)}</a></div>
      </div>
      <div class="view-row"><span class="view-key">Attender</span><span class="view-val">${esc(c.attender)}</span></div>
      <div class="view-row"><span class="view-key">Status</span><span class="view-val">${sEmoji} ${esc(c.status)}</span></div>
      <div class="view-row"><span class="view-key">Date Added</span><span class="view-val">${formatDate(c.dateAdded)}</span></div>
      ${c.addedBy?`<div class="view-row"><span class="view-key">Entered By</span><span class="view-val">${esc(c.addedBy)}</span></div>`:''}
    </div>
    <div class="view-section"><h3>💡 Products Seen</h3>
      <div class="products-list" style="max-width:100%">${buildProductTags(c.products)}</div></div>
    <div class="view-section"><h3>💰 Quote & Delivery</h3>
      <div class="view-row"><span class="view-key">Price Quoted</span>
        <span class="view-val" style="color:var(--green);font-weight:700">${c.price?'₹'+Number(c.price).toLocaleString('en-IN'):'—'}</span></div>
      <div class="view-row"><span class="view-key">Expected Delivery</span>
        <span class="view-val ${d.cls}">${d.text||'—'}</span></div></div>
    ${c.notes?`<div class="view-section"><h3>📝 Remarks</h3>
      <p style="font-size:0.86rem;line-height:1.7;color:var(--text-muted)">${esc(c.notes)}</p></div>`:''}
    <div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap">
      <button class="btn-save" style="flex:1;justify-content:center;min-width:110px"
        onclick="openModal('edit','${c.id}');closeViewModal()">✏️ Edit</button>
      <a href="https://wa.me/91${c.phone}?text=${encodeURIComponent('Hi '+c.name+', thank you for visiting Kitchen Craft! We are happy to assist you further.')}"
        target="_blank"
        style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;
          border-radius:10px;background:linear-gradient(135deg,#25D366,#128C7E);
          color:white;font-weight:600;font-size:0.86rem;text-decoration:none;
          box-shadow:0 4px 14px rgba(37,211,102,0.3)">💬 WhatsApp</a>
      ${c.status==='Converted'?`<button class="btn-invoice" onclick="triggerInvoiceUpload('${c.id}')">📂 Upload Invoice</button>`:''}
    </div>
    ${c.status==='Converted'?buildInvoiceAttachment(c):''}
  `;
  viewOverlay.classList.add('open');
}
function closeViewModal(){ viewOverlay.classList.remove('open'); }

// ── DELETE MODAL ─────────────────────────────────────────────────────────────
function openDeleteModal(id){ deleteTargetId=id; deleteOverlay.classList.add('open'); }
document.getElementById('deleteConfirmBtn').addEventListener('click',()=>{
  if(!deleteTargetId) return;
  customers=customers.filter(x=>x.id!==deleteTargetId);
  save(); render(); deleteOverlay.classList.remove('open'); deleteTargetId=null;
  showToast('Customer deleted.','error');
});
document.getElementById('deleteCancelBtn').addEventListener('click',()=>{
  deleteOverlay.classList.remove('open'); deleteTargetId=null;
});

// ── TABS ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter=tab.dataset.filter;
    render();
  });
});

// ── SEARCH ────────────────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', e=>{
  searchQuery=e.target.value.trim(); render();
});

// ── MISC EVENTS ───────────────────────────────────────────────────────────────
document.getElementById('btnOpenModal').addEventListener('click',()=>openModal('add'));
document.getElementById('modalClose').addEventListener('click',closeModal);
document.getElementById('btnCancel').addEventListener('click',closeModal);
document.getElementById('viewClose').addEventListener('click',closeViewModal);
modalOverlay.addEventListener('click',e=>{if(e.target===modalOverlay)closeModal()});
viewOverlay.addEventListener('click',e=>{if(e.target===viewOverlay)closeViewModal()});
deleteOverlay.addEventListener('click',e=>{if(e.target===deleteOverlay){deleteOverlay.classList.remove('open');deleteTargetId=null;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeViewModal();deleteOverlay.classList.remove('open');}});
document.getElementById('custPhone').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10)});

// ── INVOICE FILE UPLOAD ───────────────────────────────────────────────────────
let uploadTargetId = null;

function triggerInvoiceUpload(id){
  uploadTargetId = id;
  const input = document.getElementById('invoiceFileInput');
  input.value = ''; // reset so same file can be re-uploaded
  input.click();
}

document.getElementById('invoiceFileInput').addEventListener('change', function(){
  const file = this.files[0];
  if(!file) return;
  const maxMB = 5;
  if(file.size > maxMB * 1024 * 1024){
    showToast(`File too large. Max ${maxMB}MB allowed.`, 'error');
    return;
  }
  const allowed = ['application/pdf','image/jpeg','image/jpg'];
  if(!allowed.includes(file.type)){
    showToast('Only PDF or JPEG files are allowed.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e){
    const c = customers.find(x=>x.id===uploadTargetId);
    if(!c) return;
    c.invoice = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: e.target.result,          // base64 data URL
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.name || ''
    };
    save();
    render();
    showToast('Invoice uploaded successfully!', 'success');
    // Refresh the view modal to show the attachment
    openViewModal(uploadTargetId);
  };
  reader.readAsDataURL(file);
});

function buildInvoiceAttachment(c){
  if(!c.invoice) return '';
  const isPDF = c.invoice.type === 'application/pdf';
  const sizeKB = (c.invoice.size / 1024).toFixed(1);
  const uploadDate = formatDate(c.invoice.uploadedAt);
  return `
    <div class="invoice-attachment">
      <div class="inv-att-icon">${isPDF ? '📄' : '🖼'}</div>
      <div class="inv-att-info">
        <div class="inv-att-name">${esc(c.invoice.name)}</div>
        <div class="inv-att-meta">${isPDF?'PDF':'JPEG'} &nbsp;&bull;&nbsp; ${sizeKB} KB &nbsp;&bull;&nbsp; Uploaded ${uploadDate}
          ${c.invoice.uploadedBy?` by ${esc(c.invoice.uploadedBy)}`:''}
        </div>
      </div>
      <div class="inv-att-actions">
        <a class="inv-att-btn view-btn" href="${c.invoice.data}" target="_blank" title="View">👁 View</a>
        <a class="inv-att-btn download-btn" href="${c.invoice.data}" download="${esc(c.invoice.name)}" title="Download">⬇ Save</a>
        <button class="inv-att-btn remove-btn" onclick="removeInvoice('${c.id}')" title="Remove">🗑 Remove</button>
      </div>
    </div>`;
}

function removeInvoice(id){
  const c = customers.find(x=>x.id===id);
  if(!c) return;
  delete c.invoice;
  save(); render();
  showToast('Invoice removed.', 'info');
  openViewModal(id);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg,type='info'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}


// ── INIT ──────────────────────────────────────────────────────────────────────
(function init(){
  const saved=sessionStorage.getItem('kc_session');
  if(saved){
    currentUser=JSON.parse(saved);
    showApp();
  }
  // login screen is visible by default (display:flex in CSS)
})();
