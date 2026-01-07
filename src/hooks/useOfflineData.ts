import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  getCachedData, 
  setCachedData, 
  addPendingMutation,
  PendingMutation 
} from '@/lib/offlineStorage';

interface UseOfflineDataOptions<T> {
  queryKey: string[];
  cacheKey: string;
  fetchFn: () => Promise<T[]>;
  enabled?: boolean;
}

export function useOfflineCache<T>(options: UseOfflineDataOptions<T>) {
  const { queryKey, cacheKey, fetchFn, enabled = true } = options;
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

  // Load cached data on mount
  useEffect(() => {
    if (!enabled || hasInitialized.current) return;
    
    const loadCachedData = async () => {
      const cached = await getCachedData<T[]>(cacheKey);
      if (cached && cached.length > 0) {
        // Populate query cache with offline data
        queryClient.setQueryData(queryKey, cached);
      }
      hasInitialized.current = true;
    };
    
    loadCachedData();
  }, [cacheKey, queryKey, queryClient, enabled]);

  // Save data to cache after successful fetch
  const saveToCache = useCallback(async (data: T[]) => {
    if (data && data.length > 0) {
      await setCachedData(cacheKey, data);
    }
  }, [cacheKey]);

  // Queue mutation for offline sync
  const queueMutation = useCallback(async (
    type: PendingMutation['type'],
    table: PendingMutation['table'],
    data: Record<string, unknown>
  ) => {
    await addPendingMutation({ type, table, data });
  }, []);

  // Check if we're online
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return {
    saveToCache,
    queueMutation,
    isOnline,
  };
}

// Helper to wrap mutations with offline support
export function withOfflineSupport<T extends Record<string, unknown>>(
  mutationFn: (data: T) => Promise<any>,
  queueMutation: (type: PendingMutation['type'], table: PendingMutation['table'], data: Record<string, unknown>) => Promise<void>,
  table: PendingMutation['table'],
  type: PendingMutation['type']
) {
  return async (data: T) => {
    if (navigator.onLine) {
      return mutationFn(data);
    } else {
      // Queue for later sync
      await queueMutation(type, table, data as Record<string, unknown>);
      // Return optimistic response
      return { ...data, id: data.id || crypto.randomUUID(), _offline: true };
    }
  };
}
