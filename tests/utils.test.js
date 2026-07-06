/**
 * utils.test.js – Kitchen Craft CRM Unit Tests
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  validateLogin,
  filterCustomers,
  cycleStatus,
  formatDelivery,
  formatDate,
  initials,
  avatarColor,
  buildAttenderClass,
  canDelete,
  escHtml,
  buildProductTagsHtml,
  usernameToEmail,
  sortByNewest,
  AUTH_EMAIL_DOMAIN,
  USER_ACCOUNTS,
  STATUS_CYCLE
} from '../utils.js';
import { isFirebaseConfigured } from '../firebase-config.js';

// ── validateLogin ─────────────────────────────────────────────────────────────
describe('validateLogin', () => {
  it('returns user object for correct credentials – Vishnu Prakash', () => {
    const user = validateLogin('vishnuprakash', 'vishnu@123');
    expect(user).not.toBeNull();
    expect(user.name).toBe('Vishnu Prakash');
    expect(user.role).toBe('partner');
  });

  it('returns user object for correct credentials – Ramkumar', () => {
    const user = validateLogin('ramkumar', 'ram@123');
    expect(user).not.toBeNull();
    expect(user.name).toBe('Ramkumar');
    expect(user.role).toBe('partner');
  });

  it('returns user object for correct credentials – Store Incharge', () => {
    const user = validateLogin('store', 'store@123');
    expect(user).not.toBeNull();
    expect(user.name).toBe('Store Incharge');
    expect(user.role).toBe('store');
  });

  it('is case-insensitive for username', () => {
    const user = validateLogin('VISHNUPRAKASH', 'vishnu@123');
    expect(user).not.toBeNull();
    expect(user.name).toBe('Vishnu Prakash');
  });

  it('trims whitespace from username', () => {
    const user = validateLogin('  ramkumar  ', 'ram@123');
    expect(user).not.toBeNull();
  });

  it('returns null for wrong password', () => {
    expect(validateLogin('vishnuprakash', 'wrongpassword')).toBeNull();
  });

  it('returns null for unknown username', () => {
    expect(validateLogin('unknownuser', 'vishnu@123')).toBeNull();
  });

  it('returns null for empty username', () => {
    expect(validateLogin('', 'vishnu@123')).toBeNull();
  });

  it('returns null for empty password', () => {
    expect(validateLogin('vishnuprakash', '')).toBeNull();
  });

  it('returns null for both empty', () => {
    expect(validateLogin('', '')).toBeNull();
  });

  it('works with custom accounts array', () => {
    const custom = [{ username: 'test', password: 'pass', name: 'Test User', role: 'partner' }];
    const user = validateLogin('test', 'pass', custom);
    expect(user.name).toBe('Test User');
  });
});

// ── filterCustomers ───────────────────────────────────────────────────────────
describe('filterCustomers', () => {
  const customers = [
    { id: '1', name: 'Ramesh Kumar',   phone: '9876543210', status: 'Hot'   },
    { id: '2', name: 'Priya Lakshmi',  phone: '9988776655', status: 'Warm'  },
    { id: '3', name: 'Anbu Selvan',    phone: '9123456789', status: 'Cold'  },
    { id: '4', name: 'Deepa Raj',      phone: '9000011111', status: 'Converted' },
    { id: '5', name: 'Karthik Rajan',  phone: '9876500000', status: 'Hot'   },
  ];

  it('returns all customers when filter is "all"', () => {
    expect(filterCustomers(customers, 'all', '').length).toBe(5);
  });

  it('filters by Hot status', () => {
    const result = filterCustomers(customers, 'Hot', '');
    expect(result.length).toBe(2);
    result.forEach(c => expect(c.status).toBe('Hot'));
  });

  it('filters by Warm status', () => {
    const result = filterCustomers(customers, 'Warm', '');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Priya Lakshmi');
  });

  it('filters by Converted status', () => {
    const result = filterCustomers(customers, 'Converted', '');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Deepa Raj');
  });

  it('returns empty array when no status match', () => {
    expect(filterCustomers(customers, 'Not Interested', '').length).toBe(0);
  });

  it('searches by name (case-insensitive)', () => {
    const result = filterCustomers(customers, 'all', 'ramesh');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Ramesh Kumar');
  });

  it('searches by partial name', () => {
    const result = filterCustomers(customers, 'all', 'raj');
    expect(result.length).toBe(2); // Deepa Raj + Karthik Rajan
  });

  it('searches by phone number', () => {
    const result = filterCustomers(customers, 'all', '9988776655');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Priya Lakshmi');
  });

  it('combines status filter and search query', () => {
    const result = filterCustomers(customers, 'Hot', '9876');
    expect(result.length).toBe(2); // Both hot customers match '9876'
  });

  it('returns empty array for non-matching search', () => {
    expect(filterCustomers(customers, 'all', 'zzznomatch').length).toBe(0);
  });

  it('returns empty array for empty customers list', () => {
    expect(filterCustomers([], 'all', '').length).toBe(0);
  });
});

// ── cycleStatus ───────────────────────────────────────────────────────────────
describe('cycleStatus', () => {
  it('Hot → Warm', () => expect(cycleStatus('Hot')).toBe('Warm'));
  it('Warm → Cold', () => expect(cycleStatus('Warm')).toBe('Cold'));
  it('Cold → Converted', () => expect(cycleStatus('Cold')).toBe('Converted'));
  it('Converted → Not Interested', () => expect(cycleStatus('Converted')).toBe('Not Interested'));
  it('Not Interested → Hot (wraps around)', () => expect(cycleStatus('Not Interested')).toBe('Hot'));
  it('unknown status → defaults to first (Hot)', () => expect(cycleStatus('Unknown')).toBe('Hot'));
  it('empty string → defaults to Hot', () => expect(cycleStatus('')).toBe('Hot'));
});

// ── formatDelivery ────────────────────────────────────────────────────────────
describe('formatDelivery', () => {
  it('returns dash for empty string', () => {
    expect(formatDelivery('')).toEqual({ text: '—', cls: '' });
  });

  it('returns dash for null/undefined', () => {
    expect(formatDelivery(null)).toEqual({ text: '—', cls: '' });
    expect(formatDelivery(undefined)).toEqual({ text: '—', cls: '' });
  });

  it('returns delivery-passed class for past date', () => {
    const past = '2020-01-01';
    const result = formatDelivery(past);
    expect(result.cls).toBe('delivery-passed');
    expect(result.text).toContain('⚠');
  });

  it('returns delivery-soon class for date within 3 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const result = formatDelivery(soon.toISOString().split('T')[0]);
    expect(result.cls).toBe('delivery-soon');
    expect(result.text).toContain('🔔');
  });

  it('returns delivery-ok class for date more than 3 days away', () => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    const result = formatDelivery(future.toISOString().split('T')[0]);
    expect(result.cls).toBe('delivery-ok');
    expect(result.text).not.toContain('⚠');
    expect(result.text).not.toContain('🔔');
  });

  it('returns dash for invalid date string', () => {
    expect(formatDelivery('not-a-date')).toEqual({ text: '—', cls: '' });
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('returns dash for empty input', () => expect(formatDate('')).toBe('—'));
  it('returns dash for null', () => expect(formatDate(null)).toBe('—'));
  it('returns formatted date string for valid ISO', () => {
    const result = formatDate('2025-06-15T00:00:00.000Z');
    expect(result).toMatch(/\d{2}\s\w+\s\d{4}/); // e.g. "15 Jun 2025"
  });
  it('returns dash for invalid date string', () => {
    expect(formatDate('garbage')).toBe('—');
  });
});

// ── initials ──────────────────────────────────────────────────────────────────
describe('initials', () => {
  it('returns first two letters for two-word name', () => {
    expect(initials('Vishnu Prakash')).toBe('VP');
  });
  it('returns single letter for single-word name', () => {
    expect(initials('Ramkumar')).toBe('R');
  });
  it('returns first two initials for three-word name', () => {
    expect(initials('Anbu Selvan Kumar')).toBe('AS');
  });
  it('is uppercase', () => {
    expect(initials('priya lakshmi')).toBe('PL');
  });
  it('returns ? for empty string', () => {
    expect(initials('')).toBe('?');
  });
  it('handles extra whitespace', () => {
    expect(initials('  Ramesh  Kumar  ')).toBe('RK');
  });
});

// ── avatarColor ───────────────────────────────────────────────────────────────
describe('avatarColor', () => {
  it('returns a CSS gradient string', () => {
    const color = avatarColor('Ramesh Kumar');
    expect(color).toMatch(/^linear-gradient/);
  });
  it('returns same color for same name (deterministic)', () => {
    expect(avatarColor('Priya')).toBe(avatarColor('Priya'));
  });
  it('returns different colors for different names', () => {
    expect(avatarColor('Ramesh')).not.toBe(avatarColor('Priya'));
  });
});

// ── buildAttenderClass ────────────────────────────────────────────────────────
describe('buildAttenderClass', () => {
  it('returns att-sg for Sangeetha', () => expect(buildAttenderClass('Sangeetha')).toBe('att-sg'));
  it('returns att-kn for Kani',      () => expect(buildAttenderClass('Kani')).toBe('att-kn'));
  it('returns att-rk for Ramkumar',  () => expect(buildAttenderClass('Ramkumar')).toBe('att-rk'));
  it('returns att-vp for VishnuPrakash', () => expect(buildAttenderClass('VishnuPrakash')).toBe('att-vp'));
  it('returns empty string for unknown attender', () => expect(buildAttenderClass('Unknown')).toBe(''));
  it('returns empty string for empty input',  () => expect(buildAttenderClass('')).toBe(''));
});

// ── canDelete ─────────────────────────────────────────────────────────────────
describe('canDelete', () => {
  it('returns true for partner role', () => {
    expect(canDelete({ role: 'partner' })).toBe(true);
  });
  it('returns false for store role', () => {
    expect(canDelete({ role: 'store' })).toBe(false);
  });
  it('returns false for null user', () => {
    expect(canDelete(null)).toBe(false);
  });
  it('returns false for undefined user', () => {
    expect(canDelete(undefined)).toBe(false);
  });
  it('Vishnu Prakash can delete', () => {
    const user = USER_ACCOUNTS.find(u => u.id === 'vishnu');
    expect(canDelete(user)).toBe(true);
  });
  it('Ramkumar can delete', () => {
    const user = USER_ACCOUNTS.find(u => u.id === 'ram');
    expect(canDelete(user)).toBe(true);
  });
  it('Store Incharge cannot delete', () => {
    const user = USER_ACCOUNTS.find(u => u.id === 'store');
    expect(canDelete(user)).toBe(false);
  });
});

// ── escHtml ───────────────────────────────────────────────────────────────────
describe('escHtml', () => {
  it('escapes & character', () => expect(escHtml('a & b')).toBe('a &amp; b'));
  it('escapes < character', () => expect(escHtml('<b>')).toBe('&lt;b&gt;'));
  it('escapes > character', () => expect(escHtml('a > b')).toBe('a &gt; b'));
  it('escapes " character', () => expect(escHtml('"quoted"')).toBe('&quot;quoted&quot;'));
  it('handles null safely',  () => expect(escHtml(null)).toBe(''));
  it('handles number input', () => expect(escHtml(42)).toBe('42'));
  it('handles normal text unchanged', () => expect(escHtml('Hello World')).toBe('Hello World'));
});

// ── buildProductTagsHtml ──────────────────────────────────────────────────────
describe('buildProductTagsHtml', () => {
  it('returns dash span for empty array', () => {
    expect(buildProductTagsHtml([])).toContain('—');
  });
  it('returns dash span for null', () => {
    expect(buildProductTagsHtml(null)).toContain('—');
  });
  it('renders a Bosch product without siemens-tag class', () => {
    const html = buildProductTagsHtml(['Bosch Chimney']);
    expect(html).toContain('Bosch Chimney');
    expect(html).not.toContain('siemens-tag');
  });
  it('renders a Siemens product with siemens-tag class', () => {
    const html = buildProductTagsHtml(['Siemens Fridge']);
    expect(html).toContain('siemens-tag');
    expect(html).toContain('Siemens Fridge');
  });
  it('renders multiple products', () => {
    const html = buildProductTagsHtml(['Bosch Oven', 'Siemens Dishwasher']);
    expect(html).toContain('Bosch Oven');
    expect(html).toContain('Siemens Dishwasher');
  });
  it('escapes HTML in product names', () => {
    const html = buildProductTagsHtml(['<script>alert(1)</script>']);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ── USER_ACCOUNTS integrity ───────────────────────────────────────────────────
describe('USER_ACCOUNTS data integrity', () => {
  it('has exactly 3 users', () => expect(USER_ACCOUNTS.length).toBe(3));
  it('all users have required fields', () => {
    USER_ACCOUNTS.forEach(u => {
      expect(u.id).toBeTruthy();
      expect(u.name).toBeTruthy();
      expect(u.username).toBeTruthy();
      expect(u.password).toBeTruthy();
      expect(u.role).toBeTruthy();
    });
  });
  it('usernames are unique', () => {
    const names = USER_ACCOUNTS.map(u => u.username);
    expect(new Set(names).size).toBe(names.length);
  });
  it('partners have attender set', () => {
    USER_ACCOUNTS.filter(u => u.role === 'partner').forEach(u => {
      expect(u.attender).not.toBeNull();
    });
  });
  it('store role has no attender', () => {
    const store = USER_ACCOUNTS.find(u => u.role === 'store');
    expect(store.attender).toBeNull();
  });
});

// ── STATUS_CYCLE integrity ────────────────────────────────────────────────────
describe('STATUS_CYCLE', () => {
  it('has 5 statuses', () => expect(STATUS_CYCLE.length).toBe(5));
  it('starts with Hot', () => expect(STATUS_CYCLE[0]).toBe('Hot'));
  it('ends with Not Interested', () => expect(STATUS_CYCLE[4]).toBe('Not Interested'));
});

// ── usernameToEmail ───────────────────────────────────────────────────────────
describe('usernameToEmail', () => {
  it('maps a username to the auth pseudo-domain', () => {
    expect(usernameToEmail('vishnuprakash')).toBe(`vishnuprakash@${AUTH_EMAIL_DOMAIN}`);
  });
  it('lowercases and trims', () => {
    expect(usernameToEmail('  RamKumar ')).toBe(`ramkumar@${AUTH_EMAIL_DOMAIN}`);
  });
  it('passes through full emails unchanged (lowercased)', () => {
    expect(usernameToEmail('Store@Example.com')).toBe('store@example.com');
  });
  it('supports a custom domain', () => {
    expect(usernameToEmail('kani', 'shop.in')).toBe('kani@shop.in');
  });
  it('returns empty string for empty input', () => {
    expect(usernameToEmail('')).toBe('');
    expect(usernameToEmail(null)).toBe('');
  });
});

// ── sortByNewest ──────────────────────────────────────────────────────────────
describe('sortByNewest', () => {
  it('sorts newest dateAdded first', () => {
    const list = [
      { id: 'a', dateAdded: '2025-01-01T10:00:00.000Z' },
      { id: 'b', dateAdded: '2025-06-01T10:00:00.000Z' },
      { id: 'c', dateAdded: '2025-03-01T10:00:00.000Z' }
    ];
    expect(sortByNewest(list).map(c => c.id)).toEqual(['b', 'c', 'a']);
  });
  it('does not mutate the input array', () => {
    const list = [
      { id: 'a', dateAdded: '2025-01-01' },
      { id: 'b', dateAdded: '2025-06-01' }
    ];
    sortByNewest(list);
    expect(list[0].id).toBe('a');
  });
  it('sinks records without dateAdded to the bottom', () => {
    const list = [{ id: 'x' }, { id: 'y', dateAdded: '2025-01-01' }];
    expect(sortByNewest(list).map(c => c.id)).toEqual(['y', 'x']);
  });
  it('handles empty and null input', () => {
    expect(sortByNewest([])).toEqual([]);
    expect(sortByNewest(null)).toEqual([]);
  });
});

// ── escHtml single quotes ─────────────────────────────────────────────────────
describe('escHtml single quotes', () => {
  it('escapes \' character', () => {
    expect(escHtml("O'Brien")).toBe('O&#39;Brien');
  });
});

// ── isFirebaseConfigured ──────────────────────────────────────────────────────
describe('isFirebaseConfigured', () => {
  const realish = {
    apiKey: 'AIzaFakeKey123', authDomain: 'x.firebaseapp.com', projectId: 'x',
    storageBucket: 'x.appspot.com', messagingSenderId: '123', appId: '1:123:web:abc'
  };
  it('is false for the shipped placeholder config', () => {
    expect(isFirebaseConfigured()).toBe(false);
  });
  it('is true when all values are filled in', () => {
    expect(isFirebaseConfigured(realish)).toBe(true);
  });
  it('is false when any value is still a placeholder', () => {
    expect(isFirebaseConfigured({ ...realish, appId: 'PASTE_YOUR_APP_ID_HERE' })).toBe(false);
  });
  it('is false when a value is empty', () => {
    expect(isFirebaseConfigured({ ...realish, apiKey: '' })).toBe(false);
  });
});
