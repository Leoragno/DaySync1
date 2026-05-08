import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInAnonymously,
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export type User = { id: string; email: string | null; name?: string; isAnonymous: boolean };

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserProfile = useCallback(async (fbUser: FirebaseUser) => {
    try {
      console.log('[Auth] Ensuring user profile for:', fbUser.uid);
      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);

      const payload: Record<string, unknown> = {
        uid: fbUser.uid,
        email: fbUser.email ?? null,
        displayName: fbUser.displayName ?? null,
        isAnonymous: fbUser.isAnonymous,
        lastLoginAt: serverTimestamp(),
      };

      if (!userSnap.exists()) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(
        userRef,
        payload,
        { merge: true }
      );
      console.log('[Auth] User profile ensured');
    } catch (e) {
      console.error('[Auth] Errore assicurazione profilo:', e);
      // Non blocchiamo l'auth se Firestore fallisce (es. offline e cache vuota)
    }
  }, []);

  useEffect(() => {
    console.log('[Auth] Initializing onAuthStateChanged');
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          console.log('[Auth] User detected:', fbUser.uid);
          // Eseguiamo il bootstrap del profilo in background per non bloccare il caricamento iniziale
          ensureUserProfile(fbUser);
          setUser({
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || undefined,
            isAnonymous: fbUser.isAnonymous,
          });
        } else {
          console.log('[Auth] No user detected');
          setUser(null);
        }
      } catch (e) {
        console.error('[Auth] Errore durante il bootstrap profilo utente:', e);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('[Auth] Loading state set to false');
      }
    });

    return () => {
      console.log('[Auth] Unsubscribing from auth state changes');
      unsubscribe();
    };
  }, [ensureUserProfile]);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      throw new Error(e.message || 'Errore durante il login');
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(fbUser, { displayName: name });
      }
    } catch (e: any) {
      throw new Error(e.message || 'Errore durante la registrazione');
    }
  };

  const loginAnonymously = async () => {
    try {
      await signInAnonymously(auth);
    } catch (e: any) {
      throw new Error(e.message || 'Errore durante il login anonimo');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, loginAnonymously }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
