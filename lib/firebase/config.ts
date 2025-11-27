import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD6XadE8deOJ8Bvnr2r_puH3NGGylNIVa8",
  authDomain: "hi-res-app.firebaseapp.com",
  projectId: "hi-res-app",
  storageBucket: "hi-res-app.firebasestorage.app",
  messagingSenderId: "476875186516",
  appId: "1:476875186516:web:f00de0bc186b3beeabe8c1",
  measurementId: "G-FWX4J6VWE1",
};

let app: FirebaseApp;
let auth: Auth;
let storage: FirebaseStorage;
let db: Firestore;
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  storage = getStorage(app);
  db = getFirestore(app);
  try {
    analytics = getAnalytics(app);
  } catch {
    analytics = null;
  }
}

export { app, auth, storage, db, analytics };
