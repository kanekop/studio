"use client";
import React from 'react';
import { AuthProvider } from './AuthContext';
import { UIProvider } from './UIContext';
import { PeopleProvider } from './PeopleContext';
import { ConnectionProvider } from './ConnectionContext';
import { RosterProvider } from './RosterContext';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <PeopleProvider>
          <ConnectionProvider>
            <RosterProvider>
              {children}
            </RosterProvider>
          </ConnectionProvider>
        </PeopleProvider>
      </UIProvider>
    </AuthProvider>
  );
};

// Re-export all hooks for easy access
export { useAuth } from './AuthContext';
export { useUI } from './UIContext';
export { usePeople } from './PeopleContext';
export { useConnections } from './ConnectionContext';
export { useRoster } from './RosterContext';

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