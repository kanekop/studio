
"use client";
import React, { useState } from 'react';
import RosterList from './RosterList';
import RosterItemDetail from './RosterItemDetail';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Combine, XCircle, CheckCircle } from 'lucide-react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';

const RosterPanel = () => {
  const { roster, selectedPeopleForMerge, performMergeOfSelectedPeople, clearMergeSelection, isProcessing } = useFaceRoster();
  const [isMergeModeActive, setIsMergeModeActive] = useState(false);

  const handleToggleMergeMode = () => {
    setIsMergeModeActive(prev => !prev);
    if (isMergeModeActive) { // If was active, now turning off
      clearMergeSelection();
    }
  };

  const handleMerge = async () => {
    if (selectedPeopleForMerge.length === 2) {
      await performMergeOfSelectedPeople();
      setIsMergeModeActive(false); // Turn off merge mode after attempting merge
      // clearMergeSelection is called inside performMergeOfSelectedPeople on success/finally
    }
  };

  const canMerge = selectedPeopleForMerge.length === 2 && !isProcessing;

  return (
    <Card className="flex-grow flex flex-col shadow-lg h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline text-xl flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" /> Roster
          </CardTitle>
          { roster.length > 1 && ( // Only show merge button if there's potential to merge
            <Button 
              variant={isMergeModeActive ? "destructive" : "outline"} 
              size="sm" 
              onClick={handleToggleMergeMode}
              className="transition-all"
              disabled={isProcessing} // Disable toggle if global processing is happening
            >
              {isMergeModeActive ? <XCircle className="mr-2 h-4 w-4" /> : <Combine className="mr-2 h-4 w-4" />}
              {isMergeModeActive ? "Cancel Merge" : "Merge People"}
            </Button>
          )}
        </div>
        <CardDescription>
          {isMergeModeActive 
            ? `Select exactly two people from the list below to merge them. Selected: ${selectedPeopleForMerge.length}`
            : "Manage the people identified in the image." }
        </CardDescription>
        {isMergeModeActive && (
          <Button 
            onClick={handleMerge} 
            disabled={!canMerge} 
            size="sm"
            className="mt-2 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Merge Selected ({selectedPeopleForMerge.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 md:p-2 lg:p-4 flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Roster List (Sidebar on larger screens) */}
        <div className="w-full md:w-2/5 lg:w-1/3 md:pr-2 lg:pr-4 md:border-r border-border md:max-h-full overflow-y-auto">
          <RosterList isMergeModeActive={isMergeModeActive} />
        </div>
        {/* Roster Item Detail (Main content on larger screens) */}
        <div className="w-full md:w-3/5 lg:w-2/3 md:max-h-full flex flex-col">
          <RosterItemDetail />
        </div>
      </CardContent>
    </Card>
  );
};

export default RosterPanel;

