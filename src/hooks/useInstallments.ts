import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { parseDateOnly, formatDateOnly } from '@/lib/utils';
import type { InstallmentGroup, CreateInstallmentInput, FrequencyType } from '@/types/financial';

function addIntervalByFrequency(date: Date, frequency: FrequencyType, intervals: number): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, intervals);
    case 'weekly':
      return addWeeks(date, intervals);
    case 'biweekly':
      return addWeeks(date, intervals * 2);
    case 'monthly':
      return addMonths(date, intervals);
    case 'yearly':
      return addYears(date, intervals);
    default:
      return addMonths(date, intervals);
  }
}

export function useInstallments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const installmentsQuery = useQuery({
    queryKey: ['installment_groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await (supabase
        .from('installment_groups') as any)
        .select('*, category:categories(*), account:accounts(*), credit_card:credit_cards(*), transactions(id, status, installment_number, date, amount)')
        .eq('user_id', user.id)
        .order('first_installment_date', { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as InstallmentGroup[];
    },
    enabled: !!user,
  });

  const createInstallment = useMutation({
    mutationFn: async (input: CreateInstallmentInput) => {
      if (!user) throw new Error('Not authenticated');
      
      // total_installments = total de parcelas DA COMPRA (ex: 9)
      // starting_installment = parcela inicial (ex: 3)
      // installmentsToCreate = quantas parcelas vamos criar (ex: 7 → da 3ª até a 9ª)
      const installmentsToCreate = input.total_installments - input.starting_installment + 1;
      
      // Calculate amounts based on amount_type and installmentsToCreate
      let totalAmount: number;
      let installmentAmount: number;
      
      if (input.amount_type === 'total') {
        totalAmount = input.amount;
        installmentAmount = input.amount / installmentsToCreate;
      } else {
        installmentAmount = input.amount;
        totalAmount = input.amount * installmentsToCreate;
      }
      
      // Create the installment group
      const { data: group, error: groupError } = await (supabase
        .from('installment_groups') as any)
        .insert({
          user_id: user.id,
          description: input.description,
          total_amount: totalAmount,
          installment_amount: installmentAmount,
          total_installments: input.total_installments,  // Total da compra original
          first_installment_date: input.first_installment_date,
          credit_card_id: input.credit_card_id || null,
          account_id: input.account_id || null,
          category_id: input.category_id || null,
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      if (!group) throw new Error('Failed to create installment group');
      
      // Create transactions: from starting_installment to total_installments
      const transactions = [];
      // Use parseDateOnly to avoid timezone issues
      const startDate = parseDateOnly(input.first_installment_date);
      
      for (let i = 0; i < installmentsToCreate; i++) {
        const installmentNumber = input.starting_installment + i;  // 3, 4, 5, 6, 7, 8, 9
        const installmentDate = addIntervalByFrequency(startDate, input.frequency, i);
        
        transactions.push({
          user_id: user.id,
          type: 'expense',
          status: 'pending',
          amount: installmentAmount,
          description: `${input.description} (${installmentNumber}/${input.total_installments})`,  // "3/9", "4/9", etc.
          date: formatDateOnly(installmentDate),
          category_id: input.category_id || null,
          account_id: input.account_id || null,
          credit_card_id: input.credit_card_id || null,
          installment_group_id: group.id,
          installment_number: installmentNumber,
          total_installments: input.total_installments,  // 9 (total da compra)
        });
      }
      
      // Use upsert to prevent duplicates
      const { error: transactionsError } = await (supabase
        .from('transactions') as any)
        .upsert(transactions, {
          onConflict: 'user_id,installment_group_id,installment_number',
          ignoreDuplicates: true
        });
      
      if (transactionsError) {
        // Fallback to insert if constraint doesn't exist
        if (transactionsError.code === '42P10' || transactionsError.message?.includes('constraint')) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(transactions as any);
          
          if (insertError) throw insertError;
        } else {
          throw transactionsError;
        }
      }
      
      return group as InstallmentGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment_groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Parcelamento criado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const updateInstallmentGroup = useMutation({
    mutationFn: async (input: {
      id: string;
      description?: string;
      installment_amount?: number;
      category_id?: string | null;
      account_id?: string | null;
      credit_card_id?: string | null;
      update_future_transactions?: boolean;
      total_installments?: number;
      starting_installment?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { id, update_future_transactions = true, total_installments, starting_installment, ...updates } = input;

      // Fetch current group with transactions
      const { data: currentGroup, error: fetchError } = await (supabase
        .from('installment_groups') as any)
        .select('*, transactions(id, installment_number, status, date)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentGroup) throw new Error('Parcelamento não encontrado');

      const currentTransactions = (currentGroup.transactions || []) as any[];
      const currentInstallmentNumbers = currentTransactions
        .filter((t: any) => t.installment_number !== null)
        .map((t: any) => t.installment_number as number);
      
      const currentMinInstallment = currentInstallmentNumbers.length > 0 
        ? Math.min(...currentInstallmentNumbers) 
        : 1;
      const currentTotalInstallments = currentGroup.total_installments;

      const newStarting = starting_installment ?? currentMinInstallment;
      const newTotal = total_installments ?? currentTotalInstallments;
      const newInstallmentAmount = updates.installment_amount ?? currentGroup.installment_amount;

      // Calculate how many installments we need (from newStarting to newTotal)
      const installmentsNeeded = newTotal - newStarting + 1;
      const newTotalAmount = newInstallmentAmount * installmentsNeeded;

      // Update the installment group
      const groupUpdates: Record<string, any> = {
        total_installments: newTotal,
        total_amount: newTotalAmount,
      };
      if (updates.description !== undefined) groupUpdates.description = updates.description;
      if (updates.category_id !== undefined) groupUpdates.category_id = updates.category_id;
      if (updates.account_id !== undefined) groupUpdates.account_id = updates.account_id;
      if (updates.credit_card_id !== undefined) groupUpdates.credit_card_id = updates.credit_card_id;
      if (updates.installment_amount !== undefined) groupUpdates.installment_amount = updates.installment_amount;

      const { error: groupError } = await (supabase
        .from('installment_groups') as any)
        .update(groupUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (groupError) throw groupError;

      // Handle installment changes if starting or total changed
      if (starting_installment !== undefined || total_installments !== undefined) {
        // Delete transactions that are now out of range
        const transactionsToDelete = currentTransactions.filter((t: any) => 
          t.installment_number < newStarting || t.installment_number > newTotal
        );
        
        if (transactionsToDelete.length > 0) {
          const { error: deleteError } = await (supabase
            .from('transactions') as any)
            .delete()
            .in('id', transactionsToDelete.map((t: any) => t.id))
            .eq('user_id', user.id);
          
          if (deleteError) throw deleteError;
        }

        // Create new transactions for installments that don't exist yet
        const existingNumbers = new Set(currentInstallmentNumbers);
        const transactionsToCreate = [];
        const baseDate = parseDateOnly(currentGroup.first_installment_date);
        const description = updates.description ?? currentGroup.description;

        for (let i = newStarting; i <= newTotal; i++) {
          if (!existingNumbers.has(i)) {
            // Calculate date based on position from the starting installment
            const monthsFromStart = i - newStarting;
            const installmentDate = addMonths(baseDate, monthsFromStart);

            transactionsToCreate.push({
              user_id: user.id,
              type: 'expense',
              status: 'pending',
              amount: newInstallmentAmount,
              description: `${description} (${i}/${newTotal})`,
              date: formatDateOnly(installmentDate),
              category_id: updates.category_id ?? currentGroup.category_id,
              account_id: updates.account_id ?? currentGroup.account_id,
              credit_card_id: updates.credit_card_id ?? currentGroup.credit_card_id,
              installment_group_id: id,
              installment_number: i,
              total_installments: newTotal,
            });
          }
        }

        if (transactionsToCreate.length > 0) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(transactionsToCreate as any);
          
          if (insertError) throw insertError;
        }

        // Update existing transactions with new total_installments and possibly amount
        const transactionsToUpdate = currentTransactions.filter((t: any) => 
          t.installment_number >= newStarting && t.installment_number <= newTotal
        );

        for (const tx of transactionsToUpdate) {
          const txUpdates: Record<string, any> = {
            total_installments: newTotal,
            description: `${description} (${tx.installment_number}/${newTotal})`,
          };
          if (updates.installment_amount !== undefined) txUpdates.amount = updates.installment_amount;
          if (updates.category_id !== undefined) txUpdates.category_id = updates.category_id;
          if (updates.account_id !== undefined) txUpdates.account_id = updates.account_id;
          if (updates.credit_card_id !== undefined) txUpdates.credit_card_id = updates.credit_card_id;

          await (supabase.from('transactions') as any)
            .update(txUpdates)
            .eq('id', tx.id);
        }
      } else if (update_future_transactions) {
        // Original logic for updating future transactions
        const today = formatDateOnly(new Date());
        const transactionUpdates: Record<string, any> = {};
        
        if (updates.description !== undefined) {
          const { data: currentTransactionsData } = await (supabase
            .from('transactions') as any)
            .select('id, installment_number, total_installments')
            .eq('installment_group_id', id)
            .gte('date', today)
            .eq('status', 'pending');

          if (currentTransactionsData) {
            for (const tx of currentTransactionsData as any[]) {
              await (supabase
                .from('transactions') as any)
                .update({
                  description: `${updates.description} (${tx.installment_number}/${tx.total_installments})`,
                })
                .eq('id', tx.id);
            }
          }
        }

        if (updates.installment_amount !== undefined) transactionUpdates.amount = updates.installment_amount;
        if (updates.category_id !== undefined) transactionUpdates.category_id = updates.category_id;
        if (updates.account_id !== undefined) transactionUpdates.account_id = updates.account_id;
        if (updates.credit_card_id !== undefined) transactionUpdates.credit_card_id = updates.credit_card_id;

        if (Object.keys(transactionUpdates).length > 0) {
          const { error: txError } = await (supabase
            .from('transactions') as any)
            .update(transactionUpdates)
            .eq('installment_group_id', id)
            .gte('date', today)
            .eq('status', 'pending');

          if (txError) throw txError;
        }
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment_groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Parcelamento atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteInstallmentGroup = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Delete all related transactions first
      const { error: transactionsError } = await (supabase
        .from('transactions') as any)
        .delete()
        .eq('installment_group_id', id)
        .eq('user_id', user.id);
      
      if (transactionsError) throw transactionsError;
      
      // Then delete the group
      const { error } = await (supabase
        .from('installment_groups') as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment_groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Parcelamento excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const confirmInstallment = useMutation({
    mutationFn: async (transactionId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase
        .from('transactions') as any)
        .update({ status: 'confirmed' })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { id: transactionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment_groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Parcela confirmada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const confirmBatchInstallments = useMutation({
    mutationFn: async (transactionIds: string[]) => {
      if (!user) throw new Error('Not authenticated');
      if (transactionIds.length === 0) return { count: 0 };

      const { error } = await (supabase
        .from('transactions') as any)
        .update({ status: 'confirmed' })
        .in('id', transactionIds)
        .eq('user_id', user.id);

      if (error) throw error;
      return { count: transactionIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installment_groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${data?.count} parcela(s) confirmada(s)!`);
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    installmentGroups: installmentsQuery.data ?? [],
    isLoading: installmentsQuery.isLoading,
    createInstallment,
    updateInstallmentGroup,
    deleteInstallmentGroup,
    confirmInstallment,
    confirmBatchInstallments,
  };
}