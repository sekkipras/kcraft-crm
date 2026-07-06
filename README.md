# Kitchen Craft CRM 🏪
**Bosch & Siemens Authorized Dealer · Kalavasal Bypass, Madurai**

A real-time, multi-user CRM to track walk-in customers, follow-up status, and product interest.

---

## How it works

The app has two modes, switched automatically:

| Mode | When | Where data lives |
|---|---|---|
| 💾 **Local** | `firebase-config.js` still has placeholders | This browser only (localStorage) |
| ☁ **Live sync** | Real Firebase config pasted in | Firestore — every device shares the same data in real time |

A badge in the header shows which mode you're in. The first time cloud mode
starts, any customers already saved locally are migrated up to Firestore
automatically.

```
kitchen-craft-crm/
├── index.html              ← App HTML (loads app.js as an ES module)
├── style.css               ← All styles
├── app.js                  ← UI layer only (DOM wiring & event handlers)
├── utils.js                ← Pure logic — fully unit-tested
├── auth.js                 ← Login/logout (Firebase Auth or local fallback)
├── store.js                ← Customer data (Firestore live sync or localStorage)
├── firebase-init.js        ← Lazy Firebase SDK loader
├── firebase-config.js      ← Firebase keys (safe to commit once rules are live)
├── firestore.rules         ← Database security rules  → paste into Firebase Console
├── storage.rules           ← Invoice-file security rules → paste into Firebase Console
├── tests/utils.test.js     ← 90+ unit tests
└── .github/workflows/ci.yml ← Test + deploy automation
```

---

## 🧪 Running locally

Because the app uses ES modules, opening `index.html` directly from the file
system won't work — serve it over HTTP:

```powershell
cd kitchen-craft-crm
npx serve .          # or: python -m http.server 8080
```

Then open the printed URL (e.g. http://localhost:3000).

Run the tests:

```powershell
npm install
npm test             # or: npm run test:coverage
```

---

## 🔥 Firebase Setup (one-time, ~15 minutes)

### 1. Create the project
1. Go to **https://console.firebase.google.com** → **Add project** → name it `kitchen-craft-crm`
2. Disable Google Analytics → **Create project**

### 2. Enable Authentication
1. Left menu → **Build → Authentication** → **Get started**
2. **Sign-in method** → enable **Email/Password**
3. **Users** tab → **Add user** — create these three (pick strong passwords!):

| Staff member | Email to enter | Role |
|---|---|---|
| Vishnu Prakash | `vishnuprakash@kitchencraft.crm` | Partner (can delete) |
| Ramkumar | `ramkumar@kitchencraft.crm` | Partner (can delete) |
| Store Incharge | `store@kitchencraft.crm` | Store staff |

> The `@kitchencraft.crm` emails are not real mailboxes — they're just IDs.
> Staff still log in with their plain username (`vishnuprakash`, `ramkumar`,
> `store`); the app adds the domain automatically.

### 3. Create the Firestore database
1. Left menu → **Build → Firestore Database** → **Create database**
2. Choose **Start in production mode** (NOT test mode) → pick region `asia-south1 (Mumbai)` → **Enable**
3. **Rules** tab → replace everything with the contents of [`firestore.rules`](firestore.rules) → **Publish**

### 4. Enable Storage (for invoice files)
1. Left menu → **Build → Storage** → **Get started** → production mode
2. **Rules** tab → replace with the contents of [`storage.rules`](storage.rules) → **Publish**

### 5. Get the config keys and paste them in
1. ⚙️ **Project settings** → **Your apps** → **`</>`** (Web) → register `Kitchen Craft CRM`
2. Copy the `firebaseConfig` values into [`firebase-config.js`](firebase-config.js)
3. Reload the app — the header badge should now say **☁ Live sync**

> ✅ With the rules from steps 3–4 published, these config keys are safe to
> commit and deploy publicly — they identify the project but grant no access.
> Do **not** paste keys before publishing the rules.

---

## 🔐 Logging in

Staff log in with a **username** (`vishnuprakash`, `ramkumar`, `store`) and the
password set in Firebase Console. Partners can add, edit and delete; store
staff can add and edit. Delete permission is enforced by the database rules,
not just the UI.

**Before Firebase is configured** the app falls back to the old built-in dev
accounts (see `USER_ACCOUNTS` in `utils.js`). That fallback is for development
only — it is not real security.

To change a password later: Firebase Console → Authentication → Users → ⋮ → Reset password.

---

## 🚀 Deploying to GitHub Pages

1. Create a GitHub repository (Public, no README) named `kitchen-craft-crm`
2. Push the code:
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/kitchen-craft-crm.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: **GitHub Actions**
4. Every push to `main` runs all tests and, if they pass, deploys to
   `https://YOUR_USERNAME.github.io/kitchen-craft-crm/`
5. Check progress under the repo's **Actions** tab

---

## 👥 Attenders

| Name | Badge Colour |
|---|---|
| Sangeetha | 🟠 Orange |
| Kani | 🟡 Yellow |
| Ramkumar | 🔵 Blue |
| Vishnu Prakash | 🟣 Purple |

---

## 📝 Notes for future work

- CSV export for monthly reporting
- Follow-up date reminders
- Card layout for phones (the 10-column table is desktop-first)
- Per-attender conversion stats
