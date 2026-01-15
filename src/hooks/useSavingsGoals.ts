import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: number | null;
  current_amount: number;
  icon: string;
  color: string;
  deadline: string | null;
  is_completed: boolean;
  parent_account_id: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to get typed access to savings_goals table
const savingsGoalsTable = () => (supabase as any).from('savings_goals');

export function useSavingsGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const savingsGoalsQuery = useQuery({
    queryKey: ['savings-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await savingsGoalsTable()
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavingsGoal[];
    },
    enabled: !!user,
  });

  const createSavingsGoal = useMutation({
    mutationFn: async (goal: {
      name: string;
      description?: string;
      target_amount?: number;
      icon?: string;
      color?: string;
      deadline?: string;
      parent_account_id?: string;
    }) => {
      const { data, error } = await savingsGoalsTable()
        .insert({
          user_id: user!.id,
          name: goal.name,
          description: goal.description || null,
          target_amount: goal.target_amount || null,
          icon: goal.icon || 'piggy-bank',
          color: goal.color || '#10b981',
          deadline: goal.deadline || null,
          parent_account_id: goal.parent_account_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Cofrinho criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar cofrinho');
      console.error(error);
    },
  });

  const updateSavingsGoal = useMutation({
    mutationFn: async (goal: {
      id: string;
      name?: string;
      description?: string;
      target_amount?: number;
      icon?: string;
      color?: string;
      deadline?: string | null;
      is_completed?: boolean;
    }) => {
      const { id, ...updates } = goal;
      const { data, error } = await savingsGoalsTable()
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Cofrinho atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar cofrinho');
      console.error(error);
    },
  });

  const deleteSavingsGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savingsGoalsTable()
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Cofrinho excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir cofrinho');
      console.error(error);
    },
  });

  const contribute = useMutation({
    mutationFn: async ({ id, amount, accountId }: { id: string; amount: number; accountId?: string }) => {
      const goal = savingsGoalsQuery.data?.find(g => g.id === id);
      if (!goal) throw new Error('Cofrinho não encontrado');

      const newAmount = goal.current_amount + amount;
      const isCompleted = goal.target_amount ? newAmount >= goal.target_amount : false;

      // Create transaction if account is provided
      // Deposit: money comes FROM account (account_id), destination_account_id must be null
      if (accountId && user) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'transfer',
            amount: amount,
            description: `Depósito: ${goal.name}`,
            date: new Date().toISOString().split('T')[0],
            account_id: accountId,
            destination_account_id: null,
            status: 'confirmed',
            savings_goal_id: id,
            notes: 'savings_deposit',
          } as any);

        if (txError) throw txError;
      }

      const { data, error } = await savingsGoalsTable()
        .update({ 
          current_amount: newAmount,
          is_completed: isCompleted,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: (data: SavingsGoal) => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      if (data.is_completed) {
        toast.success('Parabéns! Meta atingida! 🎉');
      } else {
        toast.success('Contribuição adicionada!');
      }
    },
    onError: (error) => {
      toast.error('Erro ao adicionar contribuição');
      console.error(error);
    },
  });

  const withdraw = useMutation({
    mutationFn: async ({ id, amount, accountId }: { id: string; amount: number; accountId?: string }) => {
      const goal = savingsGoalsQuery.data?.find(g => g.id === id);
      if (!goal) throw new Error('Cofrinho não encontrado');

      const newAmount = Math.max(0, goal.current_amount - amount);

      // Create transaction if account is provided
      // Withdrawal: money goes TO account (destination_account_id), account_id must be null
      if (accountId && user) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'transfer',
            amount: amount,
            description: `Resgate: ${goal.name}`,
            date: new Date().toISOString().split('T')[0],
            account_id: null,
            destination_account_id: accountId,
            status: 'confirmed',
            savings_goal_id: id,
            notes: 'savings_withdrawal',
          } as any);

        if (txError) throw txError;
      }

      const { data, error } = await savingsGoalsTable()
        .update({ 
          current_amount: newAmount,
          is_completed: false,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Valor retirado do cofrinho');
    },
    onError: (error) => {
      toast.error('Erro ao retirar valor');
      console.error(error);
    },
  });

  // Add interest/yield without creating a transaction (internal adjustment)
  const addInterest = useMutation({
    mutationFn: async ({ id, amount, description }: { id: string; amount: number; description?: string }) => {
      const goal = savingsGoalsQuery.data?.find(g => g.id === id);
      if (!goal) throw new Error('Cofrinho não encontrado');

      const newAmount = goal.current_amount + amount;
      const isCompleted = goal.target_amount ? newAmount >= goal.target_amount : false;

      // Create an internal transaction record for history (no account involved)
      if (user) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'income',
            amount: amount,
            description: description || `Rendimento: ${goal.name}`,
            date: new Date().toISOString().split('T')[0],
            account_id: null,
            destination_account_id: null,
            status: 'confirmed',
            savings_goal_id: id,
            notes: 'savings_interest',
          } as any);

        if (txError) throw txError;
      }

      const { data, error } = await savingsGoalsTable()
        .update({ 
          current_amount: newAmount,
          is_completed: isCompleted,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: (data: SavingsGoal) => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      if (data.is_completed) {
        toast.success('Parabéns! Meta atingida com rendimentos! 🎉');
      } else {
        toast.success('Rendimento adicionado ao cofrinho!');
      }
    },
    onError: (error) => {
      toast.error('Erro ao adicionar rendimento');
      console.error(error);
    },
  });

  return {
    savingsGoals: savingsGoalsQuery.data || [],
    isLoading: savingsGoalsQuery.isLoading,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contribute,
    withdraw,
    addInterest,
  };
}
