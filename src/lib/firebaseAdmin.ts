import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const formatPrivateKey = (key?: string) => {
  if (!key) {
    console.error("❌ FIREBASE_PRIVATE_KEY is undefined in .env.local");
    return undefined;
  }
  let cleanedKey = key.replace(/^"|"$/g, '');
  cleanedKey = cleanedKey.replace(/^'|'$/g, '');
  cleanedKey = cleanedKey.replace(/\\n/g, '\n');
  return cleanedKey;
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    });
    console.log('🚀 Firebase Admin initialized successfully!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Firebase Admin initialization error:', error.message);
    } else {
      console.error('❌ Firebase Admin initialization error:', error);
    }
  }
}

// 🎯 THE MAGIC LINE: Tell Firestore to use your specific named database
export const adminDb = getFirestore(admin.app(), 'unsmokelife-program');

// Auth remains the same since it's project-wide
export const adminAuth = admin.auth();