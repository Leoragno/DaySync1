import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

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

const STORAGE_USER_KEY = 'daysync_auth_user';
const STORAGE_USERS_LIST_KEY = 'daysync_auth_users_list';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(STORAGE_USER_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error('Errore durante il bootstrap auth:', e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const usersRaw = await AsyncStorage.getItem(STORAGE_USERS_LIST_KEY);
      const users = usersRaw ? JSON.parse(usersRaw) : [];

      const foundUser = users.find((u: any) => u.email === email && u.password === password);

      if (!foundUser) {
        throw new Error('Credenziali non valide');
      }

      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        isAnonymous: false
      };

      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (e: any) {
      throw new Error(e.message || 'Errore durante il login');
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      const usersRaw = await AsyncStorage.getItem(STORAGE_USERS_LIST_KEY);
      const users = usersRaw ? JSON.parse(usersRaw) : [];

      if (users.find((u: any) => u.email === email)) {
        throw new Error('Email già registrata');
      }

      const newUser = {
        id: uuid.v4() as string,
        email,
        password,
        name,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      await AsyncStorage.setItem(STORAGE_USERS_LIST_KEY, JSON.stringify(users));

      // Crea categorie di default per il nuovo utente
      const CATEGORIES_KEY = `daysync_db_categories_${newUser.id}`;
      const defaultCategories = [
        { id: uuid.v4() as string, name: 'Lavoro', color: '#3b82f6', _version: 1, _updatedAt: new Date().toISOString(), _updatedBy: newUser.id },
        { id: uuid.v4() as string, name: 'Personale', color: '#10b981', _version: 1, _updatedAt: new Date().toISOString(), _updatedBy: newUser.id },
        { id: uuid.v4() as string, name: 'Studio', color: '#f59e0b', _version: 1, _updatedAt: new Date().toISOString(), _updatedBy: newUser.id },
        { id: uuid.v4() as string, name: 'Urgente', color: '#ef4444', _version: 1, _updatedAt: new Date().toISOString(), _updatedBy: newUser.id },
      ];
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));

      const userData: User = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isAnonymous: false
      };

      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (e: any) {
      throw new Error(e.message || 'Errore durante la registrazione');
    }
  };

  const loginAnonymously = async () => {
    try {
      const userData: User = {
        id: 'anon-' + (uuid.v4() as string),
        email: null,
        name: 'Ospite',
        isAnonymous: true
      };
      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (e: any) {
      throw new Error(e.message || 'Errore durante il login anonimo');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_USER_KEY);
    setUser(null);
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
