import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Camera } from 'lucide-react';

const RostersPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Camera className="h-8 w-8 mr-4 text-primary" />
        <h1 className="text-3xl font-bold">Rosters</h1>
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
  );
};

export default RostersPage; 