import { Connection as ConnectionEntity, Person as PersonEntity } from '@/domain/entities';
import { Connection, Person } from '@/shared/types';
import { CONNECTION_TYPES, CONNECTION_TYPE_GROUPS } from '@/shared/constants';

export interface ConnectionSummary {
  total: number;
  byCategory: {
    family: number;
    professional: number;
    social: number;
    other: number;
  };
  byType: Record<string, number>;
  strongConnections: number;
  weakConnections: number;
}

export interface NetworkAnalysis {
  totalConnections: number;
  uniquePeople: number;
  averageConnectionsPerPerson: number;
  mostConnectedPeople: Array<{ personId: string; connectionCount: number }>;
  isolatedPeople: string[];
  connectionDensity: number; // 0-1 scale
}

export class ConnectionAnalyzer {
  // Analyze connections for a specific person
  static analyzePersonConnections(
    personId: string,
    allConnections: Connection[]
  ): ConnectionSummary {
    const relatedConnections = this.filterRelatedConnections(personId, allConnections);
    
    const summary: ConnectionSummary = {
      total: relatedConnections.length,
      byCategory: {
        family: 0,
        professional: 0,
        social: 0,
        other: 0,
      },
      byType: {},
      strongConnections: 0,
      weakConnections: 0,
    };

    relatedConnections.forEach(conn => {
      // Use the same categorization as UI for consistency
      let categorized = false;
      
      // Check if connection has any family types
      if (conn.types.some(type => CONNECTION_TYPE_GROUPS.FAMILY.includes(type as any))) {
        summary.byCategory.family++;
        categorized = true;
      }
      
      // Check if connection has any professional types
      if (conn.types.some(type => CONNECTION_TYPE_GROUPS.PROFESSIONAL.includes(type as any))) {
        summary.byCategory.professional++;
        categorized = true;
      }
      
      // Check if connection has any general/social types
      if (conn.types.some(type => CONNECTION_TYPE_GROUPS.GENERAL.includes(type as any))) {
        summary.byCategory.social++;
        categorized = true;
      }
      
      // If not categorized, count as other
      if (!categorized) {
        summary.byCategory.other++;
      }
      
      // Count by specific type
      conn.types.forEach(type => {
        summary.byType[type] = (summary.byType[type] || 0) + 1;
      });
      
      // Count by strength
      const strength = this.getConnectionStrength(conn.strength);
      if (strength === 'strong') summary.strongConnections++;
      if (strength === 'weak') summary.weakConnections++;
    });

    // Note: 'other' category is already calculated in the loop above

    return summary;
  }

  // Analyze the entire network
  static analyzeNetwork(
    allPeople: Person[],
    allConnections: Connection[]
  ): NetworkAnalysis {
    const peopleIds = allPeople.map(p => p.id);
    const connectionCounts = new Map<string, number>();

    // Initialize counts
    peopleIds.forEach(id => connectionCounts.set(id, 0));

    // Count connections per person
    allConnections.forEach(conn => {
      if (peopleIds.includes(conn.fromPersonId)) {
        connectionCounts.set(
          conn.fromPersonId,
          (connectionCounts.get(conn.fromPersonId) || 0) + 1
        );
      }
      if (peopleIds.includes(conn.toPersonId)) {
        connectionCounts.set(
          conn.toPersonId,
          (connectionCounts.get(conn.toPersonId) || 0) + 1
        );
      }
    });

    // Find most connected people
    const connectionArray = Array.from(connectionCounts.entries())
      .map(([personId, count]) => ({ personId, connectionCount: count }))
      .sort((a, b) => b.connectionCount - a.connectionCount);

    const mostConnectedPeople = connectionArray.slice(0, 5);
    const isolatedPeople = connectionArray
      .filter(item => item.connectionCount === 0)
      .map(item => item.personId);

    // Calculate average connections
    const totalConnectionCount = Array.from(connectionCounts.values())
      .reduce((sum, count) => sum + count, 0);
    const averageConnectionsPerPerson = peopleIds.length > 0 
      ? totalConnectionCount / peopleIds.length 
      : 0;

    // Calculate connection density (actual connections / possible connections)
    const possibleConnections = peopleIds.length * (peopleIds.length - 1) / 2;
    const connectionDensity = possibleConnections > 0 
      ? Math.min(1, allConnections.length / possibleConnections)
      : 0;

    return {
      totalConnections: allConnections.length,
      uniquePeople: peopleIds.length,
      averageConnectionsPerPerson,
      mostConnectedPeople,
      isolatedPeople,
      connectionDensity,
    };
  }

