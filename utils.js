/**
 * utils.js – Kitchen Craft CRM
 * Pure logic functions (no DOM, no Firebase, fully testable)
 */

// ── USER ACCOUNTS ────────────────────────────────────────────────────────────
export const USER_ACCOUNTS = [
  { id: 'vishnu', name: 'Vishnu Prakash', username: 'vishnuprakash', password: 'vishnu@123',
    role: 'partner', attender: 'VishnuPrakash', initials: 'VP',
    color: 'linear-gradient(135deg,#845EC2,#C3A8F0)' },
  { id: 'ram', name: 'Ramkumar', username: 'ramkumar', password: 'ram@123',
    role: 'partner', attender: 'Ramkumar', initials: 'RK',
    color: 'linear-gradient(135deg,#1D6FA4,#5BC0EB)' },
  { id: 'store', name: 'Store Incharge', username: 'store', password: 'store@123',
    role: 'store', attender: null, initials: 'SI',
    color: 'linear-gradient(135deg,#06D6A0,#0aaa7f)' }
];

// ── STATUS LIST ───────────────────────────────────────────────────────────────
export const STATUS_CYCLE = ['Hot', 'Warm', 'Cold', 'Converted', 'Not Interested'];

export const STATUS_EMOJI = {
  Hot: '🔥', Warm: '🌤', Cold: '❄️', Converted: '✅', 'Not Interested': '🚫'
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
/**
 * Validates a login attempt.
 * @param {string} username
 * @param {string} password
 * @param {Array}  accounts  - defaults to USER_ACCOUNTS
 * @returns {Object|null}    - matched user object or null
 */
export function validateLogin(username, password, accounts = USER_ACCOUNTS) {
  if (!username || !password) return null;
  return accounts.find(
    u => u.username === username.trim().toLowerCase() && u.password === password
  ) ?? null;
}

// ── CUSTOMER FILTERING ────────────────────────────────────────────────────────
/**
 * Filters a customer list by status tab and search query.
 * @param {Array}  customers
 * @param {string} filter    - 'all' or a status string
 * @param {string} query     - search text
 * @returns {Array}
 */
export function filterCustomers(customers, filter = 'all', query = '') {
  const q = query.toLowerCase().trim();
  return customers.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q));
    return matchFilter && matchSearch;
  });
}

// ── STATUS CYCLING ────────────────────────────────────────────────────────────
/**
 * Returns the next status in the cycle.
 * @param {string} currentStatus
 * @returns {string}
 */
export function cycleStatus(currentStatus) {
  const idx = STATUS_CYCLE.indexOf(currentStatus);
  if (idx === -1) return STATUS_CYCLE[0];
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

// ── DATE FORMATTING ───────────────────────────────────────────────────────────
/**
 * Formats a delivery date string into display text + CSS class.
 * @param {string} dateStr - ISO date string e.g. '2025-06-10'
 * @returns {{ text: string, cls: string }}
 */
export function formatDelivery(dateStr) {
  if (!dateStr) return { text: '—', cls: '' };
  const d    = new Date(dateStr);
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  if (isNaN(d.getTime())) return { text: '—', cls: '' };
  const diff = Math.ceil((d - now) / 86400000);
  const fmt  = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (diff < 0)  return { text: `⚠ ${fmt}`, cls: 'delivery-passed' };
  if (diff <= 3) return { text: `🔔 ${fmt}`, cls: 'delivery-soon' };
  return { text: fmt, cls: 'delivery-ok' };
}

/**
 * Formats an ISO datetime string to a readable date.
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── AVATAR HELPERS ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#E63946', '#FF6B35'], ['#1D6FA4', '#5BC0EB'], ['#845EC2', '#C3A8F0'],
  ['#06D6A0', '#0aaa7f'], ['#FFD166', '#FF6B35'], ['#FF6B6B', '#845EC2']
];

/**
 * Returns a CSS gradient string based on a name (deterministic).
 * @param {string} name
 * @returns {string}
 */
export function avatarColor(name) {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  const [a, b] = AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  return `linear-gradient(135deg,${a},${b})`;
}

/**
 * Returns up to 2 uppercase initials from a name.
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  if (!name || !name.trim()) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── ATTENDER CSS CLASS ────────────────────────────────────────────────────────
const ATTENDER_CLASS_MAP = {
  Sangeetha:     'att-sg',
  Kani:          'att-kn',
  Ramkumar:      'att-rk',
  VishnuPrakash: 'att-vp'
};

/**
 * Returns the CSS class for an attender badge.
 * @param {string} attender
 * @returns {string}
 */
export function buildAttenderClass(attender) {
  return ATTENDER_CLASS_MAP[attender] ?? '';
}

// ── ACCESS CONTROL ────────────────────────────────────────────────────────────
/**
 * Returns true if the logged-in user can delete records.
 * @param {{ role: string }|null} user
 * @returns {boolean}
 */
export function canDelete(user) {
  return user?.role === 'partner';
}

// ── ESCAPE HTML ───────────────────────────────────────────────────────────────
/**
 * Escapes a string for safe HTML insertion.
 * @param {*} s
 * @returns {string}
 */
export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── AUTH EMAIL MAPPING ────────────────────────────────────────────────────────
/**
 * The pseudo-domain used for Firebase Auth accounts. Staff log in with a
 * username; we map it to `<username>@kitchencraft.crm` behind the scenes.
 */
export const AUTH_EMAIL_DOMAIN = 'kitchencraft.crm';

/**
 * Maps a login username to the Firebase Auth email.
 * If the input already looks like an email, it is used as-is.
 * @param {string} username
 * @param {string} domain
 * @returns {string}
 */
export function usernameToEmail(username, domain = AUTH_EMAIL_DOMAIN) {
  const u = String(username || '').trim().toLowerCase();
  if (!u) return '';
  return u.includes('@') ? u : `${u}@${domain}`;
}

// ── SORTING ───────────────────────────────────────────────────────────────────
/**
 * Returns a new array sorted newest-first by dateAdded (ISO strings).
 * Records without dateAdded sink to the bottom.
 * @param {Array} customers
 * @returns {Array}
 */
export function sortByNewest(customers) {
  return [...(customers || [])].sort(
    (a, b) => String(b.dateAdded || '').localeCompare(String(a.dateAdded || ''))
  );
}

// ── PRODUCT TAG BUILDER ───────────────────────────────────────────────────────
/**
 * Builds an HTML string of product tag spans.
 * @param {string[]} products
 * @returns {string}
 */
export function buildProductTagsHtml(products) {
  if (!products || !products.length) {
    return '<span style="color:var(--text-muted);font-size:0.76rem">—</span>';
  }
  return products.map(p => {
    const isS = p.toLowerCase().startsWith('siemens');
    return `<span class="product-tag ${isS ? 'siemens-tag' : ''}">${escHtml(p)}</span>`;
  }).join('');
}
