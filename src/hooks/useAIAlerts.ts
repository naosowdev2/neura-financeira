import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Alert {
  id: string;
  type: 'budget' | 'balance' | 'pattern' | 'insight' | 'invoice' | 'savings';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: 'reduce_spending' | 'review_budget' | 'add_income' | 'view_details';
  metadata?: Record<string, any>;
}

export function useAIAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Listen to financial data changes and invalidate alerts
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.query.state.status === 'success') {
        const key = event.query.queryKey[0];
        // Invalidate alerts when financial data changes
        if (['transactions', 'accounts', 'savings-goals', 'dashboard', 'budgets', 'credit-cards', 'invoices'].includes(key as string)) {
          queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const alertsQuery = useQuery({
    queryKey: ['ai-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.functions.invoke('ai-alerts-monitor', {
        body: { userId: user.id },
      });

      if (error) {
        console.error('Error fetching AI alerts:', error);
        return [];
      }

      return (data?.alerts || []) as Alert[];
    },
    enabled: !!user,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes (backup)
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });

  return {
    alerts: alertsQuery.data ?? [],
    isLoading: alertsQuery.isLoading,
    refetch: alertsQuery.refetch,
  };
}
