import { Connection } from '@/shared/types';

export interface IConnectionRepository {
  // Create
  createConnection(connection: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Connection>;
  
  // Read
  getConnectionById(connectionId: string): Promise<Connection | null>;
  getAllConnectionsByUser(userId: string): Promise<Connection[]>;
  getConnectionsBetweenPeople(personId1: string, personId2: string): Promise<Connection[]>;
  getConnectionsForPerson(personId: string): Promise<Connection[]>;
  
  // Update
  updateConnection(connectionId: string, updates: Partial<Connection>): Promise<void>;
  
  // Delete
  deleteConnection(connectionId: string): Promise<void>;
  deleteConnectionsForPerson(personId: string): Promise<void>;
  
  // Batch operations
  batchCreateConnections(connections: Array<Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Connection[]>;
  
  // Analysis
  getConnectionTypeDistribution(userId: string): Promise<Record<string, number>>;
  getMostConnectedPeople(userId: string, limit?: number): Promise<Array<{ personId: string; connectionCount: number }>>;
}