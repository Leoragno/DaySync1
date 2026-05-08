import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface BaseDocument {
  id: string;
  _version: number;
  _updatedAt: string; // ISO Date String
  _syncStatus: SyncStatus;
  _updatedBy: string;
  [key: string]: any;
}

// User mock for the current context (simulating auth user)
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const savedUser = await AsyncStorage.getItem('daysync_auth_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      return user.id;
    }
  } catch (e) {}
  return null;
};

export class BaseService<T extends BaseDocument> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected async getStorageKey() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utente non autenticato');
    return `daysync_db_${this.collectionName}_${userId}`;
  }

  async getAll(): Promise<T[]> {
    try {
      const key = await this.getStorageKey();
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const data = JSON.parse(raw) as T[];
      // Return sorted by updated_at desc (most recent first)
      return data.sort((a, b) => b._updatedAt.localeCompare(a._updatedAt));
    } catch (error) {
      console.error(`Error fetching all from ${this.collectionName}:`, error);
      return [];
    }
  }

  async save(data: Partial<T>): Promise<T> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utente non autenticato');

    const key = await this.getStorageKey();
    const raw = await AsyncStorage.getItem(key);
    const allData = raw ? (JSON.parse(raw) as T[]) : [];

    const id = data.id || (uuid.v4() as string);
    const existingIndex = allData.findIndex((item) => item.id === id);
    
    let newVersion = 1;
    if (existingIndex > -1) {
      newVersion = (allData[existingIndex]._version || 0) + 1;
    }

    const finalData: T = {
      ...(data as any),
      id,
      _version: newVersion,
      _updatedAt: new Date().toISOString(),
      _syncStatus: 'synced', // Locally everything is synced
      _updatedBy: userId,
    };

    if (existingIndex > -1) {
      allData[existingIndex] = finalData;
    } else {
      allData.push(finalData);
    }

    try {
      await AsyncStorage.setItem(key, JSON.stringify(allData));
      return finalData;
    } catch (error) {
      console.error(`Error saving to ${this.collectionName}:`, error);
      return { ...finalData, _syncStatus: 'error' };
    }
  }

  async delete(id: string): Promise<void> {
    const key = await this.getStorageKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    let allData = JSON.parse(raw) as T[];
    allData = allData.filter((item) => item.id !== id);

    await AsyncStorage.setItem(key, JSON.stringify(allData));
  }

  async patch(id: string, updates: Partial<T>): Promise<void> {
    const key = await this.getStorageKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    const allData = JSON.parse(raw) as T[];
    const index = allData.findIndex((item) => item.id === id);
    
    if (index > -1) {
      allData[index] = {
        ...allData[index],
        ...updates,
        _version: (allData[index]._version || 0) + 1,
        _updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(allData));
    }
  }
}
