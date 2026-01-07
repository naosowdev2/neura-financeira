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
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('status', 'pending')
        .or(`date.lt.${monthStart},date.gt.${monthEnd}`)
        .order('date');

      if (error) throw error;

      const transactions = data || [];
      const count = transactions.length;
      const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      return { count, total, transactions };
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
