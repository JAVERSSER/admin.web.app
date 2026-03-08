# 🍔 FoodDash Admin Panel

A full-featured food delivery admin panel built with:
- **React 18** — Component-based UI
- **Tailwind CSS** — Utility-first styling
- **Firebase** — Auth, Firestore, Storage, Realtime DB
- **Vite** — Fast development server

---

## 📁 Project Structure

```
food-admin/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx        ← Firebase Auth + login state
│   ├── services/
│   │   ├── firebase.js            ← Firebase app init (ADD YOUR CONFIG HERE)
│   │   └── firestoreService.js    ← All Firestore read/write functions
│   ├── components/
│   │   ├── UI.jsx                 ← Reusable: Button, Modal, Input, Toggle, etc.
│   │   └── Layout.jsx             ← Sidebar + Topbar layout
│   ├── pages/
│   │   ├── LoginPage.jsx          ← Login + forgot password form
│   │   ├── DashboardPage.jsx      ← KPIs, charts, live orders
│   │   ├── OrdersPage.jsx         ← Kanban + table view, order detail modal
│   │   ├── MenuPage.jsx           ← Menu CRUD with add/edit/delete modals
│   │   ├── RidersPage.jsx         ← Rider management, approve/suspend
│   │   ├── CustomersPage.jsx      ← Customer list, block/unblock
│   │   ├── ReportsPage.jsx        ← Sales, orders, delivery, customer reports
│   │   └── OtherPages.jsx         ← Promotions, Logs, History, Settings
│   ├── utils/
│   │   └── mockData.js            ← Demo data (replace with Firebase)
│   ├── App.jsx                    ← Root: state management + page routing
│   ├── main.jsx                   ← App entry point
│   └── index.css                  ← Tailwind imports + custom CSS
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

---

## 🚀 Setup Instructions

### 1. Install dependencies

```bash
cd food-admin
npm install
```

### 2. Configure Firebase

Edit `src/services/firebase.js` and replace the config:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 3. Start development server

```bash
npm run dev
```

Open: http://localhost:3000

### 4. Enable Firebase listeners

In `src/App.jsx`, uncomment the `useEffect` block to connect real Firebase data.

---

## 🔥 Firebase Collections Required

| Collection      | Description                          |
|----------------|--------------------------------------|
| `admins`       | Admin user profiles + roles          |
| `orders`       | All food orders                      |
| `orderTimeline`| Status change log per order          |
| `menuItems`    | Food menu items                      |
| `categories`   | Menu categories                      |
| `riders`       | Delivery rider profiles              |
| `users`        | Customer profiles                    |
| `promoCodes`   | Discount codes                       |
| `activityLogs` | Admin action audit trail             |
| `settings`     | Shop configuration                   |
| `reports`      | Auto-generated daily summaries       |
| `riderLocations`| Live GPS (Firebase Realtime DB)     |

---

## 📱 Related Apps (same Firebase project)

| App              | Stack                          |
|-----------------|-------------------------------|
| Customer App     | React Native + Firebase       |
| Rider/Driver App | React Native + Firebase       |
| Admin Panel      | React JS + Tailwind (this)    |

---

## 🛡️ Firebase Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admins can read/write everything
    match /{document=**} {
      allow read, write: if request.auth != null
        && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['owner', 'manager'];
    }

    // Customers can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Orders — customers create, admins manage
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null;
    }

    // Menu items are public read
    match /menuItems/{itemId} {
      allow read: if true;
    }
  }
}
```

---

## 🚀 Deploy to Firebase Hosting

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## ✅ Features

- 🔐 Login / forgot password with Firebase Auth
- 📊 Live dashboard with KPIs + charts
- 📦 Orders: Kanban + Table view, status flow, rider assignment
- 🍔 Menu: Add/Edit/Delete/Toggle availability
- 🛵 Riders: Approve, suspend, reactivate
- 👥 Customers: Block/unblock, export CSV
- 📈 Reports: Sales, Orders, Delivery, Customers + export
- 🏷️ Promotions: Create/delete promo codes with usage tracking
- 📋 Logs: Filtered activity audit log
- 🕐 History: Full searchable/filterable order history
- ⚙️ Settings: Shop profile, pricing, hours, admin users
- 🔔 Notifications panel with badge
- 🍞 Toast notifications on all actions
- 📱 All buttons fully working with state updates