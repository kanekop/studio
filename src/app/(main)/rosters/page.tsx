"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, PlusCircle, Search, Filter, LayoutGrid, List } from 'lucide-react';
import { CreateRosterDialog } from '@/components/features/CreateRosterDialog';
import { EditRosterDialog } from '@/components/features/EditRosterDialog';
import { DeleteRosterDialog } from '@/components/features/DeleteRosterDialog';
import { RosterGrid } from '@/components/features/RosterGrid';
import { RosterFilterPanel } from '@/components/features/RosterFilterPanel';
import { useRosters } from '@/hooks/useRosters';
import { ImageSet } from '@/shared/types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

const RostersPage = () => {
  const router = useRouter();
  const { rosters, isLoading, refetch, deleteRoster, updateRoster } = useRosters();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRoster, setEditingRoster] = useState<ImageSet | null>(null);
  const [deletingRoster, setDeletingRoster] = useState<ImageSet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'peopleCount'>('createdAt');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [peopleCountRange, setPeopleCountRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Get all unique tags from rosters
  const allTags = Array.from(
    new Set(rosters.flatMap((roster) => roster.tags || []))
  );

  // Get max people count
  const maxPeopleCount = Math.max(
    ...rosters.map((roster) => roster.peopleIds?.length || 0),
    10 // minimum max
  );

  // Filter and sort rosters
  const filteredRosters = rosters
    .filter((roster) => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          roster.rosterName.toLowerCase().includes(query) ||
          roster.description?.toLowerCase().includes(query) ||
          roster.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const rosterTags = roster.tags || [];
        const hasSelectedTag = selectedTags.some(tag => rosterTags.includes(tag));
        if (!hasSelectedTag) return false;
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const rosterDate = roster.createdAt?.toDate ? roster.createdAt.toDate() : new Date(roster.createdAt);
        if (dateRange.start && rosterDate < dateRange.start) return false;
        if (dateRange.end && rosterDate > dateRange.end) return false;
      }

      // People count filter
      const peopleCount = roster.peopleIds?.length || 0;
      if (peopleCountRange.min !== null && peopleCount < peopleCountRange.min) return false;
      if (peopleCountRange.max !== null && peopleCount > peopleCountRange.max) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.rosterName.localeCompare(b.rosterName);
        case 'peopleCount':
          return (b.peopleIds?.length || 0) - (a.peopleIds?.length || 0);
        case 'createdAt':
        default:
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bDate.getTime() - aDate.getTime();
      }
    });

  const handleCreateSuccess = () => {
    refetch();
  };

  const handleEditRoster = (roster: ImageSet) => {
    setEditingRoster(roster);
  };

  const handleDeleteRoster = (roster: ImageSet) => {
    setDeletingRoster(roster);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRoster) return;

    try {
      await deleteRoster(deletingRoster.id);
      setDeletingRoster(null);
    } catch (error) {
      console.error('Failed to delete roster:', error);
    }
  };

  const handleSelectRoster = (roster: ImageSet) => {
    // Navigate to roster detail page (to be implemented)
    router.push(`/rosters/${roster.id}`);
  };

  const handleUpdateRoster = (updatedRoster: ImageSet) => {
    // The hook will handle updating the state
    setEditingRoster(null);
  };

  const resetFilters = () => {
    setSelectedTags([]);
    setDateRange({ start: null, end: null });
    setPeopleCountRange({ min: null, max: null });
  };

  return (
    <>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Camera className="h-8 w-8 mr-4 text-primary" />
            <h1 className="text-3xl font-bold">名簿管理</h1>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="名簿を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="並び替え" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">作成日時</SelectItem>
              <SelectItem value="name">名前順</SelectItem>
              <SelectItem value="peopleCount">人数順</SelectItem>
            </SelectContent>
          </Select>

          <RosterFilterPanel
            availableTags={allTags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            peopleCountRange={peopleCountRange}
            onPeopleCountRangeChange={setPeopleCountRange}
            maxPeopleCount={maxPeopleCount}
            onReset={resetFilters}
          />

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Roster Grid */}
        <RosterGrid
          rosters={filteredRosters}
          isLoading={isLoading}
          viewMode={viewMode}
          onEditRoster={handleEditRoster}
          onDeleteRoster={handleDeleteRoster}
          onSelectRoster={handleSelectRoster}
        />
      </div>

      {/* Dialogs */}
      <CreateRosterDialog 
        isOpen={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
      
      <EditRosterDialog
        isOpen={!!editingRoster}
        onOpenChange={(open) => !open && setEditingRoster(null)}
        roster={editingRoster}
        onUpdate={handleUpdateRoster}
      />
      
      <DeleteRosterDialog
        isOpen={!!deletingRoster}
        onOpenChange={(open) => !open && setDeletingRoster(null)}
        roster={deletingRoster}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default RostersPage; 