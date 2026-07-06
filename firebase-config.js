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
  apiKey:            "PASTE_YOUR_API_KEY_HERE",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId:         "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId:             "PASTE_YOUR_APP_ID_HERE"
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
