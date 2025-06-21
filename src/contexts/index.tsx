"use client";
import React from 'react';
import { AuthProvider } from './AuthContext';
import { UIProvider } from './UIContext';
import { SearchFilterProvider } from './SearchFilterContext';
import { PeopleProvider } from './PeopleContext';
import { ConnectionProvider } from './ConnectionContext';
import { FaceRosterProvider } from './FaceRosterContext';
import { PeopleMergeProvider } from './PeopleMergeContext';
import { PeopleDeletionProvider } from './PeopleDeletionContext';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <SearchFilterProvider>
          <ConnectionProvider>
            <PeopleProvider>
              <PeopleMergeProvider>
                <PeopleDeletionProvider>
                  <FaceRosterProvider>
                    {children}
                  </FaceRosterProvider>
                  </PeopleDeletionProvider>
                </PeopleMergeProvider>
              </PeopleProvider>
            </ConnectionProvider>
        </SearchFilterProvider>
      </UIProvider>
    </AuthProvider>
  );
};

// Re-export all hooks for easy access
export { useAuth } from './AuthContext';
export { useUI } from './UIContext';
export { useSearchFilter } from './SearchFilterContext';
export { usePeople } from './PeopleContext';
export { useConnections } from './ConnectionContext';
export { useFaceRoster } from './FaceRosterContext';
export { usePeopleMerge } from './PeopleMergeContext';
export { usePeopleDeletion } from './PeopleDeletionContext';

// Re-export utility hooks
export { useAsyncOperation } from '@/hooks/useAsyncOperation';
export { useStorageImage } from '@/hooks/useStorageImage';
export { usePersonImage } from '@/hooks/usePersonImage';
export { useImageUpload } from '@/hooks/useImageUpload';
export { useFirestoreSync } from '@/hooks/useFirestoreSync';
export { useErrorHandler } from '@/hooks/useErrorHandler';
export { useDragHandlers } from '@/hooks/useDragHandlers';
export { useMergeFeatures } from '@/hooks/useMergeFeatures';

// Re-export all types
export type { PeopleSortOptionValue } from './PeopleContext';