import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction } from '@/types/financial';

interface GroupedTransactions {
  date: string;
  dateLabel: string;
  transactions: Transaction[];
  total: number;
}

interface CategorySummary {
  category_id: string | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
}

export function useInvoiceTransactions(invoiceId?: string, creditCardId?: string, referenceMonth?: string) {
  const { user } = useAuth();

  const transactionsQuery = useQuery({
    queryKey: ['invoice_transactions', user?.id, invoiceId, creditCardId, referenceMonth],
    queryFn: async () => {
      if (!user || !creditCardId) return { transactions: [], grouped: [], categories: [], total: 0 };
      
      // Build query for transactions
      let query = supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('credit_card_id', creditCardId)
        .eq('type', 'expense')
        .order('date', { ascending: false });
      
      if (invoiceId) {
        // Get transactions for this invoice OR orphan transactions for this card
        query = query.or(`invoice_id.eq.${invoiceId},invoice_id.is.null`);
      } else {
        // Only orphan transactions
        query = query.is('invoice_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const transactions = (data ?? []) as Transaction[];
      
      // Group by date
      const groupedMap = new Map<string, Transaction[]>();
      transactions.forEach(t => {
        const dateKey = t.date;
        if (!groupedMap.has(dateKey)) {
          groupedMap.set(dateKey, []);
        }
        groupedMap.get(dateKey)!.push(t);
      });
      
      const grouped: GroupedTransactions[] = Array.from(groupedMap.entries())
        .map(([date, txns]) => ({
          date,
          dateLabel: format(parseISO(date), "d 'de' MMMM", { locale: ptBR }),
          transactions: txns,
          total: txns.reduce((sum, t) => sum + Number(t.amount || 0), 0),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      
      // Calculate category summary
      const categoryMap = new Map<string | null, { name: string; icon: string; color: string; total: number }>();
      transactions.forEach(t => {
        const catId = t.category_id || null;
        const cat = (t as any).category;
        const existing = categoryMap.get(catId);
        if (existing) {
          existing.total += Number(t.amount || 0);
        } else {
          categoryMap.set(catId, {
            name: cat?.name || 'Sem categoria',
            icon: cat?.icon || 'tag',
            color: cat?.color || '#8b5cf6',
            total: Number(t.amount || 0),
          });
        }
      });
      
      const total = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const categories: CategorySummary[] = Array.from(categoryMap.entries())
        .map(([category_id, data]) => ({
          category_id,
          category_name: data.name,
          category_icon: data.icon,
          category_color: data.color,
          total: data.total,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);
      
      return {
        transactions,
        grouped,
        categories,
        total,
      };
    },
    enabled: !!user && !!creditCardId,
  });

  return {
    transactions: transactionsQuery.data?.transactions ?? [],
    grouped: transactionsQuery.data?.grouped ?? [],
    categories: transactionsQuery.data?.categories ?? [],
    total: transactionsQuery.data?.total ?? 0,
    isLoading: transactionsQuery.isLoading,
  };
}
