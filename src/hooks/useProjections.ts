import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface ProjectionTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  due_date: string;
  competency_date?: string;
  status: string;
  is_recurring?: boolean;
  category?: {
    name: string;
    color: string | null;
  } | null;
}

export interface ProjectionData {
  initialBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  incomeTransactions: ProjectionTransaction[];
  expenseTransactions: ProjectionTransaction[];
  hasProjectedInitialBalance: boolean;
  pendingCountBeforeMonth: number;
}

export function useProjections(selectedDate: Date) {
  const { user } = useAuth();
  const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['projections', user?.id, monthStart],
    queryFn: async (): Promise<ProjectionData | null> => {
      if (!user) return null;

      // Fetch accounts for initial balances
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .eq('include_in_total', true);

      // Calculate account initial balances sum
      const accountInitialBalances = (accounts || [])
        .reduce((sum, a) => sum + Number(a.initial_balance), 0);

      // Fetch all transactions (confirmed AND pending) before the month to calculate initial balance
      // For projections, we treat pending as if they will be confirmed
      const { data: transactionsBeforeMonth } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .lt('due_date', monthStart)
        .is('credit_card_id', null);

      // Filter out savings goal transactions for balance calculation
      const validTransactionsBeforeMonth = (transactionsBeforeMonth || []).filter(t => !t.savings_goal_id);
      
      // Count pending transactions before this month
      const pendingBeforeMonth = validTransactionsBeforeMonth.filter(t => t.status === 'pending');
      const hasProjectedInitialBalance = pendingBeforeMonth.length > 0;
      const pendingCountBeforeMonth = pendingBeforeMonth.length;

      const balanceBeforeMonth = validTransactionsBeforeMonth.reduce((sum, t) => {
        if (t.type === 'income') return sum + Number(t.amount);
        if (t.type === 'expense') return sum - Number(t.amount);
        if (t.type === 'transfer') return sum - Number(t.amount);
        return sum;
      }, 0);

      const initialBalance = accountInitialBalances + balanceBeforeMonth;

      // Fetch all transactions for the selected month
      const { data: monthTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color)
        `)
        .eq('user_id', user.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .is('credit_card_id', null)
        .order('due_date');

      // Filter out savings goal transactions
      const validTransactions = (monthTransactions || []).filter(t => !t.savings_goal_id);

      // Separate income and expense transactions
      const incomeTransactions: ProjectionTransaction[] = validTransactions
        .filter(t => t.type === 'income')
        .map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount),
          due_date: t.due_date,
          competency_date: t.competency_date,
          status: t.status,
          is_recurring: t.is_recurring,
          category: t.category,
        }));

      const expenseTransactions: ProjectionTransaction[] = validTransactions
        .filter(t => t.type === 'expense')
        .map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount),
          due_date: t.due_date,
          competency_date: t.competency_date,
          status: t.status,
          is_recurring: t.is_recurring,
          category: t.category,
        }));

      // Calculate totals
      const projectedIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const projectedExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const projectedBalance = initialBalance + projectedIncome - projectedExpenses;

      return {
        initialBalance,
        projectedIncome,
        projectedExpenses,
        projectedBalance,
        incomeTransactions,
        expenseTransactions,
        hasProjectedInitialBalance,
        pendingCountBeforeMonth,
      };
    },
    enabled: !!user,
  });
}
