import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WeeklySummaryData {
  weekStart: string;
  weekEnd: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    comparedToLastWeek: string;
    lastWeekExpenses: number;
  };
  highlights: Array<{
    type: 'positive' | 'attention' | 'tip';
    message: string;
  }>;
  budgets: Array<{
    name: string;
    spent: number;
    limit: number;
    percentage: number;
  }>;
  topCategories: Array<{
    name: string;
    amount: number;
    color: string;
  }>;
}

interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  summary_data: WeeklySummaryData;
  ai_analysis: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to access new tables not yet in generated types
async function fetchWeeklySummaries(userId: string, unreadOnly: boolean, limit: number): Promise<WeeklySummary[]> {
  const query = `
    SELECT * FROM weekly_summaries 
    WHERE user_id = $1 
    ${unreadOnly ? 'AND is_read = false' : ''}
    ORDER BY week_start DESC 
    LIMIT $2
  `;
  
  // Use RPC or direct query through REST
  const response = await fetch(
    `https://zedzzgfvpbwuivuwgjyx.supabase.co/rest/v1/weekly_summaries?user_id=eq.${userId}${unreadOnly ? '&is_read=eq.false' : ''}&order=week_start.desc&limit=${limit}`,
    {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZHp6Z2Z2cGJ3dWl2dXdnanl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDU3OTAsImV4cCI6MjA4MjUyMTc5MH0.bQPrporHT6jWN_tXDCGJG0kTHTWM6BaYdpxZ6kyFkKM',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch weekly summaries:', await response.text());
    return [];
  }

  const data = await response.json();
  return (data || []).map((d: any) => ({
    id: d.id,
    user_id: d.user_id,
    week_start: d.week_start,
    week_end: d.week_end,
    summary_data: d.summary_data as WeeklySummaryData,
    ai_analysis: d.ai_analysis,
    is_read: d.is_read,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));
}

async function markSummaryAsRead(summaryId: string): Promise<void> {
  const response = await fetch(
    `https://zedzzgfvpbwuivuwgjyx.supabase.co/rest/v1/weekly_summaries?id=eq.${summaryId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZHp6Z2Z2cGJ3dWl2dXdnanl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDU3OTAsImV4cCI6MjA4MjUyMTc5MH0.bQPrporHT6jWN_tXDCGJG0kTHTWM6BaYdpxZ6kyFkKM',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ is_read: true }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to mark summary as read');
  }
}

export function useWeeklySummary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch unread weekly summary
  const unreadSummaryQuery = useQuery({
    queryKey: ['weekly-summary-unread', user?.id],
    queryFn: async (): Promise<WeeklySummary | null> => {
      if (!user) return null;

      const summaries = await fetchWeeklySummaries(user.id, true, 1);
      return summaries.length > 0 ? summaries[0] : null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all summaries (for history)
  const allSummariesQuery = useQuery({
    queryKey: ['weekly-summaries', user?.id],
    queryFn: async (): Promise<WeeklySummary[]> => {
      if (!user) return [];
      return fetchWeeklySummaries(user.id, false, 12);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Mark summary as read
  const markAsReadMutation = useMutation({
    mutationFn: markSummaryAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-summary-unread'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summaries'] });
    },
  });

  // Generate summary on demand (for testing)
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-weekly-summary', {
        body: { userId: user.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-summary-unread'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summaries'] });
    },
  });

  return {
    unreadSummary: unreadSummaryQuery.data,
    allSummaries: allSummariesQuery.data || [],
    isLoading: unreadSummaryQuery.isLoading,
    markAsRead: markAsReadMutation.mutate,
    generateSummary: generateSummaryMutation.mutate,
    isGenerating: generateSummaryMutation.isPending,
  };
}
