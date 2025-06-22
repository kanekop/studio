// File Upload Constants
export const FILE_UPLOAD = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

// Connection Type Categories
export const CONNECTION_TYPES = {
  COMMON: [
    { key: 'colleague', label: 'Colleague', category: 'common' },
    { key: 'friend', label: 'Friend', category: 'common' },
    { key: 'acquaintance', label: 'Acquaintance', category: 'common' },
    { key: 'club_member', label: 'Club Member', category: 'common' },
  ],
  HIERARCHICAL: [
    { key: 'parent', label: 'Parent (of Target)', category: 'hierarchical' },
    { key: 'child', label: 'Child (of Target)', category: 'hierarchical' },
    { key: 'manager', label: 'Manager (of Target)', category: 'hierarchical' },
    { key: 'reports_to', label: 'Reports to (Target)', category: 'hierarchical' },
    { key: 'mentor', label: 'Mentor (to Target)', category: 'hierarchical' },
    { key: 'mentee', label: 'Mentee (of Target)', category: 'hierarchical' },
  ],
  SPECIAL: [
    { key: 'spouse', label: 'Spouse', category: 'special' },
    { key: 'partner', label: 'Partner', category: 'special' },
    { key: 'family_member', label: 'Family Member', category: 'special' },
  ],
} as const;

// Connection type categorization for UI display
export const CONNECTION_TYPE_GROUPS = {
  GENERAL: ['colleague', 'friend', 'club_member', 'acquaintance', 'fellow_member', 'group_member'],
  FAMILY: ['parent', 'child', 'father', 'mother', 'family_member'],
  PROFESSIONAL: ['manager', 'reports_to', 'subordinate', 'mentor', 'mentee'],
  PARTNER: ['spouse', 'partner'],
} as const;

// Mutually exclusive connection type pairs
export const MUTUALLY_EXCLUSIVE_PAIRS: readonly [string, string][] = [
  ['parent', 'child'],
  ['manager', 'reports_to'],
  ['mentor', 'mentee'],
  ['spouse', 'partner'],
] as const;

// Local Storage Constants
export const LOCAL_STORAGE = {
  STORAGE_KEY: 'faceRosterData',
  MAX_STORAGE_ATTEMPTS: 3,
} as const;

// Toast Configuration
export const TOAST_CONFIG = {
  LIMIT: 1,
  REMOVE_DELAY: 1000000, // microseconds
} as const;

// UI Interaction Constants
export const UI_INTERACTION = {
  LONG_PRESS_TIMEOUT: 500, // milliseconds
  DEBOUNCE_DELAY: 300, // milliseconds for search
} as const;

// Sort Options
export type SortOption = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';

export const SORT_OPTIONS: Record<SortOption, { label: string; value: SortOption }> = {
  createdAt_desc: { label: 'Newest First', value: 'createdAt_desc' },
  createdAt_asc: { label: 'Oldest First', value: 'createdAt_asc' },
  name_asc: { label: 'Name (A-Z)', value: 'name_asc' },
  name_desc: { label: 'Name (Z-A)', value: 'name_desc' },
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  DEFAULT_DELAY: (attemptNumber: number) => Math.pow(2, attemptNumber - 1) * 1000,
  MAX_ATTEMPTS: 3,
} as const;