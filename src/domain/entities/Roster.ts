import { ImageSet, EditablePersonInContext } from '@/shared/types';
import { Timestamp } from 'firebase/firestore';

export class Roster {
  constructor(
    public readonly id: string,
    public ownerId: string,
    public rosterName: string,
    public originalImageStoragePath: string,
    public originalImageSize: { width: number; height: number },
    public peopleIds: string[],
    public createdAt: Timestamp,
    public updatedAt: Timestamp,
    public description?: string,
    public people?: EditablePersonInContext[],
    public tags: string[] = []
  ) {}

  static fromFirestore(data: ImageSet): Roster {
    return new Roster(
      data.id,
      data.ownerId,
      data.rosterName,
      data.originalImageStoragePath,
      data.originalImageSize,
      data.peopleIds,
      data.createdAt as Timestamp,
      data.updatedAt as Timestamp,
      data.description,
      data.people,
      data.tags
    );
  }

  toFirestore(): Omit<ImageSet, 'id'> {
    return {
      ownerId: this.ownerId,
      rosterName: this.rosterName,
      originalImageStoragePath: this.originalImageStoragePath,
      originalImageSize: this.originalImageSize,
      peopleIds: this.peopleIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      description: this.description,
      people: this.people,
      tags: this.tags,
    };
  }

  // Domain logic methods
  hasPeople(): boolean {
    return this.peopleIds.length > 0;
  }

  containsPerson(personId: string): boolean {
    return this.peopleIds.includes(personId);
  }

  addPerson(personId: string): void {
    if (!this.containsPerson(personId)) {
      this.peopleIds.push(personId);
    }
  }

  removePerson(personId: string): void {
    this.peopleIds = this.peopleIds.filter(id => id !== personId);
    
    // Also remove from embedded people if present
    if (this.people) {
      this.people = this.people.filter(p => p.id !== personId);
    }
  }

  getPeopleCount(): number {
    return this.peopleIds.length;
  }

  // Business rule validations
  isValid(): boolean {
    // Must have a name
    if (!this.rosterName || this.rosterName.trim().length === 0) return false;
    
    // Must have valid image path
    if (!this.originalImageStoragePath) return false;
    
    // Must have valid image dimensions
    if (!this.originalImageSize || 
        this.originalImageSize.width <= 0 || 
        this.originalImageSize.height <= 0) return false;
    
    return true;
  }

  canBeDeleted(): boolean {
    // In the future, we might add business rules here
    // For now, any roster can be deleted
    return true;
  }

  // Helper methods
  getImageAspectRatio(): number {
    return this.originalImageSize.width / this.originalImageSize.height;
  }

  isPortrait(): boolean {
    return this.getImageAspectRatio() < 1;
  }

  isLandscape(): boolean {
    return this.getImageAspectRatio() > 1;
  }

  getEmbeddedPerson(personId: string): EditablePersonInContext | null {
    if (!this.people) return null;
    return this.people.find(p => p.id === personId) || null;
  }

  updateEmbeddedPerson(personId: string, updates: Partial<EditablePersonInContext>): boolean {
    if (!this.people) return false;
    
    const index = this.people.findIndex(p => p.id === personId);
    if (index === -1) return false;
    
    this.people[index] = { ...this.people[index], ...updates };
    return true;
  }
}