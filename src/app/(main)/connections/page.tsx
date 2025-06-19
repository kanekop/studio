'use client';

import React from 'react';
import { Network, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ManageConnectionsPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
                    <Network className="inline-block mr-3 h-8 w-8" />
                    Manage Connections
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Under Construction</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This page is currently under construction. Here you will be able to manage all connections between people.
                    </p>
                    <div className="mt-4 max-w-sm">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search connections..." className="pl-8" disabled />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 