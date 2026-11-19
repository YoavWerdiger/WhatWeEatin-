import { initializeApp, getApps, FirebaseApp, FirebaseError } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  initializeAuth,
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Auth,
  User,
  // @ts-expect-error – available at runtime via react-native condition in package.json exports
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

function isConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isConfigured()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app, 'default');
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: unknown) {
    const code =
      e instanceof FirebaseError
        ? e.code
        : typeof e === 'object' && e !== null && 'code' in e
          ? String((e as { code: unknown }).code)
          : '';
    const msg = e instanceof Error ? e.message : String(e);
    if (
      code === 'auth/already-initialized' ||
      msg.includes('auth/already-initialized') ||
      msg.includes('already-initialized')
    ) {
      auth = getAuth(app);
    } else {
      throw e;
    }
  }
} else {
  console.warn(
    '[Firebase] No config found — running in offline mode. ' +
      'Set EXPO_PUBLIC_FIREBASE_* env vars to enable multiplayer.',
  );
}

export { app, db, auth };
export { isConfigured as isFirebaseConfigured };

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function userToAuthUser(user: User): AuthUser {
  const providerData = user.providerData[0];
  let provider: AuthUser['provider'] = 'anonymous';
  if (providerData?.providerId === 'google.com') provider = 'google';
  else if (providerData?.providerId === 'password') provider = 'email';

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider,
  };
}

// Anonymous
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (error) {
    console.warn('[Firebase] Anonymous sign-in failed:', error);
    return null;
  }
}

// Email / Password
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthUser> {
  if (!auth) throw new Error('Firebase not configured');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return userToAuthUser(cred.user);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  if (!auth) throw new Error('Firebase not configured');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return userToAuthUser(cred.user);
}

// Google (with idToken from expo-auth-session)
export async function signInWithGoogleToken(idToken: string): Promise<AuthUser> {
  if (!auth) throw new Error('Firebase not configured');
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  return userToAuthUser(cred.user);
}

// Sign out
export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

// Listeners
export function onAuthChanged(callback: (user: AuthUser | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user ? userToAuthUser(user) : null);
  });
}

export function getFirebaseUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

export function getCurrentAuthUser(): AuthUser | null {
  const user = auth?.currentUser;
  return user ? userToAuthUser(user) : null;
}
