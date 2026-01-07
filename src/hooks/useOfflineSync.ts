import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getPendingMutations, 
  removePendingMutation, 
  setLastSyncTime,
  getOfflineDataSummary,
  PendingMutation 
} from '@/lib/offlineStorage';
import { toast } from 'sonner';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export function useOfflineSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada', {
        description: 'Sincronizando dados...',
      });
      syncPendingMutations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sem conexão', {
        description: 'Suas alterações serão salvas localmente.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial state
  useEffect(() => {
    loadOfflineState();
  }, []);

  const loadOfflineState = useCallback(async () => {
    const summary = await getOfflineDataSummary();
    setPendingCount(summary.pendingMutations);
    setLastSync(summary.lastSync);
  }, []);

  // Process a single mutation - using type assertions to handle Supabase's strict typing
  const processMutation = async (mutation: PendingMutation): Promise<boolean> => {
    try {
      const { table, type, data } = mutation;
      const supabaseClient = supabase as any;
      
      switch (type) {
        case 'create': {
          const { error } = await supabaseClient.from(table).insert(data);
          if (error) throw error;
          break;
        }
        case 'update': {
          const { id, ...updateData } = data;
          const { error } = await supabaseClient
            .from(table)
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user?.id);
          if (error) throw error;
          break;
        }
        case 'delete': {
          const { error } = await supabaseClient
            .from(table)
            .delete()
            .eq('id', data.id)
            .eq('user_id', user?.id);
          if (error) throw error;
          break;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error processing mutation:', error);
      return false;
    }
  };

  // Sync all pending mutations
  const syncPendingMutations = useCallback(async () => {
    if (!isOnline || !user) return;
    
    const mutations = await getPendingMutations();
    if (mutations.length === 0) {
      await setLastSyncTime();
      await loadOfflineState();
      return;
    }
    
    setSyncStatus('syncing');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const mutation of mutations) {
      const success = await processMutation(mutation);
      if (success) {
        await removePendingMutation(mutation.id);
        successCount++;
      } else {
        failCount++;
      }
    }
    
    await setLastSyncTime();
    await loadOfflineState();
    
    if (failCount === 0 && successCount > 0) {
      setSyncStatus('success');
      toast.success('Sincronização concluída', {
        description: `${successCount} alteração(ões) sincronizada(s).`,
      });
    } else if (failCount > 0) {
      setSyncStatus('error');
      toast.error('Erro na sincronização', {
        description: `${failCount} alteração(ões) não puderam ser sincronizadas.`,
      });
    } else {
      setSyncStatus('idle');
    }
    
    // Reset status after 3 seconds
    setTimeout(() => setSyncStatus('idle'), 3000);
  }, [isOnline, user, loadOfflineState]);

  // Force sync
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Sem conexão', {
        description: 'Conecte-se à internet para sincronizar.',
      });
      return;
    }
    
    await syncPendingMutations();
  }, [isOnline, syncPendingMutations]);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && user) {
      syncPendingMutations();
    }
  }, [isOnline, user]);

  return {
    isOnline,
    pendingCount,
    syncStatus,
    lastSync,
    forceSync,
    refreshState: loadOfflineState,
  };
}
