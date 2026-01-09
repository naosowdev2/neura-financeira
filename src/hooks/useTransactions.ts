import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

export function useTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          account:accounts!transactions_account_id_fkey(*),
          destination_account:accounts!transactions_destination_account_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: false });
      if (error) throw error;
      // Map due_date to date for backwards compatibility
      return (data ?? []).map((t: any) => ({
        ...t,
        date: t.due_date, // Alias for backwards compatibility
      }));
    },
    enabled: !!user,
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: any) => {
      if (!user) throw new Error('Not authenticated');
      
      const transactionData = { ...transaction, user_id: user.id };
      
      // Se é despesa de cartão de crédito, obter/criar a fatura correta
      if (transactionData.credit_card_id && transactionData.type === 'expense' && !transactionData.invoice_id) {
        const { data: invoiceId, error: invoiceError } = await (supabase.rpc as any)('get_or_create_invoice', {
          p_credit_card_id: transactionData.credit_card_id,
          p_transaction_date: transactionData.due_date,
          p_user_id: user.id,
        });
        
        if (invoiceError) throw invoiceError;
        transactionData.invoice_id = invoiceId;
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Lançamento criado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase
        .from('transactions') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Lançamento atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Lançamento excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Update recurring transaction with scope option
  const updateRecurringTransaction = useMutation({
    mutationFn: async ({ 
      id, 
      scope, 
      updates,
      recurrenceId,
      transactionDate
    }: { 
      id: string; 
      scope: 'this_only' | 'this_and_future';
      updates: Record<string, any>;
      recurrenceId: string | null;
      transactionDate: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (scope === 'this_only') {
        // Update only this transaction and unlink from recurrence
        const { error } = await (supabase.from('transactions') as any)
          .update({
            ...updates,
            recurrence_id: null,
            is_recurring: false,
          })
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Update this transaction
        const { error: txError } = await (supabase.from('transactions') as any)
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);
        if (txError) throw txError;

        if (recurrenceId) {
          // Update the recurrence rule
          const { error: recError } = await (supabase.from('recurrences') as any)
            .update({
              amount: updates.amount,
              category_id: updates.category_id,
              description: updates.description,
            })
            .eq('id', recurrenceId)
            .eq('user_id', user.id);
          if (recError) throw recError;

          // Update all future pending transactions
          const { error: futureError } = await (supabase.from('transactions') as any)
            .update({
              amount: updates.amount,
              category_id: updates.category_id,
              description: updates.description,
            })
            .eq('recurrence_id', recurrenceId)
            .eq('status', 'pending')
            .eq('user_id', user.id)
            .gt('due_date', transactionDate);
          if (futureError) throw futureError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['recurrences'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Lançamento atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Delete recurring transaction with scope option
  const deleteRecurringTransaction = useMutation({
    mutationFn: async ({ 
      id, 
      scope,
      recurrenceId,
      transactionDate
    }: { 
      id: string; 
      scope: 'this_only' | 'this_and_future';
      recurrenceId: string | null;
      transactionDate: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (scope === 'this_only') {
        // Delete only this transaction
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        if (recurrenceId) {
          // Set end_date on recurrence to end the cycle
          const endDate = format(subDays(new Date(transactionDate + 'T12:00:00'), 1), 'yyyy-MM-dd');
          const { error: recError } = await (supabase.from('recurrences') as any)
            .update({
              end_date: endDate,
              is_active: false,
            })
            .eq('id', recurrenceId)
            .eq('user_id', user.id);
          if (recError) throw recError;

          // Delete this and all future pending transactions
          const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('recurrence_id', recurrenceId)
            .eq('status', 'pending')
            .eq('user_id', user.id)
            .gte('due_date', transactionDate);
          if (deleteError) throw deleteError;
        } else {
          // No recurrence, just delete this transaction
          const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['recurrences'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Lançamento excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Update installment transaction with scope option
  const updateInstallmentTransaction = useMutation({
    mutationFn: async ({ 
      id, 
      scope, 
      updates,
      installmentGroupId,
      installmentNumber,
      totalInstallments,
    }: { 
      id: string; 
      scope: 'this_only' | 'this_and_future';
      updates: Record<string, any>;
      installmentGroupId: string;
      installmentNumber: number;
      totalInstallments: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (scope === 'this_only') {
        // Update only this installment
        const { error } = await (supabase.from('transactions') as any)
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Update this and all future pending installments
        const { error } = await (supabase.from('transactions') as any)
          .update({ amount: updates.amount })
          .eq('installment_group_id', installmentGroupId)
          .gte('installment_number', installmentNumber)
          .eq('status', 'pending')
          .eq('user_id', user.id);
        if (error) throw error;
        
        // Update the installment_amount in the group
        const { error: groupError } = await (supabase.from('installment_groups') as any)
          .update({ installment_amount: updates.amount })
          .eq('id', installmentGroupId)
          .eq('user_id', user.id);
        if (groupError) throw groupError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Parcela atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Delete installment transaction with scope option
  const deleteInstallmentTransaction = useMutation({
    mutationFn: async ({ 
      id, 
      scope,
      installmentGroupId,
      installmentNumber,
    }: { 
      id: string; 
      scope: 'this_only' | 'this_and_future';
      installmentGroupId: string;
      installmentNumber: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (scope === 'this_only') {
        // Delete only this installment
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Delete this and all future pending installments
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('installment_group_id', installmentGroupId)
          .gte('installment_number', installmentNumber)
          .eq('status', 'pending')
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
      toast.success('Parcela excluída!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    transactions: transactionsQuery.data ?? [],
    isLoading: transactionsQuery.isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    updateInstallmentTransaction,
    deleteInstallmentTransaction,
  };
}
