import { initializeApp, getApps, getApp } from 'firebase/app';
// 1. MUST BE IMPORTED HERE:
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app, 'unsmokelife-program');

// 2. MUST BE EXPORTED HERE:
export { auth, db, signInWithEmailAndPassword, signOut };