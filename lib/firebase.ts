import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
const storage = getStorage(app);

export { app, auth, db, storage };
