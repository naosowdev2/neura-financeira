import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  due_date: string;
  competency_date: string;
  category_id: string | null;
  account_id: string | null;
  destination_account_id: string | null;
  status: string;
}

interface GroupedTransactions {
  date: string;
  dateLabel: string;
  transactions: (Transaction & { isIncoming: boolean })[];
}

export function useAccountTransactions(accountId: string | null, month: Date) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['account-transactions', accountId, format(month, 'yyyy-MM')],
    queryFn: async () => {
      if (!user || !accountId) return { grouped: [], totals: { income: 0, expense: 0 } };

      const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

      // Buscar transações onde esta conta é origem OU destino
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .or(`account_id.eq.${accountId},destination_account_id.eq.${accountId}`)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: false });

      if (error) throw error;

      const transactions = data ?? [];

      // Calcular totais e marcar direção
      let totalIncome = 0;
      let totalExpense = 0;

      const processedTransactions = transactions.map((t) => {
        // Determinar se é entrada ou saída para esta conta
        let isIncoming = false;
        
        if (t.type === 'income') {
          isIncoming = true;
          totalIncome += Number(t.amount);
        } else if (t.type === 'expense') {
          isIncoming = false;
          totalExpense += Number(t.amount);
        } else if (t.type === 'transfer') {
          // Se destino é esta conta = entrada, se origem = saída
          if (t.destination_account_id === accountId) {
            isIncoming = true;
            totalIncome += Number(t.amount);
          } else {
            isIncoming = false;
            totalExpense += Number(t.amount);
          }
        } else if (t.type === 'adjustment') {
          if (Number(t.amount) >= 0) {
            isIncoming = true;
            totalIncome += Number(t.amount);
          } else {
            isIncoming = false;
            totalExpense += Math.abs(Number(t.amount));
          }
        }

        return { ...t, isIncoming };
      });

      // Agrupar por data de vencimento
      const groupedMap = new Map<string, (Transaction & { isIncoming: boolean })[]>();
      
      processedTransactions.forEach((t) => {
        const dateKey = t.due_date;
        if (!groupedMap.has(dateKey)) {
          groupedMap.set(dateKey, []);
        }
        groupedMap.get(dateKey)!.push(t);
      });

      const grouped: GroupedTransactions[] = Array.from(groupedMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([due_date, txns]) => ({
          date: due_date,
          dateLabel: format(parseISO(due_date), "dd 'de' MMMM", { locale: ptBR }),
          transactions: txns,
        }));

      return {
        grouped,
        totals: {
          income: totalIncome,
          expense: totalExpense,
        },
      };
    },
    enabled: !!user && !!accountId,
  });

  return {
    groupedTransactions: query.data?.grouped ?? [],
    totals: query.data?.totals ?? { income: 0, expense: 0 },
    isLoading: query.isLoading,
  };
}
