import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db as firestore } from '../config';
import { IRosterRepository } from '@/domain/repositories/IRosterRepository';
import { ImageSet, Region } from '@/shared/types';

// This is a partial implementation focusing on createRoster for now.
export class FirebaseRosterRepository implements Partial<IRosterRepository> {
  private rostersCollection = collection(firestore, 'rosters');

  async createRoster(rosterData: Omit<ImageSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImageSet> {
    try {
      const docData = {
        ...rosterData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(this.rostersCollection, docData);
      
      // Firestore does not return the full object on creation, so we fetch it.
      const newDoc = await getDoc(docRef);
      const newRoster = { id: newDoc.id, ...newDoc.data() } as ImageSet;
      
      return newRoster;

    } catch (error) {
      console.error("FirebaseRosterRepository: Error creating roster.", {
        error,
      });
      throw new Error('Failed to create roster in Firestore.');
    }
  }
} 