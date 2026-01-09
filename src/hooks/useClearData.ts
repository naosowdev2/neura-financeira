import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type DataType = 
  | 'transactions'
  | 'credit_card_invoices'
  | 'credit_cards'
  | 'accounts'
  | 'categories'
  | 'recurrences'
  | 'budgets'
  | 'balance_audit'
  | 'installment_groups'
  | 'savings_goals';

export interface DeletionProgress {
  currentTable: DataType;
  currentIndex: number;
  totalTables: number;
  status: 'pending' | 'deleting' | 'done' | 'error';
  completedTables: DataType[];
  errorTables: DataType[];
}

export interface ClearDataOptions {
  dataTypes: DataType[];
  onProgress?: (progress: DeletionProgress) => void;
}

// Define quais tabelas dependem de quais
export const DEPENDENCIES: Record<DataType, DataType[]> = {
  transactions: [],
  credit_card_invoices: ['transactions'],
  credit_cards: ['credit_card_invoices', 'transactions'],
  accounts: ['transactions', 'balance_audit'],
  categories: [],
  recurrences: [],
  budgets: [],
  balance_audit: [],
  installment_groups: ['transactions'],
  savings_goals: ['transactions'],
};

export const TABLE_LABELS: Record<DataType, string> = {
  transactions: 'Transações',
  credit_card_invoices: 'Faturas de Cartão',
  credit_cards: 'Cartões de Crédito',
  accounts: 'Contas Bancárias',
  categories: 'Categorias',
  recurrences: 'Recorrências',
  budgets: 'Orçamentos',
  balance_audit: 'Histórico de Auditoria',
  installment_groups: 'Parcelamentos',
  savings_goals: 'Metas de Economia',
};

export function useClearData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const clearData = useMutation({
    mutationFn: async (options: ClearDataOptions) => {
      if (!user) throw new Error('Não autenticado');

      const { dataTypes, onProgress } = options;
      
      // Ordem de deleção respeitando foreign keys
      const deletionOrder: DataType[] = [
        'balance_audit',
        'transactions',
        'credit_card_invoices',
        'budgets',
        'recurrences',
        'installment_groups',
        'savings_goals',
        'credit_cards',
        'accounts',
        'categories',
      ];

      // Filtra apenas os tipos selecionados mantendo a ordem
      const tablesToDelete = deletionOrder.filter(t => dataTypes.includes(t));
      const completedTables: DataType[] = [];
      const errorTables: DataType[] = [];

      // Passo 1: Limpar referências em credit_card_invoices
      if (dataTypes.includes('transactions') || dataTypes.includes('credit_card_invoices')) {
        try {
          await (supabase.from('credit_card_invoices') as any)
            .update({ payment_transaction_id: null })
            .eq('user_id', user.id);
        } catch (e) {
          console.error('Erro ao limpar referências de faturas:', e);
        }
      }

      // Passo 2: Limpar referências de recorrências nas transações
      if (dataTypes.includes('recurrences')) {
        try {
          await (supabase.from('transactions') as any)
            .update({ recurrence_id: null, is_recurring: false })
            .eq('user_id', user.id);
        } catch (e) {
          console.error('Erro ao limpar referências de recorrências:', e);
        }
      }

      // Passo 3: Limpar referências de parcelamentos nas transações
      if (dataTypes.includes('installment_groups')) {
        try {
          await (supabase.from('transactions') as any)
            .update({ installment_group_id: null, installment_number: null, total_installments: null })
            .eq('user_id', user.id);
        } catch (e) {
          console.error('Erro ao limpar referências de parcelamentos:', e);
        }
      }

      // Passo 4: Limpar referências de metas nas transações
      if (dataTypes.includes('savings_goals')) {
        try {
          await (supabase.from('transactions') as any)
            .update({ savings_goal_id: null })
            .eq('user_id', user.id);
        } catch (e) {
          console.error('Erro ao limpar referências de metas:', e);
        }
      }

      // Passo 5: Limpar referências de categorias nas transações
      if (dataTypes.includes('categories') && !dataTypes.includes('transactions')) {
        try {
          await (supabase.from('transactions') as any)
            .update({ category_id: null })
            .eq('user_id', user.id);
        } catch (e) {
          console.error('Erro ao limpar referências de categorias:', e);
        }
      }

      // Passo 6: Deletar na ordem correta
      for (let i = 0; i < tablesToDelete.length; i++) {
        const table = tablesToDelete[i];
        
        // Reportar progresso
        onProgress?.({
          currentTable: table,
          currentIndex: i,
          totalTables: tablesToDelete.length,
          status: 'deleting',
          completedTables: [...completedTables],
          errorTables: [...errorTables],
        });

        try {
          const { error } = await (supabase as any)
            .from(table)
            .delete()
            .eq('user_id', user.id);

          if (error) {
            console.error(`Erro ao limpar ${table}:`, error);
            errorTables.push(table);
          } else {
            console.log(`Tabela ${table} limpa com sucesso`);
            completedTables.push(table);
          }
        } catch (e) {
          console.error(`Exceção ao limpar ${table}:`, e);
          errorTables.push(table);
        }

        // Reportar progresso atualizado
        onProgress?.({
          currentTable: table,
          currentIndex: i,
          totalTables: tablesToDelete.length,
          status: errorTables.includes(table) ? 'error' : 'done',
          completedTables: [...completedTables],
          errorTables: [...errorTables],
        });
      }

      return { completedTables, errorTables };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      if (result.errorTables.length > 0) {
        toast.warning(`${result.completedTables.length} itens excluídos. ${result.errorTables.length} falharam.`);
      } else {
        toast.success('Dados excluídos com sucesso!');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mantém compatibilidade com código antigo
  const clearAllData = useMutation({
    mutationFn: async () => {
      return clearData.mutateAsync({
        dataTypes: [
          'balance_audit',
          'transactions',
          'credit_card_invoices',
          'budgets',
          'recurrences',
          'installment_groups',
          'savings_goals',
          'credit_cards',
          'accounts',
          'categories',
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Todos os dados foram excluídos com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    clearData,
    clearAllData,
    isClearing: clearData.isPending || clearAllData.isPending,
  };
}
