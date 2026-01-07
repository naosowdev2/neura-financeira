import { useState } from 'react';
import { useRecurrences } from './useRecurrences';
import { useTransactions } from './useTransactions';
import { SavingsGoal } from './useSavingsGoals';
import { supabase } from '@/integrations/supabase/client';

export interface SavingsGoalAIContext {
  goal: SavingsGoal;
  event: 'contribution' | 'withdrawal' | 'creation' | 'status';
  amount?: number;
  userFinances: {
    monthlyRecurringIncome: number;
    monthlyFixedExpenses: number;
    availableForSavings: number;
    otherGoalsCommitment: number;
  };
  patterns: {
    averageContribution: number;
    contributionCount: number;
    monthsSinceCreation: number;
  };
}

export interface AIFeedback {
  message: string;
  projection?: {
    monthsToGoal: number;
    suggestedMonthly: number;
    onTrack: boolean;
  };
  tips: string[];
  celebration?: string;
  alertLevel?: 'success' | 'warning' | 'info';
}

export function useSavingsGoalAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { recurrences } = useRecurrences();
  const { transactions } = useTransactions();

  const calculateUserFinances = () => {
    // Calculate monthly recurring income
    const incomeRecurrences = recurrences?.filter(r => r.type === 'income' && r.is_active) || [];
    const monthlyRecurringIncome = incomeRecurrences.reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.amount;
      if (r.frequency === 'weekly') return sum + (r.amount * 4.33);
      if (r.frequency === 'biweekly') return sum + (r.amount * 2.17);
      if (r.frequency === 'yearly') return sum + (r.amount / 12);
      return sum + r.amount;
    }, 0);

    // Calculate monthly fixed expenses
    const expenseRecurrences = recurrences?.filter(r => r.type === 'expense' && r.is_active) || [];
    const monthlyFixedExpenses = expenseRecurrences.reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.amount;
      if (r.frequency === 'weekly') return sum + (r.amount * 4.33);
      if (r.frequency === 'biweekly') return sum + (r.amount * 2.17);
      if (r.frequency === 'yearly') return sum + (r.amount / 12);
      return sum + r.amount;
    }, 0);

    const availableForSavings = Math.max(0, monthlyRecurringIncome - monthlyFixedExpenses);

    return {
      monthlyRecurringIncome,
      monthlyFixedExpenses,
      availableForSavings,
      otherGoalsCommitment: 0, // Could be enhanced to track commitments to other goals
    };
  };

  const calculatePatterns = (goalId: string, createdAt: string) => {
    // Get contributions to this goal
    const goalTransactions = transactions?.filter(
      t => t.savings_goal_id === goalId && t.type === 'expense'
    ) || [];

    const contributionCount = goalTransactions.length;
    const totalContributed = goalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageContribution = contributionCount > 0 ? totalContributed / contributionCount : 0;

    // Calculate months since creation
    const createdDate = new Date(createdAt);
    const now = new Date();
    const monthsSinceCreation = Math.max(1, 
      (now.getFullYear() - createdDate.getFullYear()) * 12 + 
      (now.getMonth() - createdDate.getMonth())
    );

    return {
      averageContribution,
      contributionCount,
      monthsSinceCreation,
    };
  };

  const getAIFeedback = async (
    goal: SavingsGoal, 
    event: 'contribution' | 'withdrawal' | 'creation' | 'status',
    amount?: number
  ) => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const userFinances = calculateUserFinances();
      const patterns = calculatePatterns(goal.id, goal.created_at);

      const context: SavingsGoalAIContext = {
        goal,
        event,
        amount,
        userFinances,
        patterns,
      };

      const { data, error: fnError } = await supabase.functions.invoke('ai-savings-advisor', {
        body: context,
      });

      if (fnError) throw fnError;

      setFeedback(data as AIFeedback);
      return data as AIFeedback;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter feedback da IA';
      setError(errorMessage);
      console.error('AI Savings Advisor error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearFeedback = () => {
    setFeedback(null);
    setError(null);
  };

  return {
    getAIFeedback,
    feedback,
    isLoading,
    error,
    clearFeedback,
  };
}
