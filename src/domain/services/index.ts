// Export all domain services

// Connection services
export { ConnectionAnalyzer } from './connections/ConnectionAnalyzer';
export type { ConnectionSummary, NetworkAnalysis } from './connections/ConnectionAnalyzer';

// People services  
export { PeopleService } from './people/PeopleService';
export type { PersonSearchCriteria, PersonStatistics } from './people/PeopleService';

export { PeopleMergeService } from './people/PeopleMergeService';
export type { MergeConflict, MergePreview, MergeResult } from './people/PeopleMergeService';