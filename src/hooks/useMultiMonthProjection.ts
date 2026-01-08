import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, addMonths, differenceInMonths, isSameMonth } from 'date-fns';
import { ScenarioItem } from '@/components/planning/AddScenarioDialog';

interface MonthProjection {
  month: Date;
  initialBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  scenarioImpact: number;
  projectedBalance: number;
}

export interface MultiMonthProjectionData {
  simulatedInitialBalance: number;
  originalProjectedBalance: number;
  simulatedProjectedBalance: number;
  scenarioImpact: number;
  monthBreakdown: MonthProjection[];
  isSimulating: boolean;
}

async function fetchMonthProjection(userId: string, targetDate: Date) {
  const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');

  // Fetch accounts for initial balances
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .eq('include_in_total', true);

  const accountInitialBalances = (accounts || [])
    .reduce((sum, a) => sum + Number(a.initial_balance), 0);

  // Fetch all transactions before the month
  const { data: transactionsBeforeMonth } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['confirmed', 'pending'])
    .lt('date', monthStart)
    .is('credit_card_id', null);

  const validTransactionsBeforeMonth = (transactionsBeforeMonth || []).filter(t => !t.savings_goal_id);

  const balanceBeforeMonth = validTransactionsBeforeMonth.reduce((sum, t) => {
    if (t.type === 'income') return sum + Number(t.amount);
    if (t.type === 'expense') return sum - Number(t.amount);
    if (t.type === 'transfer') return sum - Number(t.amount);
    return sum;
  }, 0);

  const initialBalance = accountInitialBalances + balanceBeforeMonth;

  // Fetch transactions for the month
  const { data: monthTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .is('credit_card_id', null);

  const validTransactions = (monthTransactions || []).filter(t => !t.savings_goal_id);

  const projectedIncome = validTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const projectedExpenses = validTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    initialBalance,
    projectedIncome,
    projectedExpenses,
    projectedBalance: initialBalance + projectedIncome - projectedExpenses,
  };
}

function calculateScenarioImpact(scenarios: ScenarioItem[]): number {
  return scenarios.reduce((sum, s) => {
    if (s.type === 'income') return sum + s.amount;
    if (s.type === 'expense') return sum - s.amount;
    return sum;
  }, 0);
}

export function useMultiMonthProjection(
  scenarioBaseMonth: Date | null,
  targetMonth: Date,
  scenarios: ScenarioItem[]
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['multi-month-projection', user?.id, scenarioBaseMonth?.toISOString(), targetMonth.toISOString(), scenarios],
    queryFn: async (): Promise<MultiMonthProjectionData | null> => {
      if (!user) return null;

      // If no scenarios, just return the target month's real projection
      if (!scenarioBaseMonth || scenarios.length === 0) {
        const targetProjection = await fetchMonthProjection(user.id, targetMonth);
        return {
          simulatedInitialBalance: targetProjection.initialBalance,
          originalProjectedBalance: targetProjection.projectedBalance,
          simulatedProjectedBalance: targetProjection.projectedBalance,
          scenarioImpact: 0,
          monthBreakdown: [],
          isSimulating: false,
        };
      }

      const scenarioImpact = calculateScenarioImpact(scenarios);
      const monthsDiff = differenceInMonths(targetMonth, scenarioBaseMonth);
      const breakdown: MonthProjection[] = [];

      // If target is the same as base month (or before), just return that month with scenarios
      if (monthsDiff <= 0) {
        const baseProjection = await fetchMonthProjection(user.id, scenarioBaseMonth);
        const simulatedBalance = baseProjection.projectedBalance + scenarioImpact;
        
        breakdown.push({
          month: scenarioBaseMonth,
          initialBalance: baseProjection.initialBalance,
          projectedIncome: baseProjection.projectedIncome,
          projectedExpenses: baseProjection.projectedExpenses,
          scenarioImpact,
          projectedBalance: simulatedBalance,
        });

        return {
          simulatedInitialBalance: baseProjection.initialBalance,
          originalProjectedBalance: baseProjection.projectedBalance,
          simulatedProjectedBalance: simulatedBalance,
          scenarioImpact,
          monthBreakdown: breakdown,
          isSimulating: true,
        };
      }

      // Calculate base month first
      const baseProjection = await fetchMonthProjection(user.id, scenarioBaseMonth);
      let accumulatedBalance = baseProjection.projectedBalance + scenarioImpact;
      
      breakdown.push({
        month: scenarioBaseMonth,
        initialBalance: baseProjection.initialBalance,
        projectedIncome: baseProjection.projectedIncome,
        projectedExpenses: baseProjection.projectedExpenses,
        scenarioImpact,
        projectedBalance: accumulatedBalance,
      });

      // Iterate through intermediate months
      for (let m = 1; m <= monthsDiff; m++) {
        const currentMonth = addMonths(scenarioBaseMonth, m);
        const monthProjection = await fetchMonthProjection(user.id, currentMonth);
        
        // The simulated initial balance is the previous month's simulated final balance
        const simulatedInitial = accumulatedBalance;
        
        // Calculate new final balance: simulated initial + income - expenses + scenario impact
        const newBalance = simulatedInitial + monthProjection.projectedIncome - monthProjection.projectedExpenses + scenarioImpact;
        
        breakdown.push({
          month: currentMonth,
          initialBalance: simulatedInitial,
          projectedIncome: monthProjection.projectedIncome,
          projectedExpenses: monthProjection.projectedExpenses,
          scenarioImpact,
          projectedBalance: newBalance,
        });
        
        accumulatedBalance = newBalance;
      }

      // Get original projection for comparison
      const originalTargetProjection = await fetchMonthProjection(user.id, targetMonth);
      const lastBreakdown = breakdown[breakdown.length - 1];

      return {
        simulatedInitialBalance: lastBreakdown.initialBalance,
        originalProjectedBalance: originalTargetProjection.projectedBalance,
        simulatedProjectedBalance: lastBreakdown.projectedBalance,
        scenarioImpact,
        monthBreakdown: breakdown,
        isSimulating: true,
      };
    },
    enabled: !!user,
  });
}
