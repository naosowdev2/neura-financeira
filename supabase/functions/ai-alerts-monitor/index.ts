import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alert {
  id: string;
  type: 'budget' | 'balance' | 'pattern' | 'insight' | 'invoice' | 'savings' | 'recurrence' | 'installment';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: 'reduce_spending' | 'review_budget' | 'add_income' | 'view_details';
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user financial data
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get accounts with balances
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false);

    // Get budgets with spending
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get this month's transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0]);

    // Get upcoming expenses (next 7 days)
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    
    const { data: upcomingTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', next7Days.toISOString().split('T')[0]);

    // Get credit card invoices
    const { data: invoices } = await supabase
      .from('credit_card_invoices')
      .select('*, credit_card:credit_cards(*)')
      .eq('user_id', userId)
      .eq('status', 'open')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', next7Days.toISOString().split('T')[0]);

    // Get savings goals (including current_amount for total assets calculation)
    const { data: savingsGoals } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId);

    // Get active recurrences
    const { data: recurrences } = await supabase
      .from('recurrences')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get installment groups with remaining installments and dates
    const { data: installmentGroups } = await supabase
      .from('installment_groups')
      .select('*, transactions:transactions(id, status, date, installment_number, amount)')
      .eq('user_id', userId);

    const alerts: Alert[] = [];

    // Calculate total balance from accounts using the proper calculation function
    let totalBalance = 0;
    const accountsToInclude = (accounts || []).filter(a => a.include_in_total);
    
    for (const account of accountsToInclude) {
      const { data: calculatedBalance } = await supabase.rpc('calculate_account_balance', {
        p_account_id: account.id,
        p_include_pending: false
      });
      totalBalance += calculatedBalance ?? 0;
    }

    console.log('AI Alerts - Accounts found:', accounts?.length || 0);
    console.log('AI Alerts - Total balance calculated:', totalBalance);

    // Calculate total savings (cofrinhos) - emergency reserve
    const totalSavingsBalance = (savingsGoals || [])
      .reduce((sum, g) => sum + (g.current_amount || 0), 0);

    console.log('AI Alerts - Savings balance:', totalSavingsBalance);

    // Total assets = accounts + savings goals
    const totalAssets = totalBalance + totalSavingsBalance;

    console.log('AI Alerts - Total assets:', totalAssets);

    // Calculate upcoming expenses
    const upcomingExpenses = (upcomingTransactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate invoice totals
    const invoicesDue = (invoices || [])
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    // Total upcoming obligations
    const totalUpcoming = upcomingExpenses + invoicesDue;

    // Check if savings cover upcoming expenses
    const hasReserves = totalSavingsBalance >= totalUpcoming;

    // Calculate monthly expenses for coverage estimation
    const monthlyExpenses = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const daysInMonth = endOfMonth.getDate();
    const dayOfMonth = today.getDate();
    const projectedMonthlyExpenses = dayOfMonth > 0 ? (monthlyExpenses / dayOfMonth) * daysInMonth : monthlyExpenses;
    const monthsOfCoverage = projectedMonthlyExpenses > 0 ? totalAssets / projectedMonthlyExpenses : Infinity;

    // Alert 1: Low balance - considers total assets
    const isLowBalance = totalBalance < 500;
    
    if (isLowBalance && !hasReserves) {
      // Low balance AND no reserves = critical/warning
      alerts.push({
        id: 'low-balance',
        type: 'balance',
        severity: totalBalance < 100 && totalAssets < 500 ? 'critical' : 'warning',
        title: 'Saldo disponível baixo',
        message: `Saldo em contas: R$ ${totalBalance.toFixed(2)}. ${
          totalSavingsBalance > 0 
            ? `Você tem R$ ${totalSavingsBalance.toFixed(2)} em cofrinhos que podem ser usados.`
            : 'Considere revisar seus gastos.'
        }`,
        actionLabel: 'Ver contas',
        actionType: 'view_details',
      });
    } else if (isLowBalance && hasReserves) {
      // Low balance but has reserves = info only
      alerts.push({
        id: 'low-balance-covered',
        type: 'balance',
        severity: 'info',
        title: 'Saldo baixo, mas você tem reservas',
        message: `Saldo em contas: R$ ${totalBalance.toFixed(2)}. Seus cofrinhos (R$ ${totalSavingsBalance.toFixed(2)}) cobrem as próximas despesas.`,
        actionLabel: 'Ver reservas',
        actionType: 'view_details',
      });
    }

    // Alert 2: Upcoming expenses - considers total assets
    if (totalUpcoming > 0) {
      if (totalUpcoming > totalAssets) {
        // Expenses exceed total assets = critical
        alerts.push({
          id: 'upcoming-exceed-critical',
          type: 'balance',
          severity: 'critical',
          title: 'Despesas excedem patrimônio total',
          message: `R$ ${totalUpcoming.toFixed(2)} em despesas nos próximos 7 dias. Seu patrimônio total é de R$ ${totalAssets.toFixed(2)}.`,
          actionLabel: 'Revisar despesas',
          actionType: 'view_details',
        });
      } else if (totalUpcoming > totalBalance) {
        // Expenses exceed available balance but savings can cover = warning
        alerts.push({
          id: 'upcoming-exceed-warning',
          type: 'balance',
          severity: 'warning',
          title: 'Despesas próximas excedem saldo',
          message: `R$ ${totalUpcoming.toFixed(2)} em despesas nos próximos 7 dias excedem seu saldo (R$ ${totalBalance.toFixed(2)}). Você pode usar seus cofrinhos (R$ ${totalSavingsBalance.toFixed(2)}) se necessário.`,
          actionLabel: 'Revisar planejamento',
          actionType: 'view_details',
        });
      } else if (totalUpcoming > totalBalance * 0.8) {
        // Expenses are >80% of available balance = info
        const percentOfBalance = Math.round((totalUpcoming / totalBalance) * 100);
        alerts.push({
          id: 'upcoming-high',
          type: 'balance',
          severity: 'info',
          title: 'Atenção ao planejamento',
          message: `R$ ${totalUpcoming.toFixed(2)} em despesas nos próximos 7 dias (${percentOfBalance}% do saldo disponível).`,
          actionLabel: 'Ver detalhes',
          actionType: 'view_details',
        });
      }
    }

    // Alert 3: Budget alerts
    if (budgets && transactions) {
      for (const budget of budgets) {
        const categorySpending = transactions
          .filter(t => t.type === 'expense' && t.category_id === budget.category_id)
          .reduce((sum, t) => sum + t.amount, 0);

        const percentUsed = (categorySpending / budget.amount) * 100;
        const expectedPercent = (dayOfMonth / daysInMonth) * 100;

        if (percentUsed >= 100) {
          alerts.push({
            id: `budget-exceeded-${budget.id}`,
            type: 'budget',
            severity: 'critical',
            title: `Orçamento estourado: ${budget.category?.name || 'Categoria'}`,
            message: `Você gastou R$ ${categorySpending.toFixed(2)} de R$ ${budget.amount.toFixed(2)} (${percentUsed.toFixed(0)}%).`,
            actionLabel: 'Revisar orçamento',
            actionType: 'review_budget',
            metadata: { budgetId: budget.id, categoryName: budget.category?.name },
          });
        } else if (percentUsed >= 80) {
          alerts.push({
            id: `budget-warning-${budget.id}`,
            type: 'budget',
            severity: 'warning',
            title: `Orçamento quase no limite: ${budget.category?.name || 'Categoria'}`,
            message: `Você já usou ${percentUsed.toFixed(0)}% do orçamento. Restam R$ ${(budget.amount - categorySpending).toFixed(2)}.`,
            actionLabel: 'Reduzir gastos',
            actionType: 'reduce_spending',
            metadata: { budgetId: budget.id, categoryName: budget.category?.name },
          });
        } else if (percentUsed > expectedPercent + 20) {
          alerts.push({
            id: `budget-pace-${budget.id}`,
            type: 'budget',
            severity: 'info',
            title: `Ritmo acelerado: ${budget.category?.name || 'Categoria'}`,
            message: `Você está gastando mais rápido que o esperado. Projeção: R$ ${((categorySpending / dayOfMonth) * daysInMonth).toFixed(2)} até o fim do mês.`,
            actionLabel: 'Ver detalhes',
            actionType: 'view_details',
            metadata: { budgetId: budget.id, categoryName: budget.category?.name },
          });
        }
      }
    }

    // Alert 4: Invoice due soon
    if (invoices && invoices.length > 0) {
      for (const invoice of invoices) {
        const dueDate = new Date(invoice.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= 3 && invoice.total_amount > 0) {
          alerts.push({
            id: `invoice-due-${invoice.id}`,
            type: 'balance',
            severity: daysUntilDue <= 1 ? 'critical' : 'warning',
            title: `Fatura vencendo: ${invoice.credit_card?.name || 'Cartão'}`,
            message: `Fatura de R$ ${invoice.total_amount.toFixed(2)} vence ${daysUntilDue === 0 ? 'hoje' : daysUntilDue === 1 ? 'amanhã' : `em ${daysUntilDue} dias`}.`,
            actionLabel: 'Ver fatura',
            actionType: 'view_details',
            metadata: { invoiceId: invoice.id },
          });
        }
      }
    }

    // Alert 5: Spending pattern detection
    if (transactions && transactions.length >= 5) {
      const expensesByCategory: Record<string, number> = {};
      const expenseTransactions = transactions.filter(t => t.type === 'expense');

      for (const t of expenseTransactions) {
        const catName = t.category?.name || 'Sem categoria';
        expensesByCategory[catName] = (expensesByCategory[catName] || 0) + t.amount;
      }

      const totalExpensesAmount = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);
      
      // Find dominant category (>40% of spending)
      for (const [category, amount] of Object.entries(expensesByCategory)) {
        const percent = (amount / totalExpensesAmount) * 100;
        if (percent > 40) {
          alerts.push({
            id: `pattern-dominant-${category}`,
            type: 'pattern',
            severity: 'info',
            title: `Padrão detectado`,
            message: `${percent.toFixed(0)}% dos seus gastos este mês foram em "${category}". Considere diversificar ou revisar essa categoria.`,
            actionLabel: 'Analisar',
            actionType: 'view_details',
          });
          break;
        }
      }
    }

    // Alert 6: Savings goals (only non-completed goals)
    const activeSavingsGoals = (savingsGoals || []).filter(g => !g.is_completed);
    if (activeSavingsGoals.length > 0) {
      for (const goal of activeSavingsGoals) {
        if (goal.target_amount && goal.target_amount > 0) {
          const progress = (goal.current_amount / goal.target_amount) * 100;
          const remaining = goal.target_amount - goal.current_amount;

          if (progress >= 90 && progress < 100) {
            alerts.push({
              id: `savings-almost-${goal.id}`,
              type: 'savings',
              severity: 'info',
              title: `Quase lá: ${goal.name}!`,
              message: `Faltam apenas R$ ${remaining.toFixed(2)} para atingir sua meta! Você está a ${(100 - progress).toFixed(0)}% de completar.`,
              actionLabel: 'Completar meta',
              actionType: 'view_details',
              metadata: { goalId: goal.id },
            });
          }
        }

        // Check deadline proximity
        if (goal.deadline) {
          const deadline = new Date(goal.deadline);
          const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDeadline <= 7 && daysUntilDeadline > 0 && goal.target_amount) {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            if (progress < 80) {
              alerts.push({
                id: `savings-deadline-${goal.id}`,
                type: 'savings',
                severity: 'warning',
                title: `Meta "${goal.name}" vence em breve`,
                message: `Prazo em ${daysUntilDeadline} dia(s) e você está em ${progress.toFixed(0)}%. Faltam R$ ${(goal.target_amount - goal.current_amount).toFixed(2)}.`,
                actionLabel: 'Ver plano',
                actionType: 'view_details',
                metadata: { goalId: goal.id },
              });
            }
          }
        }
      }
    }

    // Alert 7: Upcoming recurrences (next 3 days)
    const next3Days = new Date(today);
    next3Days.setDate(next3Days.getDate() + 3);
    
    if (recurrences && recurrences.length > 0) {
      for (const recurrence of recurrences) {
        if (recurrence.next_occurrence) {
          const nextDate = new Date(recurrence.next_occurrence);
          if (nextDate >= today && nextDate <= next3Days && recurrence.type === 'expense') {
            const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            alerts.push({
              id: `recurrence-upcoming-${recurrence.id}`,
              type: 'recurrence',
              severity: 'info',
              title: `Despesa recorrente: ${recurrence.description}`,
              message: `R$ ${recurrence.amount.toFixed(2)} será cobrado ${daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`}.`,
              actionLabel: 'Ver detalhes',
              actionType: 'view_details',
              metadata: { recurrenceId: recurrence.id },
            });
          }
        }
      }
    }

    // Alert 8: Installments finishing soon (last 2 installments)
    if (installmentGroups && installmentGroups.length > 0) {
      for (const group of installmentGroups) {
        const paidCount = (group.transactions || []).filter((t: any) => t.status === 'confirmed').length;
        const remaining = group.total_installments - paidCount;
        
        if (remaining === 1) {
          alerts.push({
            id: `installment-final-${group.id}`,
            type: 'installment',
            severity: 'info',
            title: `Última parcela: ${group.description}`,
            message: `Esta é a última parcela de R$ ${group.installment_amount.toFixed(2)}! 🎉`,
            actionLabel: 'Ver parcelamento',
            actionType: 'view_details',
            metadata: { groupId: group.id },
          });
        } else if (remaining === 2) {
          alerts.push({
            id: `installment-ending-${group.id}`,
            type: 'installment',
            severity: 'info',
            title: `Parcelamento finalizando: ${group.description}`,
            message: `Faltam apenas 2 parcelas de R$ ${group.installment_amount.toFixed(2)}.`,
            actionLabel: 'Ver detalhes',
            actionType: 'view_details',
            metadata: { groupId: group.id },
          });
        }
      }
    }

    // Alert 9: Installments due soon (próximos 3 dias)
    if (installmentGroups && installmentGroups.length > 0) {
      for (const group of installmentGroups) {
        const pendingTransactions = (group.transactions || [])
          .filter((t: any) => t.status === 'pending');
        
        for (const transaction of pendingTransactions) {
          const transactionDate = new Date(transaction.date);
          const daysUntilDue = Math.ceil(
            (transactionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Alert if due in next 3 days
          if (daysUntilDue >= 0 && daysUntilDue <= 3) {
            const installmentLabel = `${transaction.installment_number}/${group.total_installments}`;
            
            alerts.push({
              id: `installment-due-${transaction.id}`,
              type: 'installment',
              severity: daysUntilDue <= 1 ? 'warning' : 'info',
              title: `Parcela ${installmentLabel} vencendo`,
              message: `${group.description}: R$ ${group.installment_amount.toFixed(2)} ${
                daysUntilDue === 0 ? 'vence hoje!' : 
                daysUntilDue === 1 ? 'vence amanhã' : 
                `vence em ${daysUntilDue} dias`
              }`,
              actionLabel: 'Ver parcela',
              actionType: 'view_details',
              metadata: { 
                groupId: group.id, 
                transactionId: transaction.id,
                installmentNumber: transaction.installment_number
              },
            });
          }
        }
      }
    }

    // Positive insight: Healthy reserves (3+ months of coverage)
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (monthsOfCoverage >= 3 && criticalAlerts.length === 0 && totalAssets > 0) {
      alerts.push({
        id: 'healthy-reserves',
        type: 'insight',
        severity: 'info',
        title: 'Reserva financeira saudável',
        message: `Seu patrimônio cobre ${monthsOfCoverage.toFixed(1)} meses de despesas. Continue assim! 💪`,
      });
    }

    // Positive insight if no critical/warning alerts
    const warningOrCritical = alerts.filter(a => a.severity !== 'info').length;
    if (warningOrCritical === 0 && alerts.length < 3) {
      const monthlyIncome = (transactions || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      if (monthlyIncome > monthlyExpenses && monthlyExpenses > 0) {
        alerts.push({
          id: 'positive-balance',
          type: 'insight',
          severity: 'info',
          title: 'Finanças saudáveis!',
          message: `Você está economizando R$ ${(monthlyIncome - monthlyExpenses).toFixed(2)} este mês. Continue assim!`,
        });
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    console.log(`Generated ${alerts.length} alerts for user ${userId} (balance: ${totalBalance.toFixed(2)}, savings: ${totalSavingsBalance.toFixed(2)}, assets: ${totalAssets.toFixed(2)})`);

    return new Response(JSON.stringify({ alerts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-alerts-monitor:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
