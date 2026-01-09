import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export function useOtherMonthsPending(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['other-months-pending', user?.id, monthStart],
    queryFn: async () => {
      if (!user) return { count: 0, total: 0, transactions: [] };

      // Pending expenses OUTSIDE the selected month with full data
      const { data, error } = await (supabase
        .from('transactions') as any)
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('status', 'pending')
        .or(`due_date.lt.${monthStart},due_date.gt.${monthEnd}`)
        .order('due_date');

      if (error) throw error;

      // Add date alias for backwards compatibility
      const transactions = (data || []).map((t: any) => ({ ...t, date: t.due_date }));
      const count = transactions.length;
      const total = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      return { count, total, transactions };
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
