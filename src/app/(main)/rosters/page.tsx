"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, PlusCircle } from 'lucide-react';
import { CreateRosterDialog } from '@/components/features/CreateRosterDialog';

const RostersPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Camera className="h-8 w-8 mr-4 text-primary" />
            <h1 className="text-3xl font-bold">Rosters</h1>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Roster
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Image Collection Management</CardTitle>
            <CardDescription>
              This is the place to manage your rosters. You can create new rosters, view and edit past ones, and organize them by tags or events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Roster functionality will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
      <CreateRosterDialog isOpen={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </>
  );
};

export default RostersPage; 