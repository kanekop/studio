// Re-export all domain layer resources

// Repository interfaces
export type { IPeopleRepository } from './repositories/IPeopleRepository';
export type { IConnectionRepository } from './repositories/IConnectionRepository';
export type { IRosterRepository } from './repositories/IRosterRepository';

// Entities
export * from './entities';

// Services
export * from './services';