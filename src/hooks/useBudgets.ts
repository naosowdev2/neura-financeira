import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export function useBudgets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const budgetsQuery = useQuery({
    queryKey: ['budgets', user?.id, monthStart],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select(`*, category:categories(*)`)
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;

      // Calculate spent amount for each budget
      const budgetsWithSpending = await Promise.all(
        (budgets || []).map(async (budget: any) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('category_id', budget.category_id)
            .eq('type', 'expense')
            .eq('status', 'confirmed')
            .gte('date', monthStart)
            .lte('date', monthEnd);

          const spent = (transactions || []).reduce(
            (sum: number, t: any) => sum + Number(t.amount),
            0
          );

          return {
            ...budget,
            spent,
            remaining: Number(budget.amount) - spent,
            percentage: (spent / Number(budget.amount)) * 100,
          };
        })
      );

      return budgetsWithSpending;
    },
    enabled: !!user,
  });

  const createBudget = useMutation({
    mutationFn: async (budget: any) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...budget, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Orçamento criado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase
        .from('budgets') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Orçamento atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Orçamento excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    budgets: budgetsQuery.data ?? [],
    isLoading: budgetsQuery.isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
