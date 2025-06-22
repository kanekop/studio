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
  DocumentData
} from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/config';
import { Person } from '@/shared/types';

export interface CreatePersonData {
  name: string;
  company?: string;
  hobbies?: string;
  birthday?: string;
  firstMet?: string;
  firstMetContext?: string;
  notes?: string;
  userId: string;
  primaryFaceAppearancePath?: string | null;
  faceAppearances?: any[];
}

export interface UpdatePersonData {
  name?: string;
  company?: string;
  hobbies?: string;
  birthday?: string;
  firstMet?: string;
  firstMetContext?: string;
  notes?: string;
  primaryFaceAppearancePath?: string | null;
}

export class PeopleService {
  static async createPerson(data: CreatePersonData): Promise<Person> {
    const personData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'people'), personData);
    
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      addedBy: 'web',
      rosterIds: []
    } as Person;
  }
  
  static async updatePerson(id: string, data: UpdatePersonData): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });
    
    await updateDoc(doc(db, 'people', id), updateData);
  }
  
  static async deletePerson(id: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Delete the person
    batch.delete(doc(db, 'people', id));
    
    // Find and delete all connections involving this person
    const connectionsQuery1 = query(
      collection(db, 'connections'),
      where('fromPersonId', '==', id)
    );
    const connectionsQuery2 = query(
      collection(db, 'connections'),
      where('toPersonId', '==', id)
    );
    
    const [connections1, connections2] = await Promise.all([
      getDocs(connectionsQuery1),
      getDocs(connectionsQuery2)
    ]);
    
    // Add all connection deletions to the batch
    connections1.docs.forEach(doc => batch.delete(doc.ref));
    connections2.docs.forEach(doc => batch.delete(doc.ref));
    
    // Commit all deletions at once
    await batch.commit();
  }
  
  static async getPerson(id: string): Promise<Person | null> {
    const docSnap = await getDoc(doc(db, 'people', id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Person;
    }
    return null;
  }
  
  static async getAllPeople(userId: string): Promise<Person[]> {
    const peopleQuery = query(
      collection(db, 'people'),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(peopleQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Person;
    });
  }
  
  static async getConnectionCount(personId: string): Promise<number> {
    const [connections1, connections2] = await Promise.all([
      getDocs(query(collection(db, 'connections'), where('fromPersonId', '==', personId))),
      getDocs(query(collection(db, 'connections'), where('toPersonId', '==', personId)))
    ]);
    
    return connections1.size + connections2.size;
  }
}