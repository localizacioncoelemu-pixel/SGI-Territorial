import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

const env = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Helper to create Firebase Auth user without signing out current session
export async function createFirebaseAuthUser(email: string, pass: string): Promise<string | null> {
  try {
    const apps = getApps();
    let secondaryApp = apps.find(a => a.name === 'SecondaryAdminAuth');
    if (!secondaryApp) {
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryAdminAuth');
    }
    const secondaryAuth = getAuth(secondaryApp);
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    await signOut(secondaryAuth);
    return userCredential.user.uid;
  } catch (err: any) {
    console.warn('createFirebaseAuthUser note:', err?.code || err?.message);
    return null;
  }
}

// Initialize Firestore with specific database ID if provided
const firestoreDbId = env.VITE_FIRESTORE_DATABASE_ID || firebaseConfigData.firestoreDatabaseId;
export const db = firestoreDbId && firestoreDbId !== '(default)'
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously
};
