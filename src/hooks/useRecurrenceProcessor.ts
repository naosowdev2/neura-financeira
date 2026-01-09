import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, addWeeks, addMonths, addYears, format, isBefore, isAfter, getDaysInMonth, setDate } from 'date-fns';
import { parseDateOnly, formatDateOnly } from '@/lib/utils';
import type { Recurrence, FrequencyType } from '@/types/financial';

function addIntervalByFrequency(date: Date, frequency: FrequencyType, intervals: number = 1): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, intervals);
    case 'weekly':
      return addWeeks(date, intervals);
    case 'biweekly':
      return addWeeks(date, intervals * 2);
    case 'monthly':
      return addMonths(date, intervals);
    case 'yearly':
      return addYears(date, intervals);
    default:
      return addMonths(date, intervals);
  }
}

// Helper to preserve the original day of month when advancing months
function getNextOccurrenceWithOriginalDay(
  currentDate: Date, 
  frequency: FrequencyType, 
  originalDay: number
): Date {
  const nextDate = addIntervalByFrequency(currentDate, frequency);
  
  // For monthly/yearly, preserve the original day
  if (frequency === 'monthly' || frequency === 'yearly') {
    const maxDayInMonth = getDaysInMonth(nextDate);
    const targetDay = Math.min(originalDay, maxDayInMonth);
    return setDate(nextDate, targetDay);
  }
  
  return nextDate;
}

export function useRecurrenceProcessor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generate pending transactions for a single recurrence
  const generateTransactionsForRecurrence = async (
    recurrence: Recurrence,
    monthsAhead: number = 3
  ) => {
    if (!user) return;

    // Use parseDateOnly to avoid timezone issues
    const today = parseDateOnly(formatDateOnly(new Date()));
    const futureLimit = addMonths(today, monthsAhead);
    const startDate = parseDateOnly(recurrence.start_date);
    const originalDay = startDate.getDate(); // Preserve original day (e.g., 5)
    const endDate = recurrence.end_date ? parseDateOnly(recurrence.end_date) : null;

    // If start_date is in the future, don't process yet - keep next_occurrence as start_date
    if (isAfter(startDate, today)) {
      // Ensure next_occurrence is set to start_date if not already
      if (recurrence.next_occurrence !== recurrence.start_date) {
        await (supabase.from('recurrences') as any)
          .update({ next_occurrence: recurrence.start_date })
          .eq('id', recurrence.id)
          .eq('user_id', user.id);
      }
      return;
    }

    // Find existing transactions for this recurrence
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('date')
      .eq('recurrence_id', recurrence.id)
      .eq('user_id', user.id);

    const existingDates = new Set(
      (existingTransactions || []).map((t) => t.date)
    );

    // Calculate dates to generate
    const datesToGenerate: string[] = [];
    let currentDate = startDate;

    while (isBefore(currentDate, futureLimit) || formatDateOnly(currentDate) === formatDateOnly(futureLimit)) {
      // Skip if end date passed
      if (endDate && isAfter(currentDate, endDate)) break;

      const dateStr = formatDateOnly(currentDate);
      
      // Only add if not already existing
      if (!existingDates.has(dateStr)) {
        datesToGenerate.push(dateStr);
      }

      // Move to next occurrence preserving the original day
      currentDate = getNextOccurrenceWithOriginalDay(
        currentDate, 
        recurrence.frequency as FrequencyType,
        originalDay
      );
    }

    // Create transactions for missing dates using insert
    if (datesToGenerate.length > 0) {
      const transactionsToCreate = datesToGenerate.map((dateStr) => ({
        user_id: user.id,
        type: recurrence.type as string,
        description: recurrence.description,
        amount: recurrence.amount,
        date: dateStr,
        category_id: recurrence.category_id,
        account_id: recurrence.account_id,
        credit_card_id: recurrence.credit_card_id,
        status: 'pending',
        is_recurring: true,
        recurrence_id: recurrence.id,
      }));

      // Use insert - the partial unique index prevents duplicates
      const { error } = await (supabase
        .from('transactions') as any)
        .insert(transactionsToCreate);

      if (error) {
        // Error 23505 = duplicate key violation (expected if transaction already exists)
        if (error.code !== '23505') {
          console.error('Error creating recurrence transactions:', error);
          throw error;
        }
      }
    }

    // Calculate next_occurrence based on the latest transaction date
    const allDates = [
      ...(existingTransactions || []).map(t => t.date),
      ...datesToGenerate
    ].sort();
    
    // Only update next_occurrence if we have dates
    if (allDates.length > 0) {
      const lastDateStr = allDates[allDates.length - 1];
      const nextOccurrence = getNextOccurrenceWithOriginalDay(
        parseDateOnly(lastDateStr),
        recurrence.frequency as FrequencyType,
        originalDay
      );

      await (supabase.from('recurrences') as any)
        .update({ next_occurrence: formatDateOnly(nextOccurrence) })
        .eq('id', recurrence.id)
        .eq('user_id', user.id);
    }
  };

  // Process all active recurrences
  const processRecurrences = useMutation({
    mutationFn: async (monthsAhead: number = 3) => {
      if (!user) return;

      const { data: activeRecurrences, error } = await (supabase
        .from('recurrences') as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      for (const recurrence of activeRecurrences || []) {
        await generateTransactionsForRecurrence(recurrence as Recurrence, monthsAhead);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recurrences'] });
    },
  });

  // Create initial transaction when recurrence is created
  const createInitialTransaction = async (recurrence: Recurrence) => {
    if (!user) return;

    // Use insert - the partial unique index prevents duplicates
    const { error } = await (supabase
      .from('transactions') as any)
      .insert({
        user_id: user.id,
        type: recurrence.type as string,
        description: recurrence.description,
        amount: recurrence.amount,
        date: recurrence.start_date,
        category_id: recurrence.category_id,
        account_id: recurrence.account_id,
        credit_card_id: recurrence.credit_card_id,
        status: 'pending',
        is_recurring: true,
        recurrence_id: recurrence.id,
      });

    if (error) {
      // Error 23505 = duplicate key violation (expected if transaction already exists)
      if (error.code !== '23505') {
        console.error('Error creating initial transaction:', error);
        throw error;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return {
    processRecurrences,
    createInitialTransaction,
    generateTransactionsForRecurrence,
  };
}