/**
 * auth.js – Kitchen Craft CRM
 *
 * Cloud mode (Firebase configured): real sign-in via Firebase Auth
 *   email/password. Staff type their username; it maps to
 *   <username>@kitchencraft.crm (see utils.usernameToEmail). Create those
 *   accounts once in Firebase Console → Authentication → Users.
 *
 * Local mode (Firebase not configured yet): falls back to the accounts
 *   in utils.js. This is a DEV-ONLY convenience so the app works before
 *   Firebase is set up — it is not real security.
 */

import { USER_ACCOUNTS, validateLogin, usernameToEmail, initials } from './utils.js';
import { getFirebase } from './firebase-init.js';

const SESSION_KEY = 'kc_session_v2';

let fb = null;
let onUserCb = () => {};

/** Strips the password field off a local account object. */
function toProfile(account) {
  const { password, ...profile } = account;
  return profile;
}

/**
 * Finds the staff profile (name, role, attender, colors) for a Firebase
 * Auth email. Unknown emails get a minimal store-level profile — real
 * permissions are enforced by the Firestore security rules anyway.
 */
export function profileForEmail(email) {
  const e = String(email || '').toLowerCase();
  const known = USER_ACCOUNTS.find(u => usernameToEmail(u.username) === e);
  if (known) return toProfile(known);
  const uname = e.split('@')[0] || 'user';
  return {
    id: e, name: uname, username: uname, role: 'store', attender: null,
    initials: initials(uname),
    color: 'linear-gradient(135deg,#06D6A0,#0aaa7f)'
  };
}

function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') ||
      code.includes('user-not-found') || code.includes('invalid-email')) {
    return 'Invalid username or password. Please try again.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many failed attempts. Please wait a minute and try again.';
  }
  if (code.includes('network-request-failed')) {
    return 'Network error. Check the internet connection and try again.';
  }
  return 'Sign-in failed. Please try again.';
}

/**
 * Starts the auth layer. `onUser(profile|null)` fires on every login
 * state change (including restoring a previous session on page load).
 * Returns 'cloud' or 'local'.
 */
export async function initAuth(onUser) {
  onUserCb = onUser;
  fb = await getFirebase();

  if (fb) {
    fb.authApi.onAuthStateChanged(fb.auth, u => {
      onUserCb(u ? profileForEmail(u.email) : null);
    });
    return 'cloud';
  }

  // Local mode: restore session from this browser tab, if any.
  let profile = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    const acct = saved && USER_ACCOUNTS.find(u => u.username === saved.username);
    if (acct) profile = toProfile(acct);
  } catch { /* corrupt session — ignore */ }
  onUserCb(profile);
  return 'local';
}

/** Signs in. Throws an Error with a user-friendly message on failure. */
export async function login(username, password) {
  if (fb) {
    try {
      await fb.authApi.signInWithEmailAndPassword(
        fb.auth, usernameToEmail(username), password
      );
      return; // onAuthStateChanged fires onUserCb
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }
  const user = validateLogin(username, password);
  if (!user) throw new Error('Invalid username or password. Please try again.');
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username }));
  onUserCb(toProfile(user));
}

/** Signs out and notifies via onUser(null). */
export async function logout() {
  if (fb) {
    await fb.authApi.signOut(fb.auth); // onAuthStateChanged fires onUserCb
    return;
  }
  sessionStorage.removeItem(SESSION_KEY);
  onUserCb(null);
}
