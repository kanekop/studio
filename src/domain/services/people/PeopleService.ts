import { Person as PersonEntity } from '@/domain/entities';
import { Person, EditablePersonInContext, FaceAppearance } from '@/shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface PersonSearchCriteria {
  query?: string;
  company?: string;
  rosterId?: string;
  hasConnections?: boolean;
  ageRange?: { min?: number; max?: number };
}

export interface PersonStatistics {
  totalPeople: number;
  peopleWithConnections: number;
  peopleWithoutConnections: number;
  averageAge: number | null;
  companiesCount: number;
  rostersCount: number;
}

export class PeopleService {
  // Search and filter people
  static searchPeople(
    people: Person[],
    criteria: PersonSearchCriteria
  ): Person[] {
    let filtered = [...people];

    // Text search
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(query) ||
        person.aiName?.toLowerCase().includes(query) ||
        person.company?.toLowerCase().includes(query) ||
        person.hobbies?.toLowerCase().includes(query) ||
        person.notes?.toLowerCase().includes(query)
      );
    }

    // Company filter
    if (criteria.company) {
      filtered = filtered.filter(person => 
        person.company?.toLowerCase() === criteria.company!.toLowerCase()
      );
    }

    // Roster filter
    if (criteria.rosterId) {
      filtered = filtered.filter(person => 
        person.rosterIds?.includes(criteria.rosterId!) || false
      );
    }

    // Age range filter
    if (criteria.ageRange) {
      filtered = filtered.filter(person => {
        if (!person.age) return false;
        const { min, max } = criteria.ageRange!;
        if (min !== undefined && person.age < min) return false;
        if (max !== undefined && person.age > max) return false;
        return true;
      });
    }

    return filtered;
  }

  // Sort people
  static sortPeople(
    people: Person[],
    sortBy: 'name_asc' | 'name_desc' | 'createdAt_asc' | 'createdAt_desc'
  ): Person[] {
    const sorted = [...people];

    switch (sortBy) {
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      
      case 'createdAt_asc':
        return sorted.sort((a, b) => 
          a.createdAt.toMillis() - b.createdAt.toMillis()
        );
      
      case 'createdAt_desc':
        return sorted.sort((a, b) => 
          b.createdAt.toMillis() - a.createdAt.toMillis()
        );
      
      default:
        return sorted;
    }
  }

  // Get unique values for filtering
  static getUniqueCompanies(people: Person[]): string[] {
    const companies = new Set<string>();
    people.forEach(person => {
      if (person.company) {
        companies.add(person.company);
      }
    });
    return Array.from(companies).sort();
  }

  static getUniqueHobbies(people: Person[]): string[] {
    const hobbies = new Set<string>();
    people.forEach(person => {
      if (person.hobbies) {
        // Split by common delimiters
        const hobbyList = person.hobbies.split(/[,;、]/);
        hobbyList.forEach(hobby => {
          const trimmed = hobby.trim();
          if (trimmed) hobbies.add(trimmed);
        });
      }
    });
    return Array.from(hobbies).sort();
  }

  // Calculate statistics
  static calculateStatistics(people: Person[]): PersonStatistics {
    const peopleWithAges = people.filter(p => p.age !== undefined);
    const totalAge = peopleWithAges.reduce((sum, p) => sum + (p.age || 0), 0);
    
    return {
      totalPeople: people.length,
      peopleWithConnections: 0, // This would need connection data
      peopleWithoutConnections: 0, // This would need connection data
      averageAge: peopleWithAges.length > 0 ? totalAge / peopleWithAges.length : null,
      companiesCount: this.getUniqueCompanies(people).length,
      rostersCount: new Set(people.flatMap(p => p.rosterIds)).size,
    };
  }

  // Create temporary person for editing
  static createTemporaryPerson(
    faceRegion: { x: number; y: number; width: number; height: number },
    rosterId: string,
    faceImageDataUri: string
  ): EditablePersonInContext {
    const tempId = `temp_${uuidv4()}`;
    
    return {
      id: tempId,
      name: '',
      isNew: true,
      tempFaceImageDataUri: faceImageDataUri,
      tempOriginalRegion: faceRegion,
      currentRosterAppearance: {
        rosterId,
        faceImageStoragePath: '', // Will be set when saved
        originalRegion: faceRegion,
      },
    };
  }

  // Convert editable person to domain type
  static fromEditablePersonInContext(
    editable: EditablePersonInContext,
    addedBy: string,
    rosterId: string
  ): Partial<Person> {
    return {
      id: editable.id,
      name: editable.name,
      addedBy,
      rosterIds: [rosterId],
      faceAppearances: [], // Face appearances will be added separately
      aiName: editable.aiName,
      notes: editable.notes,
      primaryFaceAppearancePath: null,
      profileImagePath: undefined,
      company: editable.company,
      hobbies: editable.hobbies,
      birthday: editable.birthday,
      age: undefined,
      firstMet: editable.firstMet,
      firstMetContext: editable.firstMetContext
    };
  }

  // Validate person data
  static validatePerson(person: Partial<Person>): string[] {
    const errors: string[] = [];

    if (!person.name || person.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (person.age !== undefined) {
      if (person.age < 0 || person.age > 150) {
        errors.push('Age must be between 0 and 150');
      }
    }

    if (person.birthday) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(person.birthday)) {
        errors.push('Birthday must be in YYYY-MM-DD format');
      }
    }

    return errors;
  }

  // Check if two people might be duplicates
  static arePotentialDuplicates(person1: Person, person2: Person): boolean {
    // Same name (case insensitive)
    if (person1.name.toLowerCase() === person2.name.toLowerCase()) {
      return true;
    }

    // Similar names (basic similarity check)
    if (this.calculateNameSimilarity(person1.name, person2.name) > 0.8) {
      return true;
    }

    // Same company and similar names
    if (person1.company && person2.company && 
        person1.company.toLowerCase() === person2.company.toLowerCase() &&
        this.calculateNameSimilarity(person1.name, person2.name) > 0.6) {
      return true;
    }

    return false;
  }

  // Basic name similarity calculation (Levenshtein distance based)
  private static calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = name1.toLowerCase();
    const n2 = name2.toLowerCase();
    
    if (n1 === n2) return 1;
    
    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(n1, n2);
    return 1 - (distance / maxLen);
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}