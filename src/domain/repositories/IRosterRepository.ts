import { ImageSet, Region } from '@/shared/types';

export interface IRosterRepository {
  // Create
  createRoster(roster: Omit<ImageSet, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImageSet>;
  
  // Read
  getRosterById(rosterId: string): Promise<ImageSet | null>;
  getAllRostersByUser(userId: string): Promise<ImageSet[]>;
  getRostersContainingPerson(personId: string): Promise<ImageSet[]>;
  
  // Update
  updateRoster(rosterId: string, updates: Partial<ImageSet>): Promise<void>;
  addPersonToRoster(rosterId: string, personId: string): Promise<void>;
  removePersonFromRoster(rosterId: string, personId: string): Promise<void>;
  
  // Delete
  deleteRoster(rosterId: string): Promise<void>;
  
  // Image operations
  uploadRosterImage(userId: string, file: File): Promise<{ storagePath: string; downloadUrl: string }>;
  extractFaceRegion(imageDataUrl: string, region: Region): Promise<{ dataUrl: string; blob: Blob }>;
  uploadFaceImage(userId: string, blob: Blob, personId: string): Promise<{ storagePath: string; downloadUrl: string }>;
  
  // Batch operations
  batchAddPeopleToRoster(rosterId: string, peopleIds: string[]): Promise<void>;
}