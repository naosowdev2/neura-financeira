import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklySummary {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { userId, processAllUsers } = body;

    // Calculate week range (previous week: Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - diffToLastMonday - 7);
    lastMonday.setHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const weekStart = lastMonday.toISOString().split('T')[0];
    const weekEnd = lastSunday.toISOString().split('T')[0];

    // Previous week for comparison
    const prevMonday = new Date(lastMonday);
    prevMonday.setDate(lastMonday.getDate() - 7);
    const prevSunday = new Date(lastSunday);
    prevSunday.setDate(lastSunday.getDate() - 7);
    const prevWeekStart = prevMonday.toISOString().split('T')[0];
    const prevWeekEnd = prevSunday.toISOString().split('T')[0];

    console.log(`Generating weekly summary for ${weekStart} to ${weekEnd}`);

    // Process all users (cron job)
    if (processAllUsers) {
      const { data: users, error: usersError } = await supabase
        .from('accounts')
        .select('user_id')
        .eq('is_archived', false);

      if (usersError) throw usersError;

      const uniqueUserIds = [...new Set((users || []).map((u: any) => u.user_id))];
      console.log(`Processing ${uniqueUserIds.length} users`);

      let successCount = 0;
      for (const uid of uniqueUserIds) {
        try {
          const summary = await generateWeeklySummary(
            supabase, 
            uid as string, 
            weekStart, 
            weekEnd, 
            prevWeekStart, 
            prevWeekEnd,
            lovableApiKey
          );
          
          if (summary) {
            await saveWeeklySummary(supabase, uid as string, weekStart, weekEnd, summary);
            await sendWeeklySummaryPush(supabase, uid as string, summary);
            successCount++;
          }
        } catch (userError) {
          console.error(`Error processing user ${uid}:`, userError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: successCount, total: uniqueUserIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process single user
    if (userId) {
      const summary = await generateWeeklySummary(
        supabase, 
        userId, 
        weekStart, 
        weekEnd, 
        prevWeekStart, 
        prevWeekEnd,
        lovableApiKey
      );

      if (summary) {
        await saveWeeklySummary(supabase, userId, weekStart, weekEnd, summary);
      }

      return new Response(
        JSON.stringify({ success: true, summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'userId or processAllUsers required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-weekly-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateWeeklySummary(
  supabase: any,
  userId: string,
  weekStart: string,
  weekEnd: string,
  prevWeekStart: string,
  prevWeekEnd: string,
  lovableApiKey?: string
): Promise<WeeklySummary | null> {
  // Fetch transactions for current week
  const { data: currentWeekTx } = await supabase
    .from('transactions')
    .select(`
      id, type, amount, description, date, status,
      categories!transactions_category_id_fkey (name, color)
    `)
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .gte('date', weekStart)
    .lte('date', weekEnd);

  // Fetch transactions for previous week (for comparison)
  const { data: prevWeekTx } = await supabase
    .from('transactions')
    .select('id, type, amount')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .gte('date', prevWeekStart)
    .lte('date', prevWeekEnd);

  // If no transactions, skip this user
  if (!currentWeekTx || currentWeekTx.length === 0) {
    console.log(`No transactions for user ${userId} in week ${weekStart}`);
    return null;
  }

  // Calculate totals
  const totalIncome = currentWeekTx
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalExpenses = currentWeekTx
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const lastWeekExpenses = (prevWeekTx || [])
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpenses;

  // Calculate comparison
  let comparedToLastWeek = '0%';
  if (lastWeekExpenses > 0) {
    const diff = ((totalExpenses - lastWeekExpenses) / lastWeekExpenses) * 100;
    comparedToLastWeek = diff >= 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
  }

  // Get top categories
  const categoryTotals: Record<string, { name: string; amount: number; color: string }> = {};
  currentWeekTx
    .filter((t: any) => t.type === 'expense')
    .forEach((t: any) => {
      const catName = t.categories?.name || 'Outros';
      const catColor = t.categories?.color || '#6366f1';
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { name: catName, amount: 0, color: catColor };
      }
      categoryTotals[catName].amount += Number(t.amount);
    });

  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Fetch active budgets
  const { data: budgets } = await supabase
    .from('budgets')
    .select(`
      id, amount,
      categories!budgets_category_id_fkey (name)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  // Calculate budget usage (for current month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const budgetSummary: Array<{ name: string; spent: number; limit: number; percentage: number }> = [];
  
  for (const budget of (budgets || [])) {
    const { data: budgetTx } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_id', budget.id)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    const spent = (budgetTx || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const percentage = (spent / budget.amount) * 100;

    budgetSummary.push({
      name: budget.categories?.name || 'Orçamento',
      spent,
      limit: budget.amount,
      percentage,
    });
  }

  // Generate highlights
  const highlights: Array<{ type: 'positive' | 'attention' | 'tip'; message: string }> = [];

  // Positive highlights
  if (balance > 0) {
    highlights.push({
      type: 'positive',
      message: `Você economizou R$ ${balance.toFixed(2)} esta semana!`,
    });
  }

  if (lastWeekExpenses > 0 && totalExpenses < lastWeekExpenses) {
    const saved = lastWeekExpenses - totalExpenses;
    highlights.push({
      type: 'positive',
      message: `Gastou R$ ${saved.toFixed(2)} a menos que na semana passada`,
    });
  }

  // Attention highlights
  budgetSummary
    .filter(b => b.percentage >= 80)
    .forEach(b => {
      highlights.push({
        type: 'attention',
        message: `${b.name}: ${b.percentage.toFixed(0)}% do orçamento utilizado`,
      });
    });

  if (balance < 0) {
    highlights.push({
      type: 'attention',
      message: `Gastos excederam receitas em R$ ${Math.abs(balance).toFixed(2)}`,
    });
  }

  // Generate AI analysis if API key available
  let aiAnalysis = '';
  if (lovableApiKey && highlights.length > 0) {
    try {
      const analysisPrompt = `Você é a Neura, assistente financeira. Analise brevemente (max 100 palavras) a semana financeira do usuário:
      
Receitas: R$ ${totalIncome.toFixed(2)}
Despesas: R$ ${totalExpenses.toFixed(2)}
Saldo: R$ ${balance.toFixed(2)}
Comparação com semana anterior: ${comparedToLastWeek}
Top categorias de gastos: ${topCategories.map(c => `${c.name}: R$ ${c.amount.toFixed(2)}`).join(', ')}
${budgetSummary.length > 0 ? `Orçamentos: ${budgetSummary.map(b => `${b.name}: ${b.percentage.toFixed(0)}%`).join(', ')}` : ''}

Forneça uma análise breve e motivadora, com 1-2 dicas práticas.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: analysisPrompt }],
          max_tokens: 300,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiAnalysis = aiData.choices?.[0]?.message?.content || '';
      }
    } catch (aiError) {
      console.error('Error generating AI analysis:', aiError);
    }
  }

  // Add AI-generated tip if we have analysis
  if (aiAnalysis && !highlights.some(h => h.type === 'tip')) {
    const tipMatch = aiAnalysis.match(/(?:dica|sugest[ãa]o|considere)[:\s]+([^.!]+[.!])/i);
    if (tipMatch) {
      highlights.push({ type: 'tip', message: tipMatch[1].trim() });
    }
  }

  return {
    weekStart,
    weekEnd,
    summary: {
      totalIncome,
      totalExpenses,
      balance,
      comparedToLastWeek,
      lastWeekExpenses,
    },
    highlights,
    budgets: budgetSummary,
    topCategories,
    aiAnalysis,
  } as WeeklySummary & { aiAnalysis: string };
}

async function saveWeeklySummary(
  supabase: any,
  userId: string,
  weekStart: string,
  weekEnd: string,
  summary: WeeklySummary & { aiAnalysis?: string }
) {
  const { aiAnalysis, ...summaryData } = summary;

  const { error } = await supabase
    .from('weekly_summaries')
    .upsert({
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      summary_data: summaryData,
      ai_analysis: aiAnalysis || null,
      is_read: false,
    }, {
      onConflict: 'user_id,week_start',
    });

  if (error) {
    console.error('Error saving weekly summary:', error);
  } else {
    console.log(`Saved weekly summary for user ${userId}`);
  }
}

async function sendWeeklySummaryPush(
  supabase: any,
  userId: string,
  summary: WeeklySummary
) {
  // Check if user has active push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  // Send push notification about weekly summary
  const balanceText = summary.summary.balance >= 0
    ? `economizou R$ ${summary.summary.balance.toFixed(2)}`
    : `gastou R$ ${Math.abs(summary.summary.balance).toFixed(2)} a mais`;

  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/push-notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        notification: {
          title: '📊 Seu Resumo Semanal',
          body: `Você ${balanceText} esta semana! Veja a análise completa.`,
          tag: 'weekly-summary',
          url: '/dashboard',
          requireInteraction: true,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to send weekly summary push:', await response.text());
    }
  } catch (error) {
    console.error('Error sending weekly summary push:', error);
  }
}
