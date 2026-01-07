import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CreditCardInvoice } from '@/types/financial';

export function useCreditCardInvoices(creditCardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ['credit_card_invoices', user?.id, creditCardId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = (supabase
        .from('credit_card_invoices') as any)
        .select('*, credit_card:credit_cards(*)')
        .eq('user_id', user.id)
        .order('reference_month', { ascending: false });
      
      if (creditCardId) {
        query = query.eq('credit_card_id', creditCardId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CreditCardInvoice[];
    },
    enabled: !!user,
  });

  const getOrCreateInvoice = useMutation({
    mutationFn: async ({ creditCardId, transactionDate }: { creditCardId: string; transactionDate: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await (supabase.rpc as any)('get_or_create_invoice', {
        p_credit_card_id: creditCardId,
        p_transaction_date: transactionDate,
        p_user_id: user.id,
      });
      
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao obter fatura: ' + error.message);
    },
  });

  const payInvoice = useMutation({
    mutationFn: async ({ invoiceId, accountId }: { invoiceId: string; accountId: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get invoice details
      const { data: invoice, error: invoiceError } = await (supabase
        .from('credit_card_invoices') as any)
        .select('*, credit_card:credit_cards(*)')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      if (!invoice) throw new Error('Invoice not found');
      
      // Create payment transaction
      const { data: transaction, error: transactionError } = await (supabase
        .from('transactions') as any)
        .insert({
          user_id: user.id,
          type: 'expense',
          status: 'confirmed',
          amount: invoice.total_amount,
          description: `Pagamento fatura ${invoice.credit_card?.name || 'Cartão'}`,
          date: new Date().toISOString().split('T')[0],
          account_id: accountId,
        })
        .select()
        .single();
      
      if (transactionError) throw transactionError;
      if (!transaction) throw new Error('Failed to create transaction');
      
      // Update invoice as paid
      const { error: updateError } = await (supabase
        .from('credit_card_invoices') as any)
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_transaction_id: transaction.id,
        })
        .eq('id', invoiceId);
      
      if (updateError) throw updateError;
      
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Fatura paga com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao pagar fatura: ' + error.message);
    },
  });

  return {
    invoices: invoicesQuery.data ?? [],
    isLoading: invoicesQuery.isLoading,
    getOrCreateInvoice,
    payInvoice,
  };
}
