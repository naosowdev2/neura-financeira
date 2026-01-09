import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, subMonths, isBefore, isAfter, isSameMonth } from 'date-fns';
import { parseDateOnly } from '@/lib/utils';

export function useDashboard(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
  const today = format(now, 'yyyy-MM-dd');
  
  // Determine if selected month is past, current, or future
  const isCurrentMonth = isSameMonth(selectedDate, now);
  const isFutureMonth = isAfter(startOfMonth(selectedDate), endOfMonth(now));
  const isPastMonth = isBefore(endOfMonth(selectedDate), startOfMonth(now));

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', user?.id, monthStart],
    queryFn: async () => {
      if (!user) return null;

      // Fetch accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (accountsError) throw accountsError;

      // Calculate balances for each account using the SQL function
      const accountBalances = await Promise.all(
        (accounts || []).map(async (account) => {
          const { data: calculatedBalance } = await (supabase.rpc as any)('calculate_account_balance', {
            p_account_id: account.id,
            p_include_pending: false,
          });

          const { data: balanceWithPending } = await (supabase.rpc as any)('calculate_account_balance', {
            p_account_id: account.id,
            p_include_pending: true,
          });

          return {
            ...account,
            current_balance: calculatedBalance ?? Number(account.initial_balance),
            balance_with_pending: balanceWithPending ?? Number(account.initial_balance),
          };
        })
      );

      // Calculate initial balance of month (sum of accounts' initial_balance + transactions before monthStart)
      const { data: transactionsBeforeMonth } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .lt('due_date', monthStart)
        .is('credit_card_id', null);

      const accountInitialBalances = (accounts || [])
        .filter(a => a.include_in_total)
        .reduce((sum, a) => sum + Number(a.initial_balance), 0);

      const balanceBeforeMonth = (transactionsBeforeMonth || []).reduce((sum, t) => {
        // Ignorar transações de cofrinho - são movimentos internos
        if (t.savings_goal_id) return sum;
        if (t.type === 'income') return sum + Number(t.amount);
        if (t.type === 'expense') return sum - Number(t.amount);
        if (t.type === 'transfer') {
          // Transferências para cofrinhos já diminuem o saldo
          return sum - Number(t.amount);
        }
        return sum;
      }, 0);

      const initialMonthBalance = accountInitialBalances + balanceBeforeMonth;

      // Calculate current balance based on whether it's past, current, or future month
      let currentBalance: number;
      
      if (isFutureMonth) {
        // For future months, current balance is the initial balance (no confirmed transactions yet)
        currentBalance = initialMonthBalance;
      } else if (isPastMonth) {
        // For past months, current balance includes all confirmed transactions of that month
        const { data: allConfirmedInMonth } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd)
          .is('credit_card_id', null);

        const pastMonthMovement = (allConfirmedInMonth || []).reduce((sum, t) => {
          if (t.savings_goal_id) return sum;
          if (t.type === 'income') return sum + Number(t.amount);
          if (t.type === 'expense') return sum - Number(t.amount);
          if (t.type === 'transfer') return sum - Number(t.amount);
          return sum;
        }, 0);

        currentBalance = initialMonthBalance + pastMonthMovement;
      } else {
        // For current month, only confirmed transactions up to today
        const { data: confirmedTransactionsUpToToday } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .gte('due_date', monthStart)
          .lte('due_date', today)
          .is('credit_card_id', null);

        const currentMonthMovement = (confirmedTransactionsUpToToday || []).reduce((sum, t) => {
          if (t.savings_goal_id) return sum;
          if (t.type === 'income') return sum + Number(t.amount);
          if (t.type === 'expense') return sum - Number(t.amount);
          if (t.type === 'transfer') return sum - Number(t.amount);
          return sum;
        }, 0);

        currentBalance = initialMonthBalance + currentMonthMovement;
      }

      // Calculate total balance (current as of now - using the original logic)
      const totalBalance = accountBalances
        .filter((a) => a.include_in_total)
        .reduce((sum, a) => sum + a.current_balance, 0);

      // Fetch this month's transactions (both confirmed and pending)
      const { data: allMonthTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .is('credit_card_id', null);

      // Excluir transações de cofrinhos dos cálculos de receita/despesa
      const monthIncome = (allMonthTransactions || [])
        .filter((t) => t.type === 'income' && !t.savings_goal_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const confirmedMonthExpenses = (allMonthTransactions || [])
        .filter((t) => t.type === 'expense' && t.status === 'confirmed' && !t.savings_goal_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingMonthExpenses = (allMonthTransactions || [])
        .filter((t) => t.type === 'expense' && t.status === 'pending' && !t.savings_goal_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const monthExpenses = confirmedMonthExpenses + pendingMonthExpenses;

      // Calculate pending income and expenses for projection
      const pendingIncomeTotal = (allMonthTransactions || [])
        .filter((t) => t.type === 'income' && t.status === 'pending' && !t.savings_goal_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const pendingExpensesTotal = (allMonthTransactions || [])
        .filter((t) => t.type === 'expense' && t.status === 'pending' && !t.savings_goal_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Projected balance = saldo disponível atual + receitas pendentes - despesas pendentes
      const projectedBalance = totalBalance + pendingIncomeTotal - pendingExpensesTotal;

      // Pending expenses for current month alert
      const { data: pendingExpensesThisMonth } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('status', 'pending')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date');

      // Pending income for current month
      const { data: pendingIncomeThisMonth } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .eq('type', 'income')
        .eq('status', 'pending')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date');

      // ALL future pending expenses (for global alert)
      const { data: allFuturePendingExpenses } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('status', 'pending')
        .gt('due_date', today)
        .order('due_date');

      // Fetch credit cards with current invoice from the invoices table
      const { data: creditCards } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      // Helper function to calculate billing month based on closing day
      const getBillingMonthForCard = (transactionDate: Date, closingDay: number): Date => {
        const day = transactionDate.getDate();
        let billingMonth = transactionDate.getMonth();
        let billingYear = transactionDate.getFullYear();
        
        if (day > closingDay) {
          billingMonth++;
          if (billingMonth > 11) {
            billingMonth = 0;
            billingYear++;
          }
        }
        
        return new Date(billingYear, billingMonth, 1);
      };

      const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM');

      const cardsWithInvoice = await Promise.all(
        (creditCards || []).map(async (card) => {
          const closingDay = card.closing_day || 1;
          
          // Get ALL invoices for this card to calculate current month and total committed
          const { data: allInvoices } = await (supabase
            .from('credit_card_invoices') as any)
            .select('*')
            .eq('credit_card_id', card.id);

          // Current month invoice (for display)
          const currentMonthInvoice = (allInvoices || []).find((inv: any) => 
            format(parseDateOnly(inv.reference_month), 'yyyy-MM') === currentMonth &&
            inv.status === 'open'
          );

          // Get ALL orphan transactions (without invoice_id)
          const { data: orphanTxns } = await supabase
            .from('transactions')
            .select('amount, due_date')
            .eq('credit_card_id', card.id)
            .is('invoice_id', null)
            .eq('type', 'expense')
            .eq('status', 'confirmed');

          // Current month invoice amount (for display)
          let currentInvoice = currentMonthInvoice?.total_amount ?? 0;
          
          // Add orphans that belong to current billing month (respecting closing_day)
          const orphanCurrentMonth = (orphanTxns || [])
            .filter((t: any) => {
              const txnDate = parseDateOnly(t.due_date);
              const billingMonth = getBillingMonthForCard(txnDate, closingDay);
              return format(billingMonth, 'yyyy-MM') === currentMonth;
            })
            .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

          currentInvoice += orphanCurrentMonth;

          // TOTAL COMMITTED = all unpaid invoices + all orphan transactions
          // This reflects the REAL credit limit usage
          const unpaidInvoicesTotal = (allInvoices || [])
            .filter((inv: any) => inv.status !== 'paid')
            .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
          
          const allOrphansTotal = (orphanTxns || [])
            .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

          const totalCommitted = unpaidInvoicesTotal + allOrphansTotal;

          return {
            ...card,
            current_invoice: currentInvoice,
            total_committed: totalCommitted,
            available_limit: Number(card.credit_limit) - totalCommitted,
          };
        })
      );

      // Fetch budgets with current spending
      const { data: budgets } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id);

      const budgetsWithSpending = await Promise.all(
        (budgets || []).map(async (budget) => {
          const { data: categoryTransactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('category_id', budget.category_id)
            .eq('type', 'expense')
            .eq('status', 'confirmed')
            .gte('due_date', monthStart)
            .lte('due_date', monthEnd);

          const spent = (categoryTransactions || []).reduce(
            (sum, t) => sum + Number(t.amount),
            0
          );

          return {
            ...budget,
            spent,
            remaining: Number(budget.amount) - spent,
            percentage: (spent / Number(budget.amount)) * 100,
          };
        })
      );

      // Fetch savings goals for total calculation
      const { data: savingsGoals } = await supabase
        .from('savings_goals')
        .select('current_amount')
        .eq('user_id', user.id);

      const totalSavingsGoals = (savingsGoals || []).reduce(
        (sum, goal) => sum + Number(goal.current_amount || 0),
        0
      );

      // Fetch upcoming transactions (pending)
      const { data: upcomingTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          account:accounts!transactions_account_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('due_date', today)
        .order('due_date')
        .limit(5);

      // Recent transactions for the selected month (limited for list display)
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          account:accounts!transactions_account_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: false })
        .limit(10);

      // ALL expense transactions for chart (no limit) - including credit card expenses
      const { data: chartTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd);

      // Helper function to add date alias for backwards compatibility
      const addDateAlias = (transactions: any[]) => 
        (transactions || []).map((t: any) => ({ ...t, date: t.due_date }));

      return {
        accounts: accountBalances,
        totalBalance,
        initialMonthBalance,
        currentBalance: totalBalance,
        projectedBalance,
        totalSavingsGoals,
        netWorth: totalBalance + totalSavingsGoals,
        monthIncome,
        monthExpenses,
        confirmedMonthExpenses,
        pendingMonthExpenses,
        monthBalance: monthIncome - monthExpenses,
        creditCards: cardsWithInvoice,
        budgets: budgetsWithSpending,
        upcomingTransactions: addDateAlias(upcomingTransactions),
        recentTransactions: addDateAlias(recentTransactions),
        chartTransactions: addDateAlias(chartTransactions),
        pendingExpenses: addDateAlias(pendingExpensesThisMonth),
        pendingIncome: addDateAlias(pendingIncomeThisMonth),
        futurePendingExpenses: addDateAlias(allFuturePendingExpenses),
      };
    },
    enabled: !!user,
  });

  return {
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  };
}
