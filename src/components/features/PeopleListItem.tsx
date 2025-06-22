"use client";
import React from 'react';
import type { Person, Connection } from '@/shared/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Users, Home, Briefcase, Heart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils/utils';
import { useStorageImage } from '@/hooks/useStorageImage.improved';
import { usePersonConnections } from '@/presentation/hooks/usePersonConnections';
import OptimizedImage from '@/components/ui/optimized-image';
import SimplePeopleMenu from './SimplePeopleMenu';

interface PeopleListItemProps {
  person: Person;
  onEditClick: (person: Person) => void;
  onDeleteClick: (person: Person) => void;
  connections: Connection[];
}

const PeopleListItem: React.FC<PeopleListItemProps> = React.memo(({
  person,
  onEditClick,
  onDeleteClick,
  connections,
}) => {

  const imagePath = person.primaryFaceAppearancePath || person.faceAppearances?.[0]?.faceImageStoragePath;
  const { url: displayImageUrl, isLoading: isImageLoading } = useStorageImage(imagePath, {
    fallbackUrl: "https://placehold.co/300x300.png?text=No+Image",
    enableCache: true,
  });

  const connectionCounts = usePersonConnections(person.id, connections);
  const rosterCount = person.rosterIds?.length || 0;

  const handleEdit = () => onEditClick(person);
  const handleDelete = () => onDeleteClick(person);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Avoid triggering edit when clicking on the menu itself
    if ((e.target as HTMLElement).closest('[data-radix-dropdown-menu-trigger]')) {
      return;
    }
    handleEdit();
  };
  
  return (
    <Card
      className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden relative group"
      )}
    >
      <SimplePeopleMenu
        person={person}
        onEditClick={handleEdit}
        onDeleteClick={handleDelete}
      />
      
      <div onClick={handleCardClick} className="cursor-pointer">
        <CardHeader className="p-0">
          <div className="aspect-square w-full relative bg-muted">
            {isImageLoading ? (
              <Skeleton className="w-full h-full rounded-t-lg" />
            ) : (
              <OptimizedImage
                src={displayImageUrl || "https://placehold.co/300x300.png?text=No+Image"}
                alt={`Face of ${person?.name || 'Unknown'}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                objectFit="cover"
                priority={false}
                className="rounded-t-lg"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 flex-grow">
          <CardTitle className="text-lg font-semibold truncate" title={person?.name || 'Unknown'}>
            {person?.name || 'Unknown'}
          </CardTitle>
          {person?.company && (
            <p className="text-xs text-muted-foreground truncate" title={person.company}>{person.company}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5 items-center text-xs text-muted-foreground">
            {connectionCounts.general > 0 && (
              <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.general} general connection(s)`}>
                <Users className="h-3.5 w-3.5 mr-1 text-sky-600" /> {connectionCounts.general}
              </span>
            )}
            {connectionCounts.family > 0 && (
              <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.family} family connection(s)`}>
                <Home className="h-3.5 w-3.5 mr-1 text-green-600" /> {connectionCounts.family}
              </span>
            )}
            {connectionCounts.professional > 0 && (
              <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.professional} professional connection(s)`}>
                <Briefcase className="h-3.5 w-3.5 mr-1 text-indigo-600" /> {connectionCounts.professional}
              </span>
            )}
            {connectionCounts.partner > 0 && (
              <span className="flex items-center p-1 bg-muted rounded-sm" title={`${connectionCounts.partner} partner connection(s)`}>
                <Heart className="h-3.5 w-3.5 mr-1 text-red-600" /> {connectionCounts.partner}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-3 border-t bg-muted/30">
          <div className="flex items-center text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            <span>In {rosterCount} Roster{rosterCount !== 1 ? 's' : ''}</span>
          </div>
        </CardFooter>
      </div>
    </Card>
  );
});

PeopleListItem.displayName = "PeopleListItem";

export default PeopleListItem;