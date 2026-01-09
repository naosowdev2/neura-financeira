import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SavingsGoalTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  accountName: string | null;
}

export function useSavingsGoalHistory(goalId: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['savings-goal-history', goalId],
    queryFn: async () => {
      // Fetch transactions for this savings goal
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          date,
          notes,
          account_id,
          destination_account_id
        `)
        .eq('savings_goal_id', goalId)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch all accounts to get names
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user?.id || '');

      const accountMap = new Map((accounts || []).map((a: { id: string; name: string }) => [a.id, a.name]));

      // Transform to our format
      // Use fallback logic for legacy data that might have inverted account_id/destination_account_id
      const history: SavingsGoalTransaction[] = (transactions || []).map(t => {
        const isWithdrawal = t.notes === 'savings_withdrawal';
        // Withdrawal: money goes TO account (destination_account_id), fallback to account_id for legacy
        // Deposit: money comes FROM account (account_id), fallback to destination_account_id for legacy
        const accountId = isWithdrawal 
          ? (t.destination_account_id || t.account_id)
          : (t.account_id || t.destination_account_id);
        
        return {
          id: t.id,
          type: isWithdrawal ? 'withdrawal' : 'deposit',
          amount: t.amount,
          date: t.date,
          accountName: accountId ? accountMap.get(accountId) || null : null,
        };
      });

      return history;
    },
    enabled: !!user && !!goalId,
  });

  return {
    history: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
