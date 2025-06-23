import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db as firestore, storage } from '../config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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

  async getRosterById(rosterId: string): Promise<ImageSet | null> {
    try {
      const docRef = doc(this.rostersCollection, rosterId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return { id: docSnap.id, ...docSnap.data() } as ImageSet;
    } catch (error) {
      console.error("FirebaseRosterRepository: Error getting roster by ID.", {
        error,
        rosterId,
      });
      throw new Error('Failed to get roster from Firestore.');
    }
  }

  async getAllRostersByUser(userId: string): Promise<ImageSet[]> {
    try {
      const q = query(
        this.rostersCollection,
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const rosters: ImageSet[] = [];
      
      querySnapshot.forEach((doc) => {
        rosters.push({ id: doc.id, ...doc.data() } as ImageSet);
      });
      
      return rosters;
    } catch (error) {
      console.error("FirebaseRosterRepository: Error getting rosters by user.", {
        error,
        userId,
      });
      throw new Error('Failed to get rosters from Firestore.');
    }
  }

  async updateRoster(rosterId: string, updates: Partial<Omit<ImageSet, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const docRef = doc(this.rostersCollection, rosterId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("FirebaseRosterRepository: Error updating roster.", {
        error,
        rosterId,
      });
      throw new Error('Failed to update roster in Firestore.');
    }
  }
  
  async updateRosterAndReturn(rosterId: string, updates: Partial<Omit<ImageSet, 'id' | 'createdAt'>>): Promise<ImageSet> {
    try {
      const docRef = doc(this.rostersCollection, rosterId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(docRef, updateData);
      
      // Fetch and return the updated roster
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error('Roster not found after update');
      }
      
      return { id: updatedDoc.id, ...updatedDoc.data() } as ImageSet;
    } catch (error) {
      console.error("FirebaseRosterRepository: Error updating roster.", {
        error,
        rosterId,
      });
      throw new Error('Failed to update roster in Firestore.');
    }
  }

  async deleteRoster(rosterId: string): Promise<void> {
    try {
      const docRef = doc(this.rostersCollection, rosterId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("FirebaseRosterRepository: Error deleting roster.", {
        error,
        rosterId,
      });
      throw new Error('Failed to delete roster from Firestore.');
    }
  }

  async uploadThumbnail(userId: string, rosterId: string, thumbnailBlob: Blob): Promise<string> {
    try {
      const thumbnailPath = `users/${userId}/rosters/${rosterId}/thumbnail.webp`;
      const storageRef = ref(storage, thumbnailPath);
      
      await uploadBytes(storageRef, thumbnailBlob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update the roster with thumbnail URL
      await this.updateRoster(rosterId, { thumbnailUrl: downloadURL });
      
      return downloadURL;
    } catch (error) {
      console.error("FirebaseRosterRepository: Error uploading thumbnail.", {
        error,
        userId,
        rosterId,
      });
      throw new Error('Failed to upload thumbnail to storage.');
    }
  }
} 