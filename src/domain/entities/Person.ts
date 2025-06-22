import { Person as PersonType, FaceAppearance } from '@/shared/types';
import { Timestamp } from 'firebase/firestore';

export class Person {
  constructor(
    public readonly id: string,
    public name: string,
    public addedBy: string,
    public rosterIds: string[],
    public faceAppearances: FaceAppearance[],
    public createdAt: Timestamp,
    public updatedAt: Timestamp,
    public aiName?: string,
    public notes?: string,
    public primaryFaceAppearancePath?: string | null,
    public profileImagePath?: string,
    public company?: string,
    public hobbies?: string,
    public birthday?: string,
    public age?: number,
    public firstMet?: string,
    public firstMetContext?: string
  ) {}

  static fromFirestore(data: PersonType): Person {
    return new Person(
      data.id,
      data.name,
      data.addedBy,
      data.rosterIds,
      data.faceAppearances,
      data.createdAt as Timestamp,
      data.updatedAt as Timestamp,
      data.aiName,
      data.notes,
      data.primaryFaceAppearancePath,
      data.profileImagePath,
      data.company,
      data.hobbies,
      data.birthday,
      data.age,
      data.firstMet,
      data.firstMetContext
    );
  }

  toFirestore(): Omit<PersonType, 'id'> {
    return {
      name: this.name,
      addedBy: this.addedBy,
      rosterIds: this.rosterIds,
      faceAppearances: this.faceAppearances,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      aiName: this.aiName,
      notes: this.notes,
      primaryFaceAppearancePath: this.primaryFaceAppearancePath,
      profileImagePath: this.profileImagePath,
      company: this.company,
      hobbies: this.hobbies,
      birthday: this.birthday,
      age: this.age,
      firstMet: this.firstMet,
      firstMetContext: this.firstMetContext,
    };
  }

  // Domain logic methods
  hasFaceAppearances(): boolean {
    return this.faceAppearances.length > 0;
  }

  getPrimaryFaceAppearance(): FaceAppearance | null {
    if (!this.primaryFaceAppearancePath) return null;
    
    return this.faceAppearances.find(
      appearance => appearance.faceImageStoragePath === this.primaryFaceAppearancePath
    ) || null;
  }

  getFaceAppearanceInRoster(rosterId: string): FaceAppearance | null {
    return this.faceAppearances.find(
      appearance => appearance.rosterId === rosterId
    ) || null;
  }

  belongsToRoster(rosterId: string): boolean {
    return this.rosterIds.includes(rosterId);
  }

  addToRoster(rosterId: string): void {
    if (!this.belongsToRoster(rosterId)) {
      this.rosterIds.push(rosterId);
    }
  }

  removeFromRoster(rosterId: string): void {
    this.rosterIds = this.rosterIds.filter(id => id !== rosterId);
  }

  addFaceAppearance(appearance: FaceAppearance): void {
    // Check if appearance already exists
    const exists = this.faceAppearances.some(
      existing => existing.id === appearance.id
    );
    
    if (!exists) {
      this.faceAppearances.push(appearance);
      
      // If this is the first appearance and no primary is set, make it primary
      if (this.faceAppearances.length === 1 && !this.primaryFaceAppearancePath) {
        this.primaryFaceAppearancePath = appearance.faceImageStoragePath;
      }
    }
  }

  setPrimaryFaceAppearance(appearancePath: string): boolean {
    const appearance = this.faceAppearances.find(
      app => app.faceImageStoragePath === appearancePath
    );
    
    if (appearance) {
      this.primaryFaceAppearancePath = appearancePath;
      return true;
    }
    
    return false;
  }

  // Business rule validations
  canBeMergedWith(other: Person): boolean {
    // Cannot merge with self
    if (this.id === other.id) return false;
    
    // Must be from same user
    if (this.addedBy !== other.addedBy) return false;
    
    return true;
  }

  mergeWith(other: Person, fieldChoices: Record<string, 'keep' | 'replace'>): void {
    // Merge basic fields based on choices
    if (fieldChoices.name === 'replace') this.name = other.name;
    if (fieldChoices.company === 'replace') this.company = other.company;
    if (fieldChoices.hobbies === 'replace') this.hobbies = other.hobbies;
    if (fieldChoices.birthday === 'replace') this.birthday = other.birthday;
    if (fieldChoices.firstMet === 'replace') this.firstMet = other.firstMet;
    if (fieldChoices.firstMetContext === 'replace') this.firstMetContext = other.firstMetContext;
    
    // Merge notes (concatenate)
    if (other.notes) {
      this.notes = this.notes 
        ? `${this.notes}\n\n--- Merged from ${other.name} ---\n${other.notes}`
        : other.notes;
    }
    
    // Merge roster IDs
    const uniqueRosterIds = new Set([...this.rosterIds, ...other.rosterIds]);
    this.rosterIds = Array.from(uniqueRosterIds);
    
    // Merge face appearances
    other.faceAppearances.forEach(appearance => {
      this.addFaceAppearance(appearance);
    });
  }
}