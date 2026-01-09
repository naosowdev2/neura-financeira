import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

interface FinancialHealthData {
  healthScore: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  monthsOfCoverage: number;
  savingsRate: number;
  creditUtilization: number;
  balanceTrend: 'up' | 'down' | 'stable';
  totalBalance: number;
  averageMonthlyExpenses: number;
  totalCreditUsed: number;
  totalCreditLimit: number;
}

export function useFinancialHealth() {
  const { user } = useAuth();
  const now = new Date();

  const query = useQuery({
    queryKey: ['financial-health', user?.id],
    queryFn: async (): Promise<FinancialHealthData> => {
      if (!user) throw new Error('No user');

      // Get accounts with balances
      const { data: accounts } = await (supabase as any)
        .from('accounts_with_balance')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      const totalBalance = (accounts || [])
        .filter((a: any) => a.include_in_total)
        .reduce((sum: number, a: any) => sum + (Number(a.calculated_balance) || 0), 0);

      // Get credit cards
      const { data: creditCards } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      // Calculate credit usage
      let totalCreditUsed = 0;
      const totalCreditLimit = (creditCards || []).reduce((sum, c) => sum + Number(c.credit_limit), 0);

      for (const card of creditCards || []) {
        const { data: invoices } = await supabase
          .from('credit_card_invoices')
          .select('total_amount')
          .eq('credit_card_id', card.id)
          .eq('status', 'open')
          .limit(1);

        const invoiceAmount = (invoices as { total_amount: number }[] | null)?.[0]?.total_amount ?? 0;
        totalCreditUsed += invoiceAmount;
      }

      const creditUtilization = totalCreditLimit > 0 
        ? (totalCreditUsed / totalCreditLimit) * 100 
        : 0;

      // Get last 4 months of expenses for average (including current month)
      const threeMonthsAgo = format(startOfMonth(subMonths(now, 3)), 'yyyy-MM-dd');
      const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data: recentExpenses } = await (supabase
        .from('transactions') as any)
        .select('amount, due_date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('due_date', threeMonthsAgo)
        .lte('due_date', currentMonthEnd)
        .is('credit_card_id', null);

      const totalExpenses = (recentExpenses || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      // Calculate actual months with data
      const monthsWithData = new Set(
        (recentExpenses || []).map((t: any) => format(new Date(t.due_date), 'yyyy-MM'))
      ).size;
      
      const averageMonthlyExpenses = monthsWithData > 0 
        ? totalExpenses / monthsWithData 
        : totalExpenses || 1;

      // Months of coverage
      const monthsOfCoverage = totalBalance > 0 && averageMonthlyExpenses > 0 
        ? totalBalance / averageMonthlyExpenses 
        : 0;

      // Current month income and expenses for savings rate
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data: currentMonthTransactions } = await (supabase
        .from('transactions') as any)
        .select('type, amount')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd);

      const monthIncome = (currentMonthTransactions || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const monthExpenses = (currentMonthTransactions || [])
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const savingsRate = monthIncome > 0 
        ? ((monthIncome - monthExpenses) / monthIncome) * 100 
        : 0;

      // Balance trend (compare to last month)
      const lastMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
      const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

      const { data: lastMonthTransactions } = await (supabase
        .from('transactions') as any)
        .select('type, amount')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('due_date', lastMonthStart)
        .lte('due_date', lastMonthEnd);

      const lastMonthIncome = (lastMonthTransactions || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const lastMonthExpenses = (lastMonthTransactions || [])
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const currentNet = monthIncome - monthExpenses;
      const lastNet = lastMonthIncome - lastMonthExpenses;

      let balanceTrend: 'up' | 'down' | 'stable' = 'stable';
      if (currentNet > lastNet * 1.1) balanceTrend = 'up';
      else if (currentNet < lastNet * 0.9) balanceTrend = 'down';

      // Calculate health score (0-100)
      let score = 50; // Base score

      // Positive balance (+20)
      if (totalBalance > 0) score += 20;
      else score -= 20;

      // Months of coverage (+20 for 6+ months, scaled)
      if (monthsOfCoverage >= 6) score += 20;
      else if (monthsOfCoverage >= 3) score += 15;
      else if (monthsOfCoverage >= 1) score += 5;
      else score -= 10;

      // Savings rate (+15 for 20%+, scaled)
      if (savingsRate >= 20) score += 15;
      else if (savingsRate >= 10) score += 10;
      else if (savingsRate >= 0) score += 5;
      else score -= 10;

      // Credit utilization (-15 for high usage)
      if (creditUtilization <= 30) score += 10;
      else if (creditUtilization <= 50) score += 0;
      else if (creditUtilization <= 70) score -= 5;
      else score -= 15;

      // Trend bonus
      if (balanceTrend === 'up') score += 5;
      else if (balanceTrend === 'down') score -= 5;

      // Clamp score
      const healthScore = Math.max(0, Math.min(100, score));

      let healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
      if (healthScore >= 80) healthStatus = 'excellent';
      else if (healthScore >= 60) healthStatus = 'good';
      else if (healthScore >= 40) healthStatus = 'fair';
      else healthStatus = 'poor';

      return {
        healthScore,
        healthStatus,
        monthsOfCoverage,
        savingsRate,
        creditUtilization,
        balanceTrend,
        totalBalance,
        averageMonthlyExpenses,
        totalCreditUsed,
        totalCreditLimit,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return query;
}
