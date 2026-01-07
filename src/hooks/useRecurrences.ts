import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Recurrence, CreateRecurrenceInput } from '@/types/financial';

export function useRecurrences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const recurrencesQuery = useQuery({
    queryKey: ['recurrences', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await (supabase
        .from('recurrences') as any)
        .select('*, category:categories(*), account:accounts(*), credit_card:credit_cards(*)')
        .eq('user_id', user.id)
        .order('next_occurrence', { ascending: true });
      
      if (error) throw error;
      return (data ?? []) as Recurrence[];
    },
    enabled: !!user,
  });

  const createRecurrence = useMutation({
    mutationFn: async (recurrence: CreateRecurrenceInput) => {
      if (!user) throw new Error('Not authenticated');
      
      // Create the recurrence
      const { data, error } = await (supabase
        .from('recurrences') as any)
        .insert({
          ...recurrence,
          user_id: user.id,
          next_occurrence: recurrence.start_date,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // NOTE: Initial transaction is created by processRecurrences
      // to avoid duplication issues
      
      return data as Recurrence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrences'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Recorrência criada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const updateRecurrence = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateRecurrenceInput>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await (supabase
        .from('recurrences') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Recurrence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrences'] });
      toast.success('Recorrência atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteRecurrence = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await (supabase
        .from('recurrences') as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrences'] });
      toast.success('Recorrência excluída!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await (supabase
        .from('recurrences') as any)
        .update({ is_active })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Recurrence;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurrences'] });
      toast.success(data.is_active ? 'Recorrência ativada!' : 'Recorrência pausada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    recurrences: recurrencesQuery.data ?? [],
    isLoading: recurrencesQuery.isLoading,
    createRecurrence,
    updateRecurrence,
    deleteRecurrence,
    toggleActive,
  };
}
