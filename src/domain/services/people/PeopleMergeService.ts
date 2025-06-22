import { Person, Connection } from '@/domain/entities';
import { FieldMergeChoices } from '@/shared/types';

export interface MergeConflict {
  field: string;
  person1Value: any;
  person2Value: any;
  requiresChoice: boolean;
}

export interface MergePreview {
  conflicts: MergeConflict[];
  affectedConnections: {
    fromPerson2: Connection[];
    willBeUpdated: number;
    willBeDeleted: number;
  };
  affectedRosters: string[];
  mergedFaceAppearances: number;
}

export interface MergeResult {
  mergedPerson: Person;
  deletedPersonId: string;
  updatedConnectionIds: string[];
  mergedFaceAppearanceCount: number;
}

export class PeopleMergeService {
  // Check if two people can be merged
  static canMergePeople(person1: Person, person2: Person): { canMerge: boolean; reason?: string } {
    if (!person1.canBeMergedWith(person2)) {
      if (person1.id === person2.id) {
        return { canMerge: false, reason: 'Cannot merge a person with themselves' };
      }
      if (person1.addedBy !== person2.addedBy) {
        return { canMerge: false, reason: 'Can only merge people from the same user' };
      }
      return { canMerge: false, reason: 'People cannot be merged' };
    }

    return { canMerge: true };
  }

  // Analyze merge conflicts
  static analyzeMergeConflicts(person1: Person, person2: Person): MergeConflict[] {
    const conflicts: MergeConflict[] = [];
    const fields = ['name', 'company', 'hobbies', 'birthday', 'firstMet', 'firstMetContext'];

    fields.forEach(field => {
      const value1 = (person1 as any)[field];
      const value2 = (person2 as any)[field];

      if (value1 !== value2) {
        conflicts.push({
          field,
          person1Value: value1,
          person2Value: value2,
          requiresChoice: !!(value1 && value2), // Only require choice if both have values
        });
      }
    });

    return conflicts;
  }

  // Preview merge impact
  static previewMerge(
    person1: Person,
    person2: Person,
    allConnections: Connection[]
  ): MergePreview {
    const conflicts = this.analyzeMergeConflicts(person1, person2);
    
    // Find connections that will be affected
    const person2Connections = allConnections.filter(conn => 
      conn.involvePerson(person2.id)
    );

    // Count connections that will be updated vs deleted (duplicates)
    let willBeUpdated = 0;
    let willBeDeleted = 0;

    person2Connections.forEach(p2Conn => {
      const isDuplicate = allConnections.some(p1Conn => 
        p1Conn.involvePerson(person1.id) &&
        ((p1Conn.fromPersonId === person1.id && p1Conn.toPersonId === p2Conn.getOtherPersonId(person2.id)) ||
         (p1Conn.toPersonId === person1.id && p1Conn.fromPersonId === p2Conn.getOtherPersonId(person2.id)))
      );

      if (isDuplicate) {
        willBeDeleted++;
      } else {
        willBeUpdated++;
      }
    });

    // Affected rosters
    const affectedRosters = [...new Set([...person1.rosterIds, ...person2.rosterIds])];

    // Face appearances
    const mergedFaceAppearances = person1.faceAppearances.length + person2.faceAppearances.length;

    return {
      conflicts,
      affectedConnections: {
        fromPerson2: person2Connections,
        willBeUpdated,
        willBeDeleted,
      },
      affectedRosters,
      mergedFaceAppearances,
    };
  }

  // Perform the merge
  static performMerge(
    person1: Person,
    person2: Person,
    fieldChoices: FieldMergeChoices,
    allConnections: Connection[]
  ): MergeResult {
    // Create a copy of person1 to modify
    const mergedPerson = Person.fromFirestore({
      ...person1,
      id: person1.id,
      createdAt: person1.createdAt,
      updatedAt: person1.updatedAt,
    });

    // Convert field choices to the format expected by the entity
    const choices: Record<string, 'keep' | 'replace'> = {};
    Object.entries(fieldChoices).forEach(([field, choice]) => {
      choices[field] = choice === 'person1' ? 'keep' : 'replace';
    });

    // Perform the merge
    mergedPerson.mergeWith(person2, choices);

    // Handle connections
    const updatedConnectionIds: string[] = [];
    const person2Connections = allConnections.filter(conn => 
      conn.involvePerson(person2.id)
    );

    // Update connections to point to person1
    person2Connections.forEach(conn => {
      // Check if this would create a duplicate connection
      const isDuplicate = allConnections.some(existingConn => 
        existingConn.id !== conn.id &&
        existingConn.involvePerson(person1.id) &&
        ((existingConn.fromPersonId === person1.id && existingConn.toPersonId === conn.getOtherPersonId(person2.id)) ||
         (existingConn.toPersonId === person1.id && existingConn.fromPersonId === conn.getOtherPersonId(person2.id)))
      );

      if (!isDuplicate) {
        // Update the connection to point to person1
        if (conn.fromPersonId === person2.id) {
          conn.fromPersonId = person1.id;
        }
        if (conn.toPersonId === person2.id) {
          conn.toPersonId = person1.id;
        }
        updatedConnectionIds.push(conn.id);
      }
    });

    return {
      mergedPerson,
      deletedPersonId: person2.id,
      updatedConnectionIds,
      mergedFaceAppearanceCount: mergedPerson.faceAppearances.length,
    };
  }

  // Generate merge suggestions based on similarity
  static generateMergeSuggestions(people: Person[]): Array<{
    person1: Person;
    person2: Person;
    confidence: 'high' | 'medium' | 'low';
    reasons: string[];
  }> {
    const suggestions: Array<{
      person1: Person;
      person2: Person;
      confidence: 'high' | 'medium' | 'low';
      reasons: string[];
    }> = [];

    // Compare each pair of people
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const person1 = people[i];
        const person2 = people[j];

        const reasons: string[] = [];
        let score = 0;

        // Check name similarity
        const nameSimilarity = this.calculateStringSimilarity(person1.name, person2.name);
        if (nameSimilarity > 0.9) {
          reasons.push('Names are very similar');
          score += 3;
        } else if (nameSimilarity > 0.7) {
          reasons.push('Names are somewhat similar');
          score += 2;
        }

        // Check company match
        if (person1.company && person2.company && 
            person1.company.toLowerCase() === person2.company.toLowerCase()) {
          reasons.push('Same company');
          score += 2;
        }

        // Check shared rosters
        const sharedRosters = person1.rosterIds.filter(id => 
          person2.rosterIds.includes(id)
        );
        if (sharedRosters.length > 0) {
          reasons.push(`Appear in ${sharedRosters.length} same roster(s)`);
          score += sharedRosters.length;
        }

        // Check birthday match
        if (person1.birthday && person2.birthday && 
            person1.birthday === person2.birthday) {
          reasons.push('Same birthday');
          score += 2;
        }

        // Only suggest if there's some similarity
        if (score > 0) {
          const confidence = score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';
          suggestions.push({
            person1,
            person2,
            confidence,
            reasons,
          });
        }
      }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
  }

  // Calculate string similarity (normalized Levenshtein)
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(s1, s2);
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