import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBc8tmtjZEndUlvUHPdxmjEAvhAXZQNvMM",
  authDomain: "landaisdiscute.firebaseapp.com",
  projectId: "landaisdiscute",
  storageBucket: "landaisdiscute.firebasestorage.app",
  messagingSenderId: "199794213962",
  appId: "1:199794213962:web:06f474cfcf1dfbedaf52b3",
  measurementId: "G-H584GGNHS8"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with Persistence (Performance 2026 Strategy)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

// Initialize Analytics conditionally (only in browser)
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes ? (analytics = getAnalytics(app)) : null);
}

export { app, db, auth, analytics };
