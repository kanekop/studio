
"use client";
import React from 'react';
import RosterList from './RosterList';
import RosterItemDetail from './RosterItemDetail';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useFaceRoster } from '@/contexts/FaceRosterContext';

const RosterPanel = () => {
  const { roster, isProcessing } = useFaceRoster();

  return (
    <Card className="flex-grow flex flex-col shadow-lg h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Roster
            </CardTitle>
            <CardDescription className="mt-1">
              {roster.length > 0 ? "Manage identified people." : "No people in this roster yet." }
            </CardDescription>
          </div>
          {/* Merge UI removed from here */}
        </div>
        {/* Merge UI removed from here */}
      </CardHeader>
      <CardContent className="p-4 md:p-2 lg:p-4 flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        <div className="w-full md:w-2/5 lg:w-1/3 md:pr-2 lg:pr-4 md:border-r border-border md:max-h-full overflow-y-auto">
          {roster.length > 0 ? (
            <RosterList />
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
