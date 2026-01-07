import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  description: string;
  amount: number;
  type: string;
  category?: string;
  date: string;
}

interface SpendingData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: Array<{ name: string; value: number }>;
  incomeByCategory: Array<{ name: string; value: number }>;
  transactions: Transaction[];
  month: string;
  year: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: SpendingData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { totalIncome, totalExpenses, balance, expensesByCategory, incomeByCategory, transactions, month, year } = data;

    const topExpenseCategories = expensesByCategory
      .slice(0, 5)
      .map((c, i) => `${i + 1}. ${c.name}: R$ ${c.value.toFixed(2)}`)
      .join('\n');

    const topIncomeCategories = incomeByCategory
      .slice(0, 3)
      .map((c, i) => `${i + 1}. ${c.name}: R$ ${c.value.toFixed(2)}`)
      .join('\n');

    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0';
    const expenseRatio = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : '100';

    const systemPrompt = `Você é Neura, a consultora financeira pessoal do usuário, especialista em análise de gastos.
Sua tarefa é analisar os dados financeiros do usuário e fornecer insights personalizados.

Regras:
1. Seja direto e objetivo
2. Use emojis moderadamente para tornar a análise mais visual
3. Dê no máximo 4-5 insights principais
4. Sempre responda em português brasileiro
5. Foque em padrões, oportunidades de economia e pontos de atenção
6. Não repita os números exatos que já estão visíveis nos cards
7. Compare com boas práticas financeiras quando relevante`;

    const userPrompt = `Analise os dados financeiros de ${month}/${year}:

RESUMO:
- Receita total: R$ ${totalIncome.toFixed(2)}
- Despesas totais: R$ ${totalExpenses.toFixed(2)}
- Saldo do mês: R$ ${balance.toFixed(2)}
- Taxa de poupança: ${savingsRate}%
- Proporção despesas/receita: ${expenseRatio}%

MAIORES CATEGORIAS DE DESPESA:
${topExpenseCategories || 'Nenhuma despesa registrada'}

FONTES DE RECEITA:
${topIncomeCategories || 'Nenhuma receita registrada'}

NÚMERO DE TRANSAÇÕES: ${transactions.length}

Forneça uma análise concisa com insights sobre:
1. Padrões de gastos identificados
2. Oportunidades de economia
3. Pontos de atenção
4. Sugestões práticas para o próximo mês

Responda de forma estruturada e fácil de ler.`;

    console.log("Requesting AI spending analysis for:", month, year);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || 'Não foi possível gerar a análise.';

    console.log("AI analysis generated successfully");

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in ai-spending-analysis function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