  // Get mutual connections between two people
  static getMutualConnections(
    person1Id: string,
    person2Id: string,
    allConnections: Connection[],
    allPeople: Person[]
  ): Person[] {
    const person1Connections = this.getConnectedPersonIds(person1Id, allConnections);
    const person2Connections = this.getConnectedPersonIds(person2Id, allConnections);

    const mutualPersonIds = person1Connections.filter(id => 
      person2Connections.includes(id)
    );

    return allPeople.filter(p => mutualPersonIds.includes(p.id));
  }

  // Get connection path between two people (up to 3 degrees)
  static findConnectionPath(
    fromPersonId: string,
    toPersonId: string,
    allConnections: Connection[],
    maxDegrees: number = 3
  ): string[] | null {
    if (fromPersonId === toPersonId) return [fromPersonId];

    const visited = new Set<string>();
    const queue: Array<{ personId: string; path: string[] }> = [
      { personId: fromPersonId, path: [fromPersonId] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.path.length > maxDegrees + 1) continue;
      if (visited.has(current.personId)) continue;
      
      visited.add(current.personId);

      const connectedIds = this.getConnectedPersonIds(current.personId, allConnections);
      
      for (const connectedId of connectedIds) {
        if (connectedId === toPersonId) {
          return [...current.path, toPersonId];
        }
        
        if (!visited.has(connectedId)) {
          queue.push({
            personId: connectedId,
            path: [...current.path, connectedId]
          });
        }
      }
    }

    return null; // No path found
  }

  // Helper methods
  private static filterRelatedConnections(
    personId: string,
    connections: Connection[]
  ): Connection[] {
    return connections.filter(conn => 
      conn.fromPersonId === personId || conn.toPersonId === personId
    );
  }

  private static getConnectionStrength(strength?: number | null): 'strong' | 'medium' | 'weak' {
    if (!strength) return 'medium';
    if (strength >= 4) return 'strong';
    if (strength >= 2) return 'medium';
    return 'weak';
  }

  private static getConnectedPersonIds(
    personId: string,
    connections: Connection[]
  ): string[] {
    const connectedIds = new Set<string>();
    
    connections.forEach(conn => {
      if (conn.fromPersonId === personId) {
        connectedIds.add(conn.toPersonId);
      } else if (conn.toPersonId === personId) {
        connectedIds.add(conn.fromPersonId);
      }
    });

    return Array.from(connectedIds);
  }

  // Connection type validation
  static validateConnectionTypes(types: string[]): string[] {
    const allValidTypes = [
      ...CONNECTION_TYPES.COMMON,
      ...CONNECTION_TYPES.HIERARCHICAL,
      ...CONNECTION_TYPES.SPECIAL
    ].map(t => t.key);

    return types.filter(type => allValidTypes.includes(type as any));
  }

  // Check for mutually exclusive types
  static hasMutuallyExclusiveTypes(types: string[]): boolean {
    const mutuallyExclusivePairs: [string, string][] = [
      ['parent', 'child'],
      ['manager', 'reports_to'],
      ['mentor', 'mentee'],
      ['spouse', 'partner'],
    ];

    for (const [type1, type2] of mutuallyExclusivePairs) {
      if (types.includes(type1) && types.includes(type2)) {
        return true;
      }
    }

    return false;
  }
}