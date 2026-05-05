# ProConnect Sports 🏆

A cross-platform mobile application built with **React Native (Expo)** that connects amateur and professional sports players across Pakistan. Players can create matches, find games near them, join open slots, and compete on leaderboards — all in one place.

---

## 📱 Screenshots

> Add screenshots of your app here after building

---

## 🚀 Features

### Authentication & Security
- Email + password registration with **CNIC verification**
- Firebase Authentication for secure login/logout
- Guest mode — browse matches without registering
- Role-based access control: **Admin**, **Player**, **Guest**

### Matchmaking Dashboard
- Browse open match slots filtered by sport
- Create a match with sport, location, date, time, and player slots
- Join matches in real-time — slots update instantly
- Match status: Open / Filling Fast / Full
- Supported sports: Cricket, Football, Futsal, Badminton, Padel, Squash, Basketball, Table Tennis

### Notifications
- In-app notifications for match confirmations and cancellations
- Badge-based alerts — get notified when a match for your sport is posted nearby

### Leaderboard
- Top players ranked by matches played
- Guest scores not recorded — registered players only

### Admin Panel
- View all matches and users
- Delete inappropriate matches
- Ban / unban users
- Platform moderation dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile Framework | React Native (Expo) |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Backend / Database | Firebase Firestore |
| Authentication | Firebase Auth (Email/Password) |
| Push Notifications | Expo Notifications + Firebase Cloud Messaging |
| State Management | React Hooks (useState, useEffect) |
| Storage | AsyncStorage |

---

## 📁 Project Structure

```
ProConnectSports/
├── App.js                        # Navigation setup
├── firebase.js                   # Firebase config & initialization
├── screens/
│   ├── SplashScreen.js           # Landing screen
│   ├── LoginScreen.js            # Login with Firebase Auth
│   ├── RegisterScreen.js         # Register with CNIC + sport selection
│   ├── HomeScreen.js             # Match feed with filters
│   ├── CreateMatchScreen.js      # Create and post a match
│   ├── LeaderboardScreen.js      # Player rankings
│   ├── ProfileScreen.js          # User profile and stats
│   └── AdminScreen.js            # Admin moderation panel
└── components/
    ├── MatchCard.js              # Reusable match card component
    └── SportFilter.js            # Sport filter pill component
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (LTS)
- Expo CLI
- Expo Go app on your phone (Android / iOS)
- Firebase account

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/your-username/ProConnectSports.git
cd ProConnectSports
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**

Create a `firebase.js` file in the root with your Firebase config:
```js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
```

4. **Start the development server**
```bash
npx expo start --clear
```

5. **Run on your phone**

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Make sure your phone and laptop are on the same WiFi network.

---

## 🗃️ Firebase Setup

1. Go to [firebase.google.com](https://firebase.google.com) and create a project
2. Enable **Authentication** → Email/Password
3. Create a **Firestore Database** in test mode
4. Register a Web App and copy the config into `firebase.js`

### Firestore Collections

| Collection | Description |
|---|---|
| `users` | Stores user profiles — name, CNIC, city, sports, role, ban status |
| `matches` | Stores all matches — sport, location, time, slots, status |

---

## 👥 Team

| Name | CMS | Role |
|---|---|---|
| Muhammad Ali Usman | 454389 | Developer |
| Syed M Abdullah Rashid | 467072 | Team Member |
| Fahad Abbass | 469120 | Team Member |
| Noor Fatima | 454751 | Team Member |

**Group:** 04 | **Class:** BSCS-13B  
**Course:** Software Engineering (SE-200)  
**Instructor:** Dr. Gibrail Islam  
**University:** NUST — School of Electrical Engineering and Computer Sciences

---

## 📋 Development Process

This project follows **Agile Scrum** methodology with two MVPs:

### MVP 1 — Core Features
- Auth flow (register, login, guest)
- Match feed with sport filtering
- Create and join matches
- Leaderboard and profile screens

### MVP 2 — Backend & Admin
- Firebase real-time database integration
- Real authentication with CNIC verification
- Admin panel with moderation tools
- Push notifications
- Persistent data across sessions

---

## 📄 License

This project was built as a course project for SE-200 at NUST SEECS.
