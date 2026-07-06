/**
 * firebase-init.js – Kitchen Craft CRM
 *
 * Lazily loads the Firebase SDK (from the Google CDN) and initializes the
 * app, Firestore, Auth and Storage — but ONLY if firebase-config.js has
 * real values. When the config still has placeholders, getFirebase()
 * resolves to null and the rest of the app falls back to local mode,
 * so nothing here ever blocks the app from working offline.
 */

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.0';

let cached = null;
let loading = null;

/**
 * Returns { app, db, auth, storage, fs, authApi, st } or null when
 * Firebase is not configured. fs/authApi/st are the SDK module
 * namespaces (firestore / auth / storage functions).
 */
export async function getFirebase() {
  if (!isFirebaseConfigured()) return null;
  if (cached) return cached;
  if (loading) return loading;

  loading = (async () => {
    const [appMod, fs, authApi, st] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-firestore.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-storage.js`)
    ]);
    const app = appMod.getApps().length
      ? appMod.getApps()[0]
      : appMod.initializeApp(firebaseConfig);

    // Offline cache: keeps the CRM usable during network blips; writes
    // queue up and sync when the connection returns.
    let db;
    try {
      db = fs.initializeFirestore(app, {
        localCache: fs.persistentLocalCache({
          tabManager: fs.persistentMultipleTabManager()
        })
      });
    } catch {
      db = fs.getFirestore(app);
    }

    cached = {
      app,
      db,
      auth: authApi.getAuth(app),
      storage: st.getStorage(app),
      fs,
      authApi,
      st
    };
    return cached;
  })();

  return loading;
}
