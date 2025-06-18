
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
    setIsMergeModeActive(prev => {
      const newMode = !prev;
      if (!newMode) { // If turning merge mode OFF
        clearMergeSelection();
      }
      return newMode;
    });
  };

  const handleMerge = async () => {
    if (selectedPeopleForMerge.length === 2) {
      await performMergeOfSelectedPeople();
      setIsMergeModeActive(false); // Turn off merge mode after attempting merge
    }
  };

  const canMerge = selectedPeopleForMerge.length === 2 && !isProcessing;

  return (
    <Card className="flex-grow flex flex-col shadow-lg h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Roster
            </CardTitle>
            <CardDescription className="mt-1">
              {isMergeModeActive 
                ? `Select two people to merge. Selected: ${selectedPeopleForMerge.length}`
                : (roster.length > 0 ? "Manage identified people." : "No people in this roster yet.") }
            </CardDescription>
          </div>
          { roster.length > 1 && ( 
            <Button 
              variant={isMergeModeActive ? "secondary" : "outline"} 
              size="sm" 
              onClick={handleToggleMergeMode}
              className="transition-all whitespace-nowrap"
              disabled={isProcessing} 
            >
              {isMergeModeActive ? <XCircle className="mr-2 h-4 w-4" /> : <Combine className="mr-2 h-4 w-4" />}
              {isMergeModeActive ? "Cancel Merge" : "Merge People"}
            </Button>
          )}
        </div>
        {isMergeModeActive && roster.length > 1 && (
          <Button 
            onClick={handleMerge} 
            disabled={!canMerge} 
            size="sm"
            className="mt-2 w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Merge Selected ({selectedPeopleForMerge.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 md:p-2 lg:p-4 flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        <div className="w-full md:w-2/5 lg:w-1/3 md:pr-2 lg:pr-4 md:border-r border-border md:max-h-full overflow-y-auto">
          {roster.length > 0 ? (
            <RosterList isMergeModeActive={isMergeModeActive} />
          ) : (
             <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-md h-full flex items-center justify-center">
                Create selections on the image and click "Create Roster" to add people.
            </div>
          )}
        </div>
        <div className="w-full md:w-3/5 lg:w-2/3 md:max-h-full flex flex-col">
          <RosterItemDetail />
        </div>
      </CardContent>
    </Card>
  );
};

export default RosterPanel;
