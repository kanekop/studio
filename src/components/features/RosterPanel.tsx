
"use client";
import React from 'react';
import RosterList from './RosterList';
import RosterItemDetail from './RosterItemDetail';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

const RosterPanel = () => {
  return (
    <Card className="flex-grow flex flex-col shadow-lg h-full">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-xl flex items-center">
          <Users className="mr-2 h-5 w-5 text-primary" /> Roster
        </CardTitle>
        <CardDescription>Manage the people identified in the image.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-2 lg:p-4 flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Roster List (Sidebar on larger screens) */}
        <div className="w-full md:w-2/5 lg:w-1/3 md:pr-2 lg:pr-4 md:border-r border-border md:max-h-full overflow-y-auto">
          <RosterList />
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
