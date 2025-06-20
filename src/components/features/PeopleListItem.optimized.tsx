"use client";
import React, { useMemo, useCallback } from 'react';
import type { Person, Connection } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Users, Home, Briefcase, Heart, AlertTriangle, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useStorageImage } from '@/hooks/useStorageImage.improved';
import { useDragHandlers } from '@/hooks/useDragHandlers';
import OptimizedImage from '@/components/ui/optimized-image';
import MobileLongPressMenu from './MobileLongPressMenu';

interface PeopleListItemProps {
  person: Person;
  onEditClick: () => void;
  onInitiateConnection: (sourcePersonId: string, targetPersonId: string) => void;
  selectionMode?: 'merge' | 'delete' | 'none';
  isSelectedForMerge?: boolean;
  onToggleMergeSelection?: () => void;
  isSelectedForDeletion?: boolean;
  onToggleDeleteSelection?: () => void;
  generalActionDisabled?: boolean;
  allUserPeople?: Person[];
  allUserConnections?: Connection[];
}

const GENERAL_CONNECTION_TYPES = ['colleague', 'friend', 'club_member', 'acquaintance', 'fellow_member', 'group_member'];
const FAMILY_CONNECTION_TYPES = ['parent', 'child', 'father', 'mother', 'family_member'];
const PROFESSIONAL_CONNECTION_TYPES = ['manager', 'reports_to', 'subordinate', 'mentor', 'mentee'];
const PARTNER_CONNECTION_TYPES = ['spouse', 'partner'];

// ImageDisplay コンポーネント - 画像表示の責務を分離
const ImageDisplay: React.FC<{
  imagePath: string | null | undefined;
  personName: string;
  className?: string;
}> = React.memo(({ imagePath, personName, className }) => {
  const { url: displayImageUrl, isLoading, error, retry } = useStorageImage(imagePath, {
    fallbackUrl: "https://placehold.co/150x150.png?text=No+Image",
    enableCache: true,
    retryCount: 2,
  });

  if (isLoading) {
    return <Skeleton className={cn("w-full h-full", className)} />;
  }

  if (error) {
    return (
      <div className={cn("w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground", className)}>
        <AlertTriangle className="h-6 w-6 mb-1" />
        <span className="text-xs text-center mb-2">画像読み込みエラー</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            retry();
          }}
          className="text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          再試行
        </Button>
      </div>
    );
  }

  return (
    <OptimizedImage
      src={displayImageUrl || "https://placehold.co/150x150.png?text=No+Image"}
      alt={`Face of ${personName || 'Unknown'}`}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      objectFit="cover"
      priority={false}
      placeholder="blur"
      loading="lazy"
      fallbackSrc="https://placehold.co/150x150.png?text=No+Image"
      className={cn("rounded-t-lg", className)}
    />
  );
});

ImageDisplay.displayName = 'ImageDisplay';

// ConnectionStats コンポーネント - 関係性統計の責務を分離
const ConnectionStats: React.FC<{
  personId: string;
  connections: Connection[];
}> = React.memo(({ personId, connections }) => {
  const connectionCounts = useMemo(() => {
    let general = 0;
    let family = 0;
    let professional = 0;
    let partner = 0;

    const relevantConnections = connections.filter(
      conn => conn?.fromPersonId === personId || conn?.toPersonId === personId
    );

    relevantConnections.forEach(conn => {
      let countedGeneral = false;
      let countedFamily = false;
      let countedProfessional = false;
      let countedPartner = false;

      (conn?.types || []).forEach(type => {
        if (GENERAL_CONNECTION_TYPES.includes(type) && !countedGeneral) {
          general++;
          countedGeneral = true;
        }
        if (FAMILY_CONNECTION_TYPES.includes(type) && !countedFamily) {
          family++;
          countedFamily = true;
        }
        if (PROFESSIONAL_CONNECTION_TYPES.includes(type) && !countedProfessional) {
          professional++;
          countedProfessional = true;
        }
        if (PARTNER_CONNECTION_TYPES.includes(type) && !countedPartner) {
          partner++;
          countedPartner = true;
        }
      });
    });

    return { general, family, professional, partner };
  }, [personId, connections]);

  return (
    <div className="flex items-center space-x-3">
      {connectionCounts.general > 0 && (
        <div className="flex items-center space-x-1">
          <Users className="h-3 w-3" />
          <span>{connectionCounts.general}</span>
        </div>
      )}
      {connectionCounts.family > 0 && (
        <div className="flex items-center space-x-1">
          <Home className="h-3 w-3" />
          <span>{connectionCounts.family}</span>
        </div>
      )}
      {connectionCounts.professional > 0 && (
        <div className="flex items-center space-x-1">
          <Briefcase className="h-3 w-3" />
          <span>{connectionCounts.professional}</span>
        </div>
      )}
      {connectionCounts.partner > 0 && (
        <div className="flex items-center space-x-1">
          <Heart className="h-3 w-3" />
          <span>{connectionCounts.partner}</span>
        </div>
      )}
    </div>
  );
});

