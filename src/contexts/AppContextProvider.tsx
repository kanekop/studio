'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ConnectionProvider } from './ConnectionContext';
import { PeopleProvider } from './PeopleContext';
import { FaceRosterProvider } from './FaceRosterContext';
import { UIProvider } from './UIContext';
import { ImageProvider } from './ImageContext';
import { SearchFilterProvider } from './SearchFilterContext';

interface AppContextProviderProps {
  children: ReactNode;
}

/**
 * 統合Context Provider
 * アプリケーション全体で使用する複数のContextを組み合わせて提供します
 * 
 * Context階層:
 * 1. AuthProvider - 認証状態管理
 * 2. UIProvider - UI状態管理
 * 3. ImageProvider - 画像処理
 * 4. SearchFilterProvider - 検索・フィルタリング
 * 5. ConnectionProvider - 人物間の関係性
 * 6. PeopleProvider - 人物データ管理
 * 7. RosterProvider - Roster管理
 */
export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <ImageProvider>
          <SearchFilterProvider>
            <ConnectionProvider>
              <PeopleProvider>
                <FaceRosterProvider>
                  {children}
                </FaceRosterProvider>
              </PeopleProvider>
            </ConnectionProvider>
          </SearchFilterProvider>
        </ImageProvider>
      </UIProvider>
    </AuthProvider>
  );
};