"use client";
import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Person } from '@/shared/types';

interface SimplePeopleMenuProps {
  person: Person;
  onEditClick: () => void;
  onDeleteClick?: () => void;
  disabled?: boolean;
}

export default function SimplePeopleMenu({
  person,
  onEditClick,
  onDeleteClick,
  disabled = false,
}: SimplePeopleMenuProps) {
  console.log('[SimplePeopleMenu] Rendering for person:', person.name);
  
  return (
    <div className="absolute top-2 right-2 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEditClick}>
            <Edit className="mr-2 h-4 w-4" />
            編集
          </DropdownMenuItem>
          {onDeleteClick && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDeleteClick}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}