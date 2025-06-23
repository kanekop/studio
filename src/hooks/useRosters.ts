import { useState, useEffect } from 'react';
import { ImageSet } from '@/shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseRosterRepository } from '@/infrastructure/firebase/repositories/FirebaseRosterRepository';
import { useToast } from '@/hooks/use-toast';

export const useRosters = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [rosters, setRosters] = useState<ImageSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const repository = new FirebaseRosterRepository();

  useEffect(() => {
    if (!currentUser) {
      setRosters([]);
      setIsLoading(false);
      return;
    }

    loadRosters();
  }, [currentUser]);

  const loadRosters = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setError(null);
      const userRosters = await repository.getAllRostersByUser(currentUser.uid);
      setRosters(userRosters);
    } catch (err) {
      setError(err as Error);
      toast({
        title: 'エラー',
        description: '名簿の読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRoster = async (rosterId: string) => {
    try {
      await repository.deleteRoster(rosterId);
      setRosters(rosters.filter(r => r.id !== rosterId));
      toast({
        title: '削除完了',
        description: '名簿を削除しました',
      });
    } catch (err) {
      toast({
        title: 'エラー',
        description: '名簿の削除に失敗しました',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateRoster = async (rosterId: string, updates: Partial<ImageSet>) => {
    try {
      const updated = await repository.updateRosterAndReturn(rosterId, updates);
      setRosters(rosters.map(r => r.id === rosterId ? updated : r));
      return updated;
    } catch (err) {
      toast({
        title: 'エラー',
        description: '名簿の更新に失敗しました',
        variant: 'destructive',
      });
      throw err;
    }
  };

  return {
    rosters,
    isLoading,
    error,
    refetch: loadRosters,
    deleteRoster,
    updateRoster,
  };
};