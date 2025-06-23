"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, Users, Calendar, Tag, MapPin, Camera as CameraIcon } from 'lucide-react';
import { FirebaseRosterRepository } from '@/infrastructure/firebase/repositories/FirebaseRosterRepository';
import { ImageSet } from '@/shared/types';
import { useStorageImage } from '@/hooks/useStorageImage';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { EditRosterDialog } from '@/components/features/EditRosterDialog';
import { Badge } from '@/components/ui/badge';

const RosterDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const rosterId = params.rosterId as string;
  const [rosterData, setRosterData] = useState<ImageSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { imageUrl: originalImageUrl, isLoading: isImageLoading } = useStorageImage(
    rosterData?.originalImageStoragePath
  );

  useEffect(() => {
    if (!currentUser || !rosterId) return;
    
    loadRoster();
  }, [currentUser, rosterId]);

  const loadRoster = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const repository = new FirebaseRosterRepository();
      const roster = await repository.getRosterById(rosterId);
      
      if (!roster) {
        setError('名簿が見つかりません');
        return;
      }
      
      if (roster.ownerId !== currentUser?.uid) {
        setError('この名簿を表示する権限がありません');
        return;
      }
      
      setRosterData(roster);
    } catch (err) {
      console.error('Failed to load roster:', err);
      setError('名簿の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRoster = (updatedRoster: ImageSet) => {
    setRosterData(updatedRoster);
  };

  const formatDate = (date: any) => {
    if (!date) return '不明';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return format(d, 'yyyy年MM月dd日', { locale: ja });
    } catch {
      return '不明';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Skeleton className="aspect-[4/3]" />
            <CardContent className="p-6">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/rosters')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          名簿一覧に戻る
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => router.push('/rosters')}>
              名簿一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rosterData) return null;

  return (
    <>
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/rosters')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            名簿一覧に戻る
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            編集
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Image and Details */}
          <Card>
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
              {isImageLoading ? (
                <Skeleton className="absolute inset-0" />
              ) : originalImageUrl ? (
                <img
                  src={originalImageUrl}
                  alt={rosterData.rosterName}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <CameraIcon className="h-16 w-16" />
                </div>
              )}
            </div>
            
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold mb-4">{rosterData.rosterName}</h1>
              
              {rosterData.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {rosterData.description}
                </p>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{rosterData.peopleIds?.length || 0}人が登録されています</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>作成日: {formatDate(rosterData.createdAt)}</span>
                </div>

                {rosterData.imageMetadata?.capturedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <CameraIcon className="h-4 w-4 text-gray-500" />
                    <span>撮影日: {formatDate(rosterData.imageMetadata.capturedAt)}</span>
                  </div>
                )}

                {rosterData.imageMetadata?.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>
                      {rosterData.imageMetadata.location.placeName || 
                       `${rosterData.imageMetadata.location.latitude.toFixed(6)}, ${rosterData.imageMetadata.location.longitude.toFixed(6)}`}
                    </span>
                  </div>
                )}

                {rosterData.tags && rosterData.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-gray-500" />
                    {rosterData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column: People in Roster */}
          <Card>
            <CardHeader>
              <CardTitle>登録された人物</CardTitle>
            </CardHeader>
            <CardContent>
              {rosterData.peopleIds && rosterData.peopleIds.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    この名簿には{rosterData.peopleIds.length}人が登録されています。
                  </p>
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      人物の詳細管理機能は開発中です
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">
                    まだ人物が登録されていません
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    画像から顔を識別して人物を登録できます
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EditRosterDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        roster={rosterData}
        onUpdate={handleUpdateRoster}
      />
    </>
  );
};

export default RosterDetailPage;