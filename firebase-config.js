/**
 * firebase-config.js – Kitchen Craft CRM
 *
 * HOW TO ACTIVATE CLOUD SYNC:
 * 1. Go to https://console.firebase.google.com → your project
 * 2. ⚙️ Project settings → "Your apps" → "</> Web" → Register app
 * 3. Copy the config values it shows into the object below
 * 4. Follow README "Firebase Setup" to enable Auth, Firestore and the
 *    security rules BEFORE pasting keys — the rules are what keep the
 *    data private. Once rules are deployed, these keys are safe to
 *    commit (they only identify the project; they don't grant access).
 *
 * Until real values are pasted here, the app runs in "local mode":
 * data is stored only in the browser it was entered on.
 */

export const firebaseConfig = {
  apiKey:            "AIzaSyBQQwHnItFcRgbdY0aVa5zGS2DGr0V_hsw",
  authDomain:        "kcraft-crm.firebaseapp.com",
  projectId:         "kcraft-crm",
  storageBucket:     "kcraft-crm.firebasestorage.app",
  messagingSenderId: "377202791831",
  appId:             "1:377202791831:web:e87c11091d5023b84660d2"
};

/**
 * True when every config value has been filled in (no PASTE_ placeholders).
 * @param {object} cfg
 * @returns {boolean}
 */
export function isFirebaseConfigured(cfg = firebaseConfig) {
  return Object.values(cfg).every(
    v => typeof v === 'string' && v.length > 0 && !v.startsWith('PASTE_')
  );
}
