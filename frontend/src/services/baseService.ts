import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  updateDoc
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebaseConfig';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncStatus = 'synced' | 'pending' | 'error' | 'local';

export interface BaseDocument {
  id: string;
  _version: number;
  _updatedAt: any; // Firestore Timestamp or Date
  _syncStatus: SyncStatus;
  _updatedBy: string;
  [key: string]: any;
}

export class BaseService<T extends BaseDocument> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected getSubCollectionPath() {
    const userId = auth?.currentUser?.uid || 'local-guest';
    return `users/${userId}/${this.collectionName}`;
  }

  protected getLocalKey() {
    const userId = auth?.currentUser?.uid || 'local-guest';
    return `@DaySync:${userId}:${this.collectionName}`;
  }

  private async getLocalData(): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(this.getLocalKey());
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading local data:', e);
      return [];
    }
  }

  private async saveLocalData(data: T[]) {
    try {
      await AsyncStorage.setItem(this.getLocalKey(), JSON.stringify(data));
    } catch (e) {
      console.error('Error saving local data:', e);
    }
  }

  async getAll(): Promise<T[]> {
    if (!isFirebaseConfigured || !db || !auth?.currentUser) {
      return this.getLocalData();
    }

    try {
      const path = this.getSubCollectionPath();
      const q = query(collection(db, path), orderBy('_updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const remoteData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as T));

      // Update local cache
      await this.saveLocalData(remoteData);
      return remoteData;
    } catch (error) {
      console.warn(`Firestore getAll failed for ${this.collectionName}, falling back to local:`, error);
      return this.getLocalData();
    }
  }

  async save(data: Partial<T>): Promise<T> {
    const userId = auth?.currentUser?.uid || 'local-guest';
    const id = data.id || (uuid.v4() as string);
    
    let existingLocal = await this.getLocalData();
    const existingIndex = existingLocal.findIndex(item => item.id === id);
    let newVersion = 1;

    if (existingIndex > -1) {
      newVersion = (existingLocal[existingIndex]._version || 0) + 1;
    }

    const finalData: T = {
      ...(data as any),
      id,
      _version: newVersion,
      _updatedAt: isFirebaseConfigured && db ? serverTimestamp() : new Date().toISOString(),
      _syncStatus: isFirebaseConfigured && db ? 'pending' : 'local',
      _updatedBy: userId,
    };

    // Update local immediately
    if (existingIndex > -1) {
      existingLocal[existingIndex] = finalData;
    } else {
      existingLocal.unshift(finalData);
    }
    await this.saveLocalData(existingLocal);

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const path = this.getSubCollectionPath();
        const docRef = doc(db, path, id);
        await setDoc(docRef, finalData);
        return { ...finalData, _syncStatus: 'synced' };
      } catch (error) {
        console.error(`Error saving to Firestore ${this.collectionName}:`, error);
        return { ...finalData, _syncStatus: 'error' };
      }
    }

    return finalData;
  }

  async delete(id: string): Promise<void> {
    let existingLocal = await this.getLocalData();
    existingLocal = existingLocal.filter(item => item.id !== id);
    await this.saveLocalData(existingLocal);

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const path = this.getSubCollectionPath();
        await deleteDoc(doc(db, path, id));
      } catch (error) {
        console.error(`Error deleting from Firestore ${this.collectionName}:`, error);
      }
    }
  }

  async patch(id: string, updates: Partial<T>): Promise<void> {
    let existingLocal = await this.getLocalData();
    const index = existingLocal.findIndex(item => item.id === id);
    
    if (index === -1) return;

    const updatedItem = {
      ...existingLocal[index],
      ...updates,
      _version: (existingLocal[index]._version || 0) + 1,
      _updatedAt: isFirebaseConfigured && db ? serverTimestamp() : new Date().toISOString(),
      _syncStatus: isFirebaseConfigured && db ? 'pending' : 'local'
    };

    existingLocal[index] = updatedItem;
    await this.saveLocalData(existingLocal);

    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        const path = this.getSubCollectionPath();
        const docRef = doc(db, path, id);
        await updateDoc(docRef, {
          ...updates,
          _version: updatedItem._version,
          _updatedAt: updatedItem._updatedAt,
          _syncStatus: 'pending'
        });
      } catch (error) {
        console.error(`Error patching Firestore ${this.collectionName}:`, error);
      }
    }
  }
}
