"use client";
import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Edit, Trash2, Users, Heart, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Connection, Person } from '@/types';
import type { Timestamp } from 'firebase/firestore';

interface VirtualizedConnectionsListProps {
  connections: Connection[];
  getPersonInfo: (personId: string) => Person | null;
  formatTimestamp: (timestamp: Timestamp | any) => string;
  getConnectionCategory: (types: string[]) => string;
  getCategoryIcon: (category: string) => React.ReactNode;
  onEditConnection: (connection: Connection) => void;
  onDeleteConnection: (connection: Connection) => void;
  deletingConnectionId: string | null;
  containerHeight?: number;
}

const CONNECTION_ITEM_HEIGHT = 120; // カード高さ + margin
const OVERSCAN = 5;

export default function VirtualizedConnectionsList({
  connections,
  getPersonInfo,
  formatTimestamp,
  getConnectionCategory,
  getCategoryIcon,
  onEditConnection,
  onDeleteConnection,
  deletingConnectionId,
  containerHeight = 600
}: VirtualizedConnectionsListProps) {
  // 親要素のref
  const parentRef = React.useRef<HTMLDivElement>(null);

  // バーチャライザーの設定
  const virtualizer = useVirtualizer({
    count: connections.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CONNECTION_ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  // 少数のアイテムの場合は通常の表示にフォールバック
  if (connections.length <= 20) {
    return (
      <div className="space-y-4">
        {connections.map((connection) => (
          <ConnectionItem
            key={connection.id}
            connection={connection}
            getPersonInfo={getPersonInfo}
            formatTimestamp={formatTimestamp}
            getConnectionCategory={getConnectionCategory}
            getCategoryIcon={getCategoryIcon}
            onEditConnection={onEditConnection}
            onDeleteConnection={onDeleteConnection}
            isDeleting={deletingConnectionId === connection.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="w-full overflow-auto"
      style={{
        height: `${containerHeight}px`,
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const connection = connections[virtualItem.index];
          if (!connection) return null;

          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: '16px', // space-y-4 equivalent
              }}
            >
              <ConnectionItem
                connection={connection}
                getPersonInfo={getPersonInfo}
                formatTimestamp={formatTimestamp}
                getConnectionCategory={getConnectionCategory}
                getCategoryIcon={getCategoryIcon}
                onEditConnection={onEditConnection}
                onDeleteConnection={onDeleteConnection}
                isDeleting={deletingConnectionId === connection.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ConnectionItemProps {
  connection: Connection;
  getPersonInfo: (personId: string) => Person | null;
  formatTimestamp: (timestamp: Timestamp | any) => string;
  getConnectionCategory: (types: string[]) => string;
  getCategoryIcon: (category: string) => React.ReactNode;
  onEditConnection: (connection: Connection) => void;
  onDeleteConnection: (connection: Connection) => void;
  isDeleting: boolean;
}

function ConnectionItem({
  connection,
  getPersonInfo,
  formatTimestamp,
  getConnectionCategory,
  getCategoryIcon,
  onEditConnection,
  onDeleteConnection,
  isDeleting
}: ConnectionItemProps) {
  const fromPerson = getPersonInfo(connection.fromPersonId);
  const toPerson = getPersonInfo(connection.toPersonId);
  
  // 無効なコネクション（人物が見つからない）をスキップ
  if (!fromPerson || !toPerson) {
    return null;
  }

  const category = getConnectionCategory(connection.types || []);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {getCategoryIcon(category)}
              <div className="flex items-center gap-2">
                <span className="font-medium">{fromPerson.name}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{toPerson.name}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.isArray(connection.types) && connection.types.map((type, index) => (
                <Badge key={`${connection.id}-type-${index}`} variant="secondary">
                  {type || '不明なタイプ'}
                </Badge>
              ))}
            </div>
            
            {Array.isArray(connection.reasons) && connection.reasons.length > 0 && (
              <div className="text-sm text-muted-foreground mb-2">
                理由: {connection.reasons.filter(Boolean).join(', ')}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {typeof connection.strength === 'number' && (
                <span>強さ: {connection.strength}/5</span>
              )}
              <span>
                作成: {formatTimestamp(connection.createdAt)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditConnection(connection)}
              disabled={isDeleting}
              title="コネクションを編集"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteConnection(connection)}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
              title="コネクションを削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}