import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionData {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  category_id?: string;
  account_id?: string;
  credit_card_id?: string;
}

interface ImpactAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  currentBalance: number;
  newBalance: number;
  projectedBalance: number;
  isCreditCard: boolean;
  creditLimit?: number;
  budgetImpact: {
    category_id: string;
    category_name: string;
    budget_amount: number;
    current_spent: number;
    after_transaction: number;
    percent_used: number;
    over_budget: boolean;
  } | null;
  warnings: string[];
  positives: string[];
  summary: string;
  recommendation: 'proceed' | 'proceed_with_caution' | 'review_recommended';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction, userId } = await req.json();

    if (!transaction || !userId) {
      return new Response(
        JSON.stringify({ error: 'Transaction and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const txn = transaction as TransactionData;
    const warnings: string[] = [];
    const positives: string[] = [];

    let currentBalance = 0;
    let isCreditCard = false;
    let creditLimit = 0;

    // Check if this is a credit card transaction
    if (txn.credit_card_id) {
      isCreditCard = true;
      
      // Get credit card data
      const { data: card } = await supabase
        .from('credit_cards')
        .select('credit_limit, name')
        .eq('id', txn.credit_card_id)
        .single();

      if (card) {
        creditLimit = Number(card.credit_limit || 0);
        
        // Get open/closed invoices total for this card
        const { data: openInvoices } = await supabase
          .from('credit_card_invoices')
          .select('total_amount')
          .eq('credit_card_id', txn.credit_card_id)
          .in('status', ['open', 'closed']);

        let currentInvoiceTotal = (openInvoices || []).reduce(
          (sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0
        );

        // IMPORTANT: Also get transactions without invoice_id (orphan transactions)
        // These are transactions that were created before the invoice linking was fixed
        const { data: orphanTransactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('credit_card_id', txn.credit_card_id)
          .is('invoice_id', null)
          .eq('type', 'expense')
          .eq('status', 'confirmed');

        const orphanTotal = (orphanTransactions || []).reduce(
          (sum: number, t: any) => sum + Number(t.amount || 0), 0
        );

        currentInvoiceTotal += orphanTotal;

        // Available limit is the "balance" for credit cards
        currentBalance = creditLimit - currentInvoiceTotal;
        
        console.log(`Credit card analysis - Limit: ${creditLimit}, Invoices: ${currentInvoiceTotal - orphanTotal}, Orphan txns: ${orphanTotal}, Total used: ${currentInvoiceTotal}, Available: ${currentBalance}`);
      }
    } else if (txn.account_id) {
      // Regular account balance calculation
      const { data: account } = await supabase
        .from('accounts')
        .select('current_balance, initial_balance, name')
        .eq('id', txn.account_id)
        .single();

      if (account) {
        // Calculate actual balance from transactions
        const { data: accountTxns } = await supabase
          .from('transactions')
          .select('type, amount, destination_account_id')
          .or(`account_id.eq.${txn.account_id},destination_account_id.eq.${txn.account_id}`)
          .eq('status', 'confirmed')
          .is('credit_card_id', null);

        currentBalance = Number(account.initial_balance || 0);
        (accountTxns || []).forEach((t: any) => {
          if (t.type === 'income') currentBalance += Number(t.amount);
          else if (t.type === 'expense') currentBalance -= Number(t.amount);
          else if (t.type === 'transfer') {
            if (t.destination_account_id === txn.account_id) {
              currentBalance += Number(t.amount);
            } else {
              currentBalance -= Number(t.amount);
            }
          }
        });
      }
    }

    // Calculate new balance/available limit after transaction
    let newBalance = currentBalance;
    if (txn.type === 'income') {
      newBalance += txn.amount;
    } else if (txn.type === 'expense' || txn.type === 'transfer') {
      newBalance -= txn.amount;
    }

    // Get future expenses (next 30 days) - only for regular accounts
    let projectedBalance = newBalance;
    let totalFutureExpenses = 0;
    
    if (!isCreditCard) {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: futureExpenses } = await supabase
        .from('transactions')
        .select('amount, date, description')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .eq('status', 'pending')
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', thirtyDaysFromNow.toISOString().split('T')[0]);

      totalFutureExpenses = (futureExpenses || []).reduce(
        (sum: number, e: any) => sum + Number(e.amount), 0
      );

      projectedBalance = newBalance - totalFutureExpenses;
    }

    // Check budget impact (if expense with category)
    const today = new Date();
    let budgetImpact = null;
    if (txn.type === 'expense' && txn.category_id) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      // Get budget for this category
      const { data: budget } = await supabase
        .from('budgets')
        .select('*, category:categories(name)')
        .eq('user_id', userId)
        .eq('category_id', txn.category_id)
        .eq('is_active', true)
        .maybeSingle();

      if (budget) {
        // Get current spending in this category
        const { data: categoryTxns } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('category_id', txn.category_id)
          .eq('type', 'expense')
          .eq('status', 'confirmed')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        const currentSpent = (categoryTxns || []).reduce(
          (sum: number, t: any) => sum + Number(t.amount), 0
        );
        const afterTransaction = currentSpent + txn.amount;
        const percentUsed = (afterTransaction / Number(budget.amount)) * 100;
        const overBudget = afterTransaction > Number(budget.amount);

        budgetImpact = {
          category_id: txn.category_id,
          category_name: budget.category?.name || 'Categoria',
          budget_amount: Number(budget.amount),
          current_spent: currentSpent,
          after_transaction: afterTransaction,
          percent_used: percentUsed,
          over_budget: overBudget,
        };

        if (overBudget) {
          const overAmount = afterTransaction - Number(budget.amount);
          warnings.push(
            `Orçamento de ${budget.category?.name} será ultrapassado em R$ ${overAmount.toFixed(2)}`
          );
        } else if (percentUsed >= 80) {
          warnings.push(
            `Orçamento de ${budget.category?.name} ficará em ${percentUsed.toFixed(0)}% usado`
          );
        }
      }
    }

    // Generate warnings/positives based on credit card vs account
    if (txn.type === 'expense' || txn.type === 'transfer') {
      if (isCreditCard) {
        // Credit card specific warnings
        if (newBalance < 0) {
          warnings.push('Limite do cartão será ultrapassado com esta compra');
        } else if (newBalance < creditLimit * 0.1) {
          warnings.push('Limite do cartão ficará muito baixo (menos de 10% disponível)');
        }
        
        const usagePercent = ((creditLimit - newBalance) / creditLimit) * 100;
        if (usagePercent > 80 && usagePercent <= 100) {
          warnings.push(`Uso do cartão ficará em ${usagePercent.toFixed(0)}% do limite`);
        }
        
        if (txn.amount > currentBalance * 0.5 && currentBalance > 0) {
          warnings.push('Esta compra usará mais de 50% do limite disponível');
        }
      } else {
        // Regular account warnings
        if (newBalance < 0) {
          warnings.push('Saldo ficará negativo após este lançamento');
        } else if (newBalance < 100) {
          warnings.push('Saldo ficará muito baixo (abaixo de R$ 100)');
        }

        if (projectedBalance < 0) {
          warnings.push(
            `Considerando despesas futuras de R$ ${totalFutureExpenses.toFixed(2)}, o saldo projetado ficará negativo`
          );
        }

        if (txn.amount > currentBalance * 0.5 && currentBalance > 0) {
          warnings.push('Este lançamento representa mais de 50% do seu saldo atual');
        }
      }
    }

    if (txn.type === 'income') {
      positives.push(`Sua receita aumentará o saldo em R$ ${txn.amount.toFixed(2)}`);
      if (currentBalance < 0 && newBalance >= 0) {
        positives.push('Este lançamento tirará sua conta do negativo!');
      }
    }

    if (txn.type === 'expense' && warnings.length === 0) {
      if (isCreditCard) {
        positives.push('Compra dentro do limite disponível do cartão');
      } else {
        positives.push('Lançamento dentro dos limites saudáveis');
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (warnings.some(w => w.includes('negativo') || w.includes('ultrapassado'))) {
      riskLevel = 'high';
    } else if (warnings.length > 0) {
      riskLevel = 'medium';
    }

    // Generate summary
    let summary = '';
    let recommendation: 'proceed' | 'proceed_with_caution' | 'review_recommended' = 'proceed';

    if (riskLevel === 'high') {
      summary = isCreditCard 
        ? 'Atenção: esta compra pode ultrapassar o limite do seu cartão.'
        : 'Atenção: este lançamento pode impactar significativamente suas finanças.';
      recommendation = 'review_recommended';
    } else if (riskLevel === 'medium') {
      summary = isCreditCard
        ? 'Compra possível, porém o uso do cartão ficará elevado.'
        : 'Lançamento possível, porém requer atenção aos alertas.';
      recommendation = 'proceed_with_caution';
    } else {
      if (txn.type === 'income') {
        summary = 'Ótimo! Esta receita contribuirá positivamente para suas finanças.';
      } else if (isCreditCard) {
        summary = 'Compra dentro do limite disponível. Pode prosseguir.';
      } else {
        summary = 'Lançamento dentro dos limites saudáveis. Pode prosseguir.';
      }
      recommendation = 'proceed';
    }

    const analysis: ImpactAnalysis = {
      riskLevel,
      currentBalance,
      newBalance,
      projectedBalance,
      isCreditCard,
      creditLimit: isCreditCard ? creditLimit : undefined,
      budgetImpact,
      warnings,
      positives,
      summary,
      recommendation,
    };

    console.log('Impact analysis result:', JSON.stringify(analysis, null, 2));

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-impact-analyzer:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao analisar impacto' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
