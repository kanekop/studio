import { Person } from '@/shared/types';

export interface IPeopleRepository {
  // Create
  createPerson(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person>;
  
  // Read
  getPersonById(personId: string): Promise<Person | null>;
  getAllPeopleByUser(userId: string): Promise<Person[]>;
  getPeopleByRoster(rosterId: string): Promise<Person[]>;
  
  // Update
  updatePerson(personId: string, updates: Partial<Person>): Promise<void>;
  updatePersonPrimaryFace(personId: string, faceAppearancePath: string): Promise<void>;
  
  // Delete
  deletePerson(personId: string): Promise<void>;
  
  // Batch operations
  batchUpdatePeople(updates: Array<{ id: string; data: Partial<Person> }>): Promise<void>;
  mergePeople(targetPersonId: string, sourcePersonId: string, mergedData: Partial<Person>): Promise<void>;
  
  // Search
  searchPeople(userId: string, query: string): Promise<Person[]>;
  filterPeopleByCompany(userId: string, company: string): Promise<Person[]>;
}