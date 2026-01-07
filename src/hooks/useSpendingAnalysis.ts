import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpendingData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: Array<{ name: string; value: number }>;
  incomeByCategory: Array<{ name: string; value: number }>;
  transactions: Array<{
    description: string;
    amount: number;
    type: string;
    category?: string;
    date: string;
  }>;
  month: string;
  year: string;
}

export function useSpendingAnalysis() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeSpending = useCallback(async (data: SpendingData) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('ai-spending-analysis', {
        body: data
      });

      if (fnError) throw fnError;

      if (result?.error) {
        throw new Error(result.error);
      }

      setAnalysis(result?.analysis || null);
    } catch (err: any) {
      console.error('Spending analysis error:', err);
      setError(err.message || 'Erro ao analisar gastos');
      if (err.message?.includes('429')) {
        toast.error('Limite de IA atingido. Tente novamente mais tarde.');
      } else if (err.message?.includes('402')) {
        toast.error('Créditos insuficientes para análise.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return { analysis, isLoading, error, analyzeSpending, clearAnalysis };
}
