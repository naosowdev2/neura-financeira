import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cardName, invoiceTotal, categories, transactionCount, referenceMonth } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build category context
    const categoryBreakdown = categories
      .slice(0, 10)
      .map((cat: any) => `- ${cat.category_name}: R$ ${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)`)
      .join('\n');

    const prompt = `Analise esta fatura de cartão de crédito e forneça insights úteis em português brasileiro:

Cartão: ${cardName}
Período: ${referenceMonth}
Total da fatura: R$ ${invoiceTotal.toFixed(2)}
Quantidade de transações: ${transactionCount}

Distribuição por categoria:
${categoryBreakdown || 'Nenhuma categoria identificada'}

Responda em JSON com a seguinte estrutura:
{
  "summary": "Resumo geral da fatura em 1-2 frases",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "alerts": ["alerta importante se houver, como gasto alto em categoria específica"],
  "suggestions": ["sugestão curta 1", "sugestão curta 2"]
}

Foque em:
1. Identificar se há gastos concentrados em alguma categoria
2. Comparar proporções de gastos
3. Sugerir formas de economizar
4. Alertar sobre gastos que parecem elevados

Seja direto e prático. Não use emojis.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é Neura, uma assistente financeira especializada em análise de faturas de cartão de crédito. Responda sempre em JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Créditos insuficientes para análise de IA.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback response
      analysis = {
        summary: `Sua fatura de ${cardName} totaliza R$ ${invoiceTotal.toFixed(2)} com ${transactionCount} transações.`,
        insights: ['Análise detalhada não disponível no momento.'],
        alerts: [],
        suggestions: ['Revise suas transações para identificar possíveis economias.'],
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-invoice-analyzer:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
