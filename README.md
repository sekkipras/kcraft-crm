# Kitchen Craft CRM 🏪
**Bosch & Siemens Authorized Dealer · Kalavasal Bypass, Madurai**

A real-time, multi-user CRM to track walk-in customers, follow-up status, and product interest.

---

## 🚀 Deployment Guide (Step-by-Step)

### Step 1 — Install Node.js (one-time setup)

Node.js is required to run tests locally.

1. Go to **https://nodejs.org**
2. Download the **LTS** version (e.g. v20)
3. Run the installer — click Next through all steps
4. Open a **new** PowerShell window and verify:
   ```
   node --version   → should show v20.x.x
   npm --version    → should show 10.x.x
   ```

---

### Step 2 — Create a GitHub Repository

1. Go to **https://github.com** → Sign in (or create a free account)
2. Click **"New repository"**
   - Name: `kitchen-craft-crm`
   - Visibility: **Public** *(required for free GitHub Pages)*
   - Do NOT tick "Initialize with README"
3. Click **Create repository**
4. Copy the repo URL shown (e.g. `https://github.com/YOUR_USERNAME/kitchen-craft-crm.git`)

---

### Step 3 — Push the Code to GitHub

Open PowerShell in the project folder and run these commands one by one:

```powershell
cd "C:\Users\TSP MARKETING\.gemini\antigravity\scratch\kitchen-craft-crm"

git init
git add .
git commit -m "Initial Kitchen Craft CRM commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kitchen-craft-crm.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

---

### Step 4 — Enable GitHub Pages

1. On GitHub, open your repo → click **Settings**
2. In the left sidebar → click **Pages**
3. Under **Source** → select **"GitHub Actions"**
4. Click **Save**

Your site will be live at:
**`https://YOUR_USERNAME.github.io/kitchen-craft-crm/`**

---

### Step 5 — Set Up Firebase (Real-Time Shared Data)

> Skip this step if you want to test without real-time sync first.

#### 5a. Create Firebase Project
1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `kitchen-craft-crm`
3. Disable Google Analytics (not needed) → Click **Create project**

#### 5b. Create Firestore Database
1. In Firebase Console → left menu → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** → select a region → **Enable**

#### 5c. Get Your Config Keys
1. Click ⚙️ (gear icon) → **Project settings**
2. Scroll to **"Your apps"** → click **`</>`** (Web app)
3. Register app name as `Kitchen Craft CRM` → click **Register app**
4. You will see a block like this — **copy all the values**:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "kitchen-craft-crm.firebaseapp.com",
     projectId: "kitchen-craft-crm",
     storageBucket: "kitchen-craft-crm.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123...:web:abc..."
   };
   ```

#### 5d. Paste Config into the Project
Open `firebase-config.js` and replace the placeholder values with your real values from step 5c.

> ⚠️ `firebase-config.js` is in `.gitignore` — it will never be pushed to GitHub.
> For the live site, you'll paste the config values directly into the `index.html` Firebase script tag.

---

### Step 6 — Verify CI is Running

1. Go to your GitHub repo → click **"Actions"** tab
2. You should see a workflow named **"CI – Test & Deploy"**
3. Click it to see:
   - ✅ **test** job — runs all 60+ unit tests
   - ✅ **deploy** job — deploys your site to GitHub Pages

Every time you push a change, tests run automatically. The site only deploys if all tests pass.

---

## 🔐 Login Credentials

| User | Username | Password | Access |
|---|---|---|---|
| Vishnu Prakash | `vishnuprakash` | `vishnu@123` | Partner – Full (add, edit, delete) |
| Ramkumar | `ramkumar` | `ram@123` | Partner – Full (add, edit, delete) |
| Store Incharge | `store` | `store@123` | Store Staff – Limited (add, edit only) |

---

## 🧪 Running Tests Locally

After installing Node.js (Step 1):

```powershell
cd "C:\Users\TSP MARKETING\.gemini\antigravity\scratch\kitchen-craft-crm"
npm install
npm test
```

To see detailed coverage report:
```powershell
npm run test:coverage
```

---

## 📁 Project Structure

```
kitchen-craft-crm/
├── index.html              ← Main app HTML
├── style.css               ← All styles
├── app.js                  ← DOM wiring & event handlers
├── utils.js                ← Pure logic (testable, no DOM)
├── firebase-config.js      ← Your Firebase keys (NOT on GitHub)
├── package.json            ← Vitest test setup
├── .gitignore
├── tests/
│   └── utils.test.js       ← 60+ unit tests
└── .github/
    └── workflows/
        └── ci.yml          ← Test + Deploy automation
```

---

## 👥 Attenders

| Name | Badge Colour |
|---|---|
| Sangeetha | 🟠 Orange |
| Kani | 🟡 Yellow |
| Ramkumar | 🔵 Blue |
| Vishnu Prakash | 🟣 Purple |

---

## 📊 Test Coverage Summary

| Area | Tests | Coverage |
|---|---|---|
| Login validation | 11 tests | 100% |
| Customer filtering | 10 tests | 100% |
| Status cycling | 7 tests | 100% |
| Date formatting | 9 tests | 100% |
| Avatar helpers | 5 tests | 100% |
| Attender classes | 6 tests | 100% |
| Access control | 7 tests | 100% |
| HTML escaping | 7 tests | 100% |
| Product tags | 6 tests | 100% |
| Data integrity | 7 tests | 100% |
| **Total** | **75 tests** | **~75% overall** |
