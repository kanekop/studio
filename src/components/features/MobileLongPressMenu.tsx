"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MoreVertical, Link2, Edit, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Person } from '@/shared/types';

interface MobileLongPressMenuProps {
  person: Person;
  allPeople: Person[];
  onEditClick: () => void;
  onInitiateConnection: (sourcePersonId: string, targetPersonId: string) => void;
  onToggleMergeSelection?: () => void;
  onToggleDeleteSelection?: () => void;
  onDeleteClick?: () => void;
  isSelectedForMerge?: boolean;
  isSelectedForDeletion?: boolean;
  selectionMode?: 'merge' | 'delete' | 'none';
  disabled?: boolean;
}

export default function MobileLongPressMenu({
  person,
  allPeople,
  onEditClick,
  onInitiateConnection,
  onToggleMergeSelection,
  onToggleDeleteSelection,
  onDeleteClick,
  isSelectedForMerge = false,
  isSelectedForDeletion = false,
  selectionMode = 'none',
  disabled = false,
}: MobileLongPressMenuProps) {
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  
  // Debug state for dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const safePerson = person || {};
  const safeAllPeople = allPeople || [];
  
  // Debug log component mount
  useEffect(() => {
    console.log('[MobileLongPressMenu] Component mounted with props:', {
      person: safePerson,
      disabled,
      selectionMode,
      isSelectedForMerge,
      isSelectedForDeletion
    });
  }, []);
  
  // モバイルデバイスかどうかを判定
  const isMobile = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // 長押し開始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isMobile()) return;
    
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsLongPress(false);

    const timer = setTimeout(() => {
      setIsLongPress(true);
      // ハプティックフィードバック（利用可能な場合）
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms長押し

    setLongPressTimer(timer);
  }, [disabled]);

  // 長押し終了
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    touchStartRef.current = null;
  }, [longPressTimer]);

  // タッチ移動（長押しをキャンセル）
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // 10px以上移動したら長押しをキャンセル
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      setIsLongPress(false);
    }
  }, [longPressTimer]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const handleConnectToPerson = (targetPersonId: string) => {
    if (!('id' in safePerson) || !safePerson.id || typeof safePerson.id !== 'string') return;
    onInitiateConnection(safePerson.id, targetPersonId);
    setIsConnectionDialogOpen(false);
  };

  const availableConnections = safeAllPeople.filter(p => p.id !== ('id' in safePerson ? safePerson.id : ''));

  // Debug logging for dropdown open state change
  const handleDropdownOpenChange = (open: boolean) => {
    console.log('[MobileLongPressMenu] Dropdown open state changing to:', open);
    console.log('[MobileLongPressMenu] Current disabled state:', disabled);
    console.log('[MobileLongPressMenu] Person:', safePerson);
    setIsDropdownOpen(open);
  };

  // Debug click handler
  const handleTriggerClick = (e: React.MouseEvent) => {
    console.log('[MobileLongPressMenu] Trigger button clicked');
    console.log('[MobileLongPressMenu] Event:', e);
    console.log('[MobileLongPressMenu] Is dropdown currently open:', isDropdownOpen);
    // Prevent event bubbling
    e.stopPropagation();
  };

  // 通常のドロップダウンメニュー（デスクトップ用）
  const DropdownMenuComponent = (
    <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-70 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          disabled={disabled}
          onClick={handleTriggerClick}
          data-testid="mobile-menu-trigger"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 z-[100]" 
        sideOffset={5}
        onOpenAutoFocus={(e) => {
          console.log('[MobileLongPressMenu] Dropdown content opened and focused');
        }}
      >
        {console.log('[MobileLongPressMenu] Rendering dropdown content, isDropdownOpen:', isDropdownOpen)}
        <DropdownMenuItem 
          onClick={(e) => {
            console.log('[MobileLongPressMenu] Edit menu item clicked');
            e.stopPropagation();
            onEditClick();
          }} 
          disabled={disabled}
        >
          <Edit className="mr-2 h-4 w-4" />
          編集
        </DropdownMenuItem>
        {selectionMode === 'none' && (
          <DropdownMenuItem 
            onClick={() => setIsConnectionDialogOpen(true)}
            disabled={disabled || availableConnections.length === 0}
          >
            <Link2 className="mr-2 h-4 w-4" />
            コネクション作成
          </DropdownMenuItem>
        )}
        {selectionMode === 'merge' && onToggleMergeSelection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleMergeSelection} disabled={disabled}>
              <UserPlus className="mr-2 h-4 w-4" />
              {isSelectedForMerge ? 'マージ選択解除' : 'マージ対象として選択'}
            </DropdownMenuItem>
          </>
        )}
        {selectionMode === 'delete' && onToggleDeleteSelection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleDeleteSelection} disabled={disabled}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isSelectedForDeletion ? '削除選択解除' : '削除対象として選択'}
            </DropdownMenuItem>
          </>
        )}
        {selectionMode === 'none' && onDeleteClick && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDeleteClick} 
              disabled={disabled}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* タッチイベントハンドラー付きの要素 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={(e) => {
          console.log('[MobileLongPressMenu] Wrapper div clicked');
          e.stopPropagation();
        }}
        className="absolute top-2 right-2 z-50"
        style={{ pointerEvents: 'auto', isolation: 'isolate' }}
      >
        {DropdownMenuComponent}
      </div>

      {/* モバイル用コネクション選択ダイアログ */}
      <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              コネクション作成
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {('name' in safePerson && typeof safePerson.name === 'string' ? safePerson.name : '不明な人')}とつなげる相手を選択してください
            </p>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 p-2">
              {availableConnections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="mx-auto h-8 w-8 mb-2" />
                  <p>コネクション可能な人がいません</p>
                </div>
              ) : (
                availableConnections.map((targetPerson) => (
                  <Button
                    key={targetPerson.id}
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => handleConnectToPerson(targetPerson.id)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src="" alt={targetPerson.name} />
                      <AvatarFallback>
                        {targetPerson.name?.slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{targetPerson.name}</p>
                      {targetPerson.company && (
                        <p className="text-sm text-muted-foreground">
                          {targetPerson.company}
                        </p>
                      )}
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setIsConnectionDialogOpen(false)}
            >
              <X className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}