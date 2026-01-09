import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useCreditCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const creditCardsQuery = useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const createCreditCard = useMutation({
    mutationFn: async (card: any) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ ...card, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Cartão criado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const updateCreditCard = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase
        .from('credit_cards') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Cartão atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteCreditCard = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase
        .from('credit_cards') as any)
        .update({ is_archived: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Cartão arquivado!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    creditCards: creditCardsQuery.data ?? [],
    isLoading: creditCardsQuery.isLoading,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
  };
}
