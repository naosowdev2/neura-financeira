import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, addMonths, addWeeks, addDays, addYears, isBefore, isAfter, getDaysInMonth, setDate } from 'date-fns';

export interface ProjectionTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  is_recurring?: boolean;
  category?: {
    name: string;
    color: string | null;
  } | null;
}

export interface ProjectionData {
  initialBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  incomeTransactions: ProjectionTransaction[];
  expenseTransactions: ProjectionTransaction[];
  hasProjectedInitialBalance: boolean;
  pendingCountBeforeMonth: number;
}

type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

// Helper to calculate occurrences for a recurrence within a date range
function getRecurrenceOccurrencesInRange(
  recurrence: {
    id: string;
    description: string;
    amount: number;
    type: string;
    start_date: string;
    end_date: string | null;
    frequency: string;
    is_active: boolean;
    category?: { name: string; color: string | null } | null;
  },
  rangeStart: Date,
  rangeEnd: Date
): ProjectionTransaction[] {
  if (!recurrence.is_active) return [];
  
  const occurrences: ProjectionTransaction[] = [];
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
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      occurrences.push({
        id: `recurrence-${recurrence.id}-${dateStr}`,
        type: recurrence.type,
        description: recurrence.description,
        amount: Number(recurrence.amount),
        date: dateStr,
        status: 'pending',
        is_recurring: true,
        category: recurrence.category,
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

export function useProjections(selectedDate: Date) {
  const { user } = useAuth();
  const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['projections', user?.id, monthStart],
    queryFn: async (): Promise<ProjectionData | null> => {
      if (!user) return null;

      // Fetch accounts for initial balances
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .eq('include_in_total', true);

      // Calculate account initial balances sum
      const accountInitialBalances = (accounts || [])
        .reduce((sum, a) => sum + Number(a.initial_balance), 0);

      // Fetch all transactions (confirmed AND pending) before the month to calculate initial balance
      // For projections, we treat pending as if they will be confirmed
      const { data: transactionsBeforeMonth } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .lt('date', monthStart)
        .is('credit_card_id', null);

      // Filter out savings goal transactions for balance calculation
      const validTransactionsBeforeMonth = (transactionsBeforeMonth || []).filter(t => !t.savings_goal_id);
      
      // Count pending transactions before this month
      const pendingBeforeMonth = validTransactionsBeforeMonth.filter(t => t.status === 'pending');
      const hasProjectedInitialBalance = pendingBeforeMonth.length > 0;
      const pendingCountBeforeMonth = pendingBeforeMonth.length;

      const balanceBeforeMonth = validTransactionsBeforeMonth.reduce((sum, t) => {
        if (t.type === 'income') return sum + Number(t.amount);
        if (t.type === 'expense') return sum - Number(t.amount);
        if (t.type === 'transfer') return sum - Number(t.amount);
        return sum;
      }, 0);

      const initialBalance = accountInitialBalances + balanceBeforeMonth;

      // Fetch all transactions for the selected month
      const { data: monthTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color)
        `)
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .is('credit_card_id', null)
        .order('date');

      // Filter out savings goal transactions
      const validTransactions = (monthTransactions || []).filter(t => !t.savings_goal_id);

      // Fetch active recurrences to calculate projected occurrences
      const { data: recurrences } = await supabase
        .from('recurrences')
        .select(`
          *,
          category:categories(name, color)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('credit_card_id', null);

      // Get transaction recurrence_ids to avoid duplicates
      const existingRecurrenceDates = new Set(
        validTransactions
          .filter(t => t.recurrence_id)
          .map(t => `${t.recurrence_id}-${t.date}`)
      );

      // Calculate projected occurrences from recurrences
      const rangeStart = startOfMonth(selectedDate);
      const rangeEnd = endOfMonth(selectedDate);
      
      const projectedFromRecurrences: ProjectionTransaction[] = [];
      
      for (const recurrence of recurrences || []) {
        const occurrences = getRecurrenceOccurrencesInRange(recurrence, rangeStart, rangeEnd);
        
        // Only add occurrences that don't already exist as transactions
        for (const occurrence of occurrences) {
          const key = `${recurrence.id}-${occurrence.date}`;
          if (!existingRecurrenceDates.has(key)) {
            projectedFromRecurrences.push(occurrence);
          }
        }
      }

      // Combine existing transactions with projected recurrences
      const allTransactions = [
        ...validTransactions.map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount),
          date: t.date,
          status: t.status,
          is_recurring: t.is_recurring,
          category: t.category,
        })),
        ...projectedFromRecurrences,
      ];

      // Separate income and expense transactions
      const incomeTransactions: ProjectionTransaction[] = allTransactions
        .filter(t => t.type === 'income')
        .sort((a, b) => a.date.localeCompare(b.date));

      const expenseTransactions: ProjectionTransaction[] = allTransactions
        .filter(t => t.type === 'expense')
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate totals
      const projectedIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const projectedExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      const projectedBalance = initialBalance + projectedIncome - projectedExpenses;

      return {
        initialBalance,
        projectedIncome,
        projectedExpenses,
        projectedBalance,
        incomeTransactions,
        expenseTransactions,
        hasProjectedInitialBalance,
        pendingCountBeforeMonth,
      };
    },
    enabled: !!user,
  });
}
