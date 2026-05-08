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
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebaseConfig';
import uuid from 'react-native-uuid';

export type SyncStatus = 'synced' | 'pending' | 'error';

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
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Utente non autenticato');
    return `users/${userId}/${this.collectionName}`;
  }

  async getAll(): Promise<T[]> {
    const path = this.getSubCollectionPath();
    const q = query(collection(db, path), orderBy('_updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as T));
  }

  async save(data: Partial<T>): Promise<T> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Utente non autenticato');

    const id = data.id || (uuid.v4() as string);
    const path = this.getSubCollectionPath();
    const docRef = doc(db, path, id);

    // Fetch existing for versioning and conflict resolution
    const existingSnap = await getDoc(docRef);
    let newVersion = 1;
    
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as T;
      // Basic Conflict Resolution: Last-Write-Wins with Version check
      newVersion = (existingData._version || 0) + 1;
    }

    const finalData: T = {
      ...(data as any),
      id,
      _version: newVersion,
      _updatedAt: serverTimestamp(),
      _syncStatus: 'pending', // Set to pending initially
      _updatedBy: userId,
    };

    try {
      await setDoc(docRef, finalData);
      // Once written to Firestore (even if offline, it returns success)
      // Firestore handles the actual sync in background
      return { ...finalData, _syncStatus: 'synced' }; 
    } catch (error) {
      console.error(`Error saving to ${this.collectionName}:`, error);
      return { ...finalData, _syncStatus: 'error' };
    }
  }

  async delete(id: string): Promise<void> {
    const path = this.getSubCollectionPath();
    await deleteDoc(doc(db, path, id));
  }

  // Helper per aggiornamento parziale
  async patch(id: string, updates: Partial<T>): Promise<void> {
    const path = this.getSubCollectionPath();
    const docRef = doc(db, path, id);
    
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.data() as T;
    
    await updateDoc(docRef, {
      ...updates,
      _version: (existingData?._version || 0) + 1,
      _updatedAt: serverTimestamp(),
      _syncStatus: 'pending'
    });
  }
}