ConnectionStats.displayName = 'ConnectionStats';

// メインコンポーネント
const PeopleListItem: React.FC<PeopleListItemProps> = React.memo(({
  person,
  onEditClick,
  onInitiateConnection,
  selectionMode = 'none',
  isSelectedForMerge = false,
  onToggleMergeSelection,
  isSelectedForDeletion = false,
  onToggleDeleteSelection,
  generalActionDisabled = false,
  allUserPeople = [],
  allUserConnections = [],
}) => {
  // 画像パスの計算
  const imagePath = useMemo(() => {
    return person.primaryFaceAppearancePath || 
           person.faceAppearances?.[0]?.faceImageStoragePath;
  }, [person.primaryFaceAppearancePath, person.faceAppearances]);

  // ロスター数の計算
  const rosterCount = useMemo(() => {
    return person.rosterIds?.length || 0;
  }, [person.rosterIds]);

  // ドラッグ&ドロップハンドラー
  const { isDragging, isDraggedOver, dragHandlers } = useDragHandlers({
    disabled: generalActionDisabled || selectionMode !== 'none',
    data: { sourcePersonId: person?.id || '' },
    onDrop: (e) => {
      const sourcePersonId = e.dataTransfer.getData("sourcePersonId");
      const targetPersonId = person?.id;

      if (sourcePersonId && targetPersonId && sourcePersonId !== targetPersonId) {
        onInitiateConnection(sourcePersonId, targetPersonId);
      }
    },
  });

  // イベントハンドラー
  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // インタラクティブ要素からのクリックは無視
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="checkbox"], input, select, textarea')) {
      return;
    }

    if (generalActionDisabled && selectionMode === 'none') {
      return;
    }

    if (selectionMode === 'delete' && onToggleDeleteSelection) {
      onToggleDeleteSelection();
    } else if (selectionMode === 'merge' && onToggleMergeSelection) {
      onToggleMergeSelection();
    } else if (selectionMode === 'none' && !generalActionDisabled) {
      onEditClick();
    }
  }, [
    generalActionDisabled,
    selectionMode,
    onToggleDeleteSelection,
    onToggleMergeSelection,
    onEditClick
  ]);

  const handleCheckboxChange = useCallback((checked: boolean | 'indeterminate') => {
    if (generalActionDisabled) return;
    
    if (selectionMode === 'delete' && onToggleDeleteSelection) {
      onToggleDeleteSelection();
    } else if (selectionMode === 'merge' && onToggleMergeSelection) {
      onToggleMergeSelection();
    }
  }, [generalActionDisabled, selectionMode, onToggleDeleteSelection, onToggleMergeSelection]);

  // UI状態の計算
  const showCheckbox = selectionMode !== 'none' && !generalActionDisabled;
  const isChecked = selectionMode === 'delete' ? isSelectedForDeletion : (selectionMode === 'merge' ? isSelectedForMerge : false);
  const effectiveDisabledForMergeSelection = selectionMode === 'merge' && generalActionDisabled;

  return (
    <Card
      {...dragHandlers}
      className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden relative group",
        (selectionMode !== 'none' && !generalActionDisabled) && "cursor-pointer",
        (isSelectedForMerge && selectionMode === 'merge') && "ring-2 ring-offset-2 ring-blue-500 border-blue-500",
        (isSelectedForDeletion && selectionMode === 'delete') && "ring-2 ring-offset-2 ring-destructive border-destructive",
        (generalActionDisabled || effectiveDisabledForMergeSelection) && selectionMode === 'none' && "opacity-70",
        (effectiveDisabledForMergeSelection && !isChecked) && "opacity-60 cursor-not-allowed",
        isDragging && "opacity-50 border-2 border-dashed border-primary scale-95 shadow-xl z-50",
        isDraggedOver && !isDragging && "ring-2 ring-offset-2 ring-green-500 border-green-500 scale-105 bg-green-500/10"
      )}
      onClick={handleCardClick}
      role={showCheckbox ? "button" : "listitem"}
      aria-pressed={showCheckbox ? isChecked : undefined}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !((e.target as HTMLElement).closest('button, [role="checkbox"]'))) {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
    >
      {/* 選択チェックボックス */}
      {showCheckbox && (
        <div className="absolute top-2 right-2 z-10 bg-background/80 p-1 rounded-full">
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleCheckboxChange}
            disabled={effectiveDisabledForMergeSelection && !isChecked}
            aria-label={`Select ${person?.name || 'Unknown'}`}
            className={cn("h-5 w-5",
              selectionMode === 'delete' && isChecked && "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive",
              selectionMode === 'merge' && isChecked && "border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            )}
          />
        </div>
      )}

      {/* モバイル用長押しメニュー / デスクトップ編集ボタン */}
      <MobileLongPressMenu
        person={person}
        allPeople={allUserPeople}
        onEditClick={onEditClick}
        onInitiateConnection={onInitiateConnection}
        onToggleMergeSelection={onToggleMergeSelection}
        onToggleDeleteSelection={onToggleDeleteSelection}
        isSelectedForMerge={isSelectedForMerge}
        isSelectedForDeletion={isSelectedForDeletion}
        selectionMode={selectionMode}
        disabled={generalActionDisabled}
      />

      {/* 画像ヘッダー */}
      <CardHeader className="p-0">
        <div className="aspect-square w-full relative bg-muted">
          <ImageDisplay
            imagePath={imagePath}
            personName={person?.name || 'Unknown'}
          />
        </div>
      </CardHeader>

      {/* 人物情報 */}
      <CardContent className="p-3 flex-grow">
        <CardTitle className="text-lg font-semibold truncate" title={person?.name || 'Unknown'}>
          {person?.name || 'Unknown'}
        </CardTitle>
        
        {person?.company && (
          <p className="text-sm text-muted-foreground truncate mt-1" title={person.company}>
            <Briefcase className="inline h-3 w-3 mr-1" />
            {person.company}
          </p>
        )}
        
        {person?.hobbies && (
          <p className="text-sm text-muted-foreground truncate mt-1" title={person.hobbies}>
            <Heart className="inline h-3 w-3 mr-1" />
            {person.hobbies}
          </p>
        )}
      </CardContent>

      {/* フッター（統計情報） */}
      <CardFooter className="p-3 pt-0 space-y-2">
        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Layers className="h-3 w-3" />
            <span>{rosterCount}</span>
          </div>
          <ConnectionStats
            personId={person.id}
            connections={allUserConnections}
          />
        </div>
      </CardFooter>
    </Card>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数 - 最適化のために必要なプロパティのみ比較
  return (
    prevProps.person.id === nextProps.person.id &&
    prevProps.person.updatedAt === nextProps.person.updatedAt &&
    prevProps.person.name === nextProps.person.name &&
    prevProps.person.company === nextProps.person.company &&
    prevProps.person.hobbies === nextProps.person.hobbies &&
    prevProps.person.primaryFaceAppearancePath === nextProps.person.primaryFaceAppearancePath &&
    prevProps.isSelectedForMerge === nextProps.isSelectedForMerge &&
    prevProps.isSelectedForDeletion === nextProps.isSelectedForDeletion &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.generalActionDisabled === nextProps.generalActionDisabled &&
    prevProps.allUserConnections?.length === nextProps.allUserConnections?.length
  );
});

PeopleListItem.displayName = 'PeopleListItem';

export default PeopleListItem;