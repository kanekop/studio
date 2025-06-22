import { Connection as ConnectionType } from '@/shared/types';
import { Timestamp } from 'firebase/firestore';

export class Connection {
  constructor(
    public readonly id: string,
    public fromPersonId: string,
    public toPersonId: string,
    public types: string[],
    public reasons: string[],
    public createdAt: Timestamp,
    public updatedAt: Timestamp,
    public strength?: number | null,
    public notes?: string
  ) {}

  static fromFirestore(data: ConnectionType): Connection {
    return new Connection(
      data.id,
      data.fromPersonId,
      data.toPersonId,
      data.types,
      data.reasons,
      data.createdAt as Timestamp,
      data.updatedAt as Timestamp,
      data.strength,
      data.notes
    );
  }

  toFirestore(): Omit<ConnectionType, 'id'> {
    return {
      fromPersonId: this.fromPersonId,
      toPersonId: this.toPersonId,
      types: this.types,
      reasons: this.reasons,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      strength: this.strength,
      notes: this.notes,
    };
  }

  // Domain logic methods
  involvePerson(personId: string): boolean {
    return this.fromPersonId === personId || this.toPersonId === personId;
  }

  getOtherPersonId(personId: string): string | null {
    if (this.fromPersonId === personId) return this.toPersonId;
    if (this.toPersonId === personId) return this.fromPersonId;
    return null;
  }

  hasType(type: string): boolean {
    return this.types.includes(type);
  }

  addType(type: string): void {
    if (!this.hasType(type)) {
      this.types.push(type);
    }
  }

  removeType(type: string): void {
    this.types = this.types.filter(t => t !== type);
  }

  hasReason(reason: string): boolean {
    return this.reasons.includes(reason);
  }

  addReason(reason: string): void {
    if (!this.hasReason(reason)) {
      this.reasons.push(reason);
    }
  }

  // Business rule validations
  isValid(): boolean {
    // Must have at least one type
    if (this.types.length === 0) return false;
    
    // Cannot connect person to themselves
    if (this.fromPersonId === this.toPersonId) return false;
    
    // Strength must be between 1-5 if provided
    if (this.strength !== null && this.strength !== undefined) {
      if (this.strength < 1 || this.strength > 5) return false;
    }
    
    return true;
  }

  isBidirectional(): boolean {
    // Most connection types are bidirectional by nature
    const unidirectionalTypes = ['manager', 'reports_to', 'mentor', 'mentee', 'parent', 'child'];
    return !this.types.some(type => unidirectionalTypes.includes(type));
  }

  getConnectionStrength(): 'strong' | 'medium' | 'weak' {
    if (!this.strength) return 'medium';
    if (this.strength >= 4) return 'strong';
    if (this.strength >= 2) return 'medium';
    return 'weak';
  }

  // Category helpers
  isFamilyConnection(): boolean {
    const familyTypes = ['spouse', 'partner', 'family_member', 'parent', 'child'];
    return this.types.some(type => familyTypes.includes(type));
  }

  isProfessionalConnection(): boolean {
    const professionalTypes = ['colleague', 'manager', 'reports_to', 'mentor', 'mentee'];
    return this.types.some(type => professionalTypes.includes(type));
  }

  isSocialConnection(): boolean {
    const socialTypes = ['friend', 'acquaintance', 'club_member'];
    return this.types.some(type => socialTypes.includes(type));
  }
}