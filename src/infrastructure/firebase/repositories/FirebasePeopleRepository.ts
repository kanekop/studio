import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/config';
import { IPeopleRepository } from '@/domain/repositories/IPeopleRepository';
import { Person } from '@/shared/types';
import { Person as PersonEntity } from '@/domain/entities';

export class FirebasePeopleRepository implements IPeopleRepository {
  private readonly collectionName = 'people';

  async createPerson(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...person,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const created = await getDoc(docRef);
    return { id: created.id, ...created.data() } as Person;
  }

  async getPersonById(personId: string): Promise<Person | null> {
    const docRef = doc(db, this.collectionName, personId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as Person;
  }

  async getAllPeopleByUser(userId: string): Promise<Person[]> {
    const q = query(
      collection(db, this.collectionName),
      where('addedBy', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Person));
  }

  async getPeopleByRoster(rosterId: string): Promise<Person[]> {
    const q = query(
      collection(db, this.collectionName),
      where('rosterIds', 'array-contains', rosterId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Person));
  }

  async updatePerson(personId: string, updates: Partial<Person>): Promise<void> {
    const docRef = doc(db, this.collectionName, personId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async updatePersonPrimaryFace(personId: string, faceAppearancePath: string): Promise<void> {
    const docRef = doc(db, this.collectionName, personId);
    await updateDoc(docRef, {
      primaryFaceAppearancePath: faceAppearancePath,
      updatedAt: serverTimestamp(),
    });
  }

  async deletePerson(personId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, personId);
    await deleteDoc(docRef);
  }

  async batchUpdatePeople(updates: Array<{ id: string; data: Partial<Person> }>): Promise<void> {
    const batch = writeBatch(db);

    updates.forEach(({ id, data }) => {
      const docRef = doc(db, this.collectionName, id);
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  async mergePeople(targetPersonId: string, sourcePersonId: string, mergedData: Partial<Person>): Promise<void> {
    const batch = writeBatch(db);

    // Update target person with merged data
    const targetRef = doc(db, this.collectionName, targetPersonId);
    batch.update(targetRef, {
      ...mergedData,
      updatedAt: serverTimestamp(),
    });

    // Delete source person
    const sourceRef = doc(db, this.collectionName, sourcePersonId);
    batch.delete(sourceRef);

    await batch.commit();
  }

  async searchPeople(userId: string, searchQuery: string): Promise<Person[]> {
    // Note: Firestore doesn't support full-text search natively
    // For production, consider using Algolia or Elasticsearch
    // For now, we'll fetch all and filter client-side
    const allPeople = await this.getAllPeopleByUser(userId);
    const query = searchQuery.toLowerCase();

    return allPeople.filter(person => {
      const entity = PersonEntity.fromFirestore(person);
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.aiName?.toLowerCase().includes(query) ||
        entity.company?.toLowerCase().includes(query) ||
        entity.notes?.toLowerCase().includes(query)
      );
    });
  }

  async filterPeopleByCompany(userId: string, company: string): Promise<Person[]> {
    const q = query(
      collection(db, this.collectionName),
      where('addedBy', '==', userId),
      where('company', '==', company)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Person));
  }

  // Helper methods for roster management
  async addPersonToRoster(personId: string, rosterId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, personId);
    await updateDoc(docRef, {
      rosterIds: arrayUnion(rosterId),
      updatedAt: serverTimestamp(),
    });
  }

  async removePersonFromRoster(personId: string, rosterId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, personId);
    await updateDoc(docRef, {
      rosterIds: arrayRemove(rosterId),
      updatedAt: serverTimestamp(),
    });
  }
}