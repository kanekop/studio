import { useMemo } from 'react';
import { Connection as ConnectionData } from '@/shared/types';
import { Connection } from '@/domain/entities';
import { ConnectionAnalyzer } from '@/domain/services';
import { CONNECTION_TYPE_GROUPS } from '@/shared/constants';

export interface PersonConnectionSummary {
  general: number;
  family: number;
  professional: number;
  partner: number;
  total: number;
}

/**
 * Custom hook to analyze a person's connections using domain services
 * Bridges the domain layer with React components
 */
export function usePersonConnections(
  personId: string | undefined,
  allConnections: ConnectionData[]
): PersonConnectionSummary {
  return useMemo(() => {
    if (!personId || !allConnections) {
      return { general: 0, family: 0, professional: 0, partner: 0, total: 0 };
    }

    // Rehydrate plain data objects into domain entities
    const connectionInstances = allConnections.map(connData => Connection.fromFirestore(connData));

    // Use domain service to analyze connections
    const analysis = ConnectionAnalyzer.analyzePersonConnections(personId, connectionInstances);
    
    // Partner connections can also use the instances for consistency
    const relatedConnections = connectionInstances.filter(conn => conn.involvePerson(personId));
    
    const partnerCount = relatedConnections.filter(conn =>
      conn.types.some(type => CONNECTION_TYPE_GROUPS.PARTNER.includes(type as any))
    ).length;
    
    // Map domain analysis to UI-friendly format
    return {
      general: analysis.byCategory.social, // 'general' in UI maps to 'social' in domain
      family: analysis.byCategory.family,
      professional: analysis.byCategory.professional,
      partner: partnerCount,
      total: analysis.total
    };
  }, [personId, allConnections]);
}