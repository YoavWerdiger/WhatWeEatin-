import { create } from 'zustand';
import { AuthUser } from '../types';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogleToken,
  signOut as firebaseSignOut,
  onAuthChanged,
  ensureAnonymousAuth,
  isFirebaseConfigured,
} from '../services/firebase';
import { t } from '../i18n/t';
import type { MessageKey } from '../i18n/messages';

type AuthErrorContext = 'email' | 'google' | 'register';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  init: () => () => void;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  init: () => {
    if (!isFirebaseConfigured()) {
      set({ isInitialized: true, isLoading: false });
      return () => {};
    }

    set({ isLoading: true });

    const unsubscribe = onAuthChanged((authUser) => {
      set({
        user: authUser,
        isLoading: false,
        isInitialized: true,
      });
    });

    return unsubscribe;
  },

  registerWithEmail: async (email, password, name) => {
    if (!email.trim() || !password || !name.trim()) {
      set({ error: t('auth.errorEmptyFields'), isLoading: false });
      throw new Error('auth/empty-fields');
    }
    set({ isLoading: true, error: null });
    try {
      const user = await signUpWithEmail(email, password, name);
      set({ user, isLoading: false });
    } catch (err: unknown) {
      set({ error: translateFirebaseError(err, 'register'), isLoading: false });
      throw err;
    }
  },

  loginWithEmail: async (email, password) => {
    if (!email.trim() || !password) {
      set({ error: t('auth.errorEmptyFields'), isLoading: false });
      throw new Error('auth/empty-fields');
    }
    set({ isLoading: true, error: null });
    try {
      const user = await signInWithEmail(email, password);
      set({ user, isLoading: false });
    } catch (err: unknown) {
      set({ error: translateFirebaseError(err, 'email'), isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async (idToken) => {
    if (!idToken) {
      set({ error: t('auth.errorGoogleCredential'), isLoading: false });
      throw new Error('auth/missing-id-token');
    }
    set({ isLoading: true, error: null });
    try {
      const user = await signInWithGoogleToken(idToken);
      set({ user, isLoading: false });
    } catch (err: unknown) {
      set({ error: translateFirebaseError(err, 'google'), isLoading: false });
      throw err;
    }
  },

  loginAnonymously: async () => {
    set({ isLoading: true, error: null });
    try {
      const fbUser = await ensureAnonymousAuth();
      if (fbUser) {
        set({
          user: {
            uid: fbUser.uid,
            email: null,
            displayName: null,
            photoURL: null,
            provider: 'anonymous',
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.errorGeneric');
      set({ error: msg, isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await firebaseSignOut();
      set({ user: null, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

function getFirebaseAuthCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string' && code.startsWith('auth/')) return code;
  }
  const message = err instanceof Error ? err.message : String(err ?? '');
  const match = message.match(/auth\/[\w-]+/);
  return match ? match[0] : '';
}

function translateFirebaseError(err: unknown, context: AuthErrorContext): string {
  const code = getFirebaseAuthCode(err);
  const message = err instanceof Error ? err.message : String(err ?? '');

  const byCode: Partial<Record<string, MessageKey>> = {
    'auth/operation-not-allowed': 'auth.errorOperationNotAllowed',
    'auth/email-already-in-use': 'auth.errorEmailInUse',
    'auth/invalid-email': 'auth.errorInvalidEmail',
    'auth/weak-password': 'auth.errorWeakPassword',
    'auth/user-not-found': 'auth.errorUserNotFound',
    'auth/wrong-password': 'auth.errorWrongPassword',
    'auth/too-many-requests': 'auth.errorTooManyRequests',
    'auth/network-request-failed': 'auth.errorNetwork',
    'auth/account-exists-with-different-credential':
      'auth.errorAccountExistsDifferent',
    'auth/user-disabled': 'auth.errorUserDisabled',
  };

  if (code === 'auth/invalid-credential') {
    return t(
      context === 'google'
        ? 'auth.errorGoogleCredential'
        : 'auth.errorInvalidCredential',
    );
  }

  const key = byCode[code];
  if (key) return t(key);

  if (context === 'google') return t('auth.errorGoogleFailed');
  if (context === 'register') return message || t('auth.errorGeneric');
  return message || t('auth.errorGeneric');
}
