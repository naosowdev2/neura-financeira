import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, addMonths, addWeeks, addDays, addYears, differenceInMonths, isBefore, isAfter, getDaysInMonth, setDate } from 'date-fns';
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

type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

// Helper to calculate occurrences for a recurrence within a date range
function getRecurrenceOccurrencesInRange(
  recurrence: {
    id: string;
    amount: number;
    type: string;
    start_date: string;
    end_date: string | null;
    frequency: string;
    is_active: boolean;
  },
  rangeStart: Date,
  rangeEnd: Date
): { date: string; amount: number; type: string }[] {
  if (!recurrence.is_active) return [];
  
  const occurrences: { date: string; amount: number; type: string }[] = [];
  const startDate = new Date(recurrence.start_date + 'T12:00:00');
  const endDate = recurrence.end_date ? new Date(recurrence.end_date + 'T12:00:00') : null;
  const originalDay = startDate.getDate();
  
  // If recurrence hasn't started yet or already ended before range
  if (isAfter(startDate, rangeEnd)) return [];
  if (endDate && isBefore(endDate, rangeStart)) return [];
  
  let currentDate = new Date(startDate);
  
  // Fast-forward to the range if start is before range
  while (isBefore(currentDate, rangeStart)) {
    currentDate = getNextOccurrence(currentDate, recurrence.frequency as FrequencyType, originalDay);
    // Safety check to prevent infinite loops
    if (isAfter(currentDate, rangeEnd)) return [];
  }
  
  // Generate occurrences within range
  let safetyCounter = 0;
  const maxIterations = 100;
  
  while (!isAfter(currentDate, rangeEnd) && safetyCounter < maxIterations) {
    safetyCounter++;
    
    // Check end date
    if (endDate && isAfter(currentDate, endDate)) break;
    
    // Only add if within range
    if (!isBefore(currentDate, rangeStart) && !isAfter(currentDate, rangeEnd)) {
      occurrences.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        amount: Number(recurrence.amount),
        type: recurrence.type,
      });
    }
    
    currentDate = getNextOccurrence(currentDate, recurrence.frequency as FrequencyType, originalDay);
  }
  
  return occurrences;
}

function getNextOccurrence(date: Date, frequency: FrequencyType, originalDay: number): Date {
  let nextDate: Date;
  
  switch (frequency) {
    case 'daily':
      nextDate = addDays(date, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(date, 1);
      break;
    case 'biweekly':
      nextDate = addWeeks(date, 2);
      break;
    case 'monthly':
      nextDate = addMonths(date, 1);
      // Preserve original day
      const maxDayInMonth = getDaysInMonth(nextDate);
      const targetDay = Math.min(originalDay, maxDayInMonth);
      nextDate = setDate(nextDate, targetDay);
      break;
    case 'yearly':
      nextDate = addYears(date, 1);
      break;
    default:
      nextDate = addMonths(date, 1);
  }
  
  return nextDate;
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

  // Fetch active recurrences
  const { data: recurrences } = await supabase
    .from('recurrences')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('credit_card_id', null);

  // Get existing recurrence transaction dates to avoid duplicates
  const existingRecurrenceDates = new Set(
    validTransactions
      .filter(t => t.recurrence_id)
      .map(t => `${t.recurrence_id}-${t.date}`)
  );

  // Calculate projected income and expenses from recurrences
  const rangeStart = startOfMonth(targetDate);
  const rangeEnd = endOfMonth(targetDate);
  
  let projectedIncomeFromRecurrences = 0;
  let projectedExpensesFromRecurrences = 0;
  
  for (const recurrence of recurrences || []) {
    const occurrences = getRecurrenceOccurrencesInRange(recurrence, rangeStart, rangeEnd);
    
    for (const occurrence of occurrences) {
      const key = `${recurrence.id}-${occurrence.date}`;
      if (!existingRecurrenceDates.has(key)) {
        if (occurrence.type === 'income') {
          projectedIncomeFromRecurrences += occurrence.amount;
        } else if (occurrence.type === 'expense') {
          projectedExpensesFromRecurrences += occurrence.amount;
        }
      }
    }
  }

  // Calculate totals from existing transactions
  const incomeFromTransactions = validTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expensesFromTransactions = validTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Combine existing transactions with projected recurrences
  const projectedIncome = incomeFromTransactions + projectedIncomeFromRecurrences;
  const projectedExpenses = expensesFromTransactions + projectedExpensesFromRecurrences;

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
