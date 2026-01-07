import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionData {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  description: string;
  category_name?: string;
  account_name?: string;
  credit_card_name?: string;
}

interface ImpactContext {
  riskLevel: 'low' | 'medium' | 'high';
  currentBalance: number;
  newBalance: number;
  budgetImpact?: {
    category_name: string;
    percent_used: number;
    over_budget: boolean;
  };
  warnings: string[];
}

interface ObservationResult {
  observation: string;
  tags: string[];
  pattern_detected: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both transaction observation and account analysis
    const { transaction, impactContext, type, context } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Handle account analysis type
    if (type === 'account_analysis' && context) {
      console.log('Processing account analysis:', JSON.stringify(context, null, 2));
      
      const { 
        accountName, 
        currentBalance, 
        periodIncome, 
        periodExpense, 
        periodBalance,
        transactionCount,
        transactions,
        referenceMonth 
      } = context;

      const systemPrompt = `Você é um assistente financeiro pessoal que analisa movimentações de contas bancárias.

Sua tarefa é fornecer uma análise ÚTIL e CONCISA da movimentação da conta no período.

REGRAS:
1. Seja CONCISO - máximo 3 frases no resumo
2. Dê INSIGHTS práticos sobre a saúde financeira
3. Identifique PADRÕES de gastos se houver
4. Sugira AÇÕES quando aplicável
5. Use linguagem natural e amigável
6. Responda em JSON válido`;

      const userPrompt = `Analise esta movimentação de conta:

CONTA: ${accountName}
PERÍODO: ${referenceMonth}
SALDO ATUAL: R$ ${currentBalance?.toFixed(2) || '0.00'}

RESUMO DO PERÍODO:
- Total de entradas: R$ ${periodIncome?.toFixed(2) || '0.00'}
- Total de saídas: R$ ${periodExpense?.toFixed(2) || '0.00'}
- Saldo do período: R$ ${periodBalance?.toFixed(2) || '0.00'}
- Quantidade de transações: ${transactionCount || 0}

${transactions && transactions.length > 0 ? `ÚLTIMAS TRANSAÇÕES:
${transactions.slice(0, 10).map((t: any) => 
  `- ${t.type === 'income' ? '+ ' : '- '}R$ ${Math.abs(t.amount).toFixed(2)} | ${t.description} | ${t.category || 'Sem categoria'}`
).join('\n')}` : 'Sem transações no período.'}

Responda com um JSON no formato:
{
  "summary": "Resumo da situação financeira da conta (2-3 frases)",
  "insights": ["insight 1", "insight 2"],
  "alerts": ["alerta se houver problema"],
  "suggestions": ["sugestão curta 1", "sugestão curta 2"]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Gateway error:', response.status, errorText);
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

      const content = aiResponse.choices?.[0]?.message?.content || '';
      
      // Try to parse JSON from the response
      let result;
      try {
        // Extract JSON from the response (it might be wrapped in markdown)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { summary: content, insights: [], alerts: [], suggestions: [] };
        }
      } catch (e) {
        console.log('Failed to parse JSON, using content as summary');
        result = { summary: content, insights: [], alerts: [], suggestions: [] };
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original transaction observation logic
    if (!transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const txn = transaction as TransactionData;
    const impact = impactContext as ImpactContext | null;

    // Build context for the AI
    const today = new Date().toISOString().split('T')[0];
    
    const systemPrompt = `Você é um assistente financeiro pessoal que gera observações inteligentes para transações financeiras.

Sua tarefa é criar uma observação CURTA e ÚTIL que será salva junto com a transação para criar uma memória financeira explicável.

REGRAS:
1. Seja CONCISO - máximo 2 frases
2. Seja INFORMATIVO - mencione pontos relevantes sobre o contexto financeiro
3. Seja ÚTIL - dê insights que ajudem o usuário a entender o impacto
4. NÃO seja genérico - personalize baseado nos dados
5. Use linguagem natural e amigável
6. Inclua emojis apenas se apropriado (máximo 1)

TIPOS DE OBSERVAÇÕES:
- Para DESPESAS: mencione impacto no saldo, orçamento, ou padrão de gastos
- Para RECEITAS: destaque o benefício, como melhora do saldo
- Para TRANSFERÊNCIAS: note o propósito ou organização financeira
- Se houver ALERTAS: mencione brevemente o ponto de atenção
- Se estiver DENTRO DO ORÇAMENTO: faça um comentário positivo

EXEMPLOS:
- "Lançamento dentro do orçamento de Alimentação (75% usado). Saldo permanece positivo."
- "⚠️ Orçamento de Lazer ultrapassado em 15%. Considere revisar gastos do mês."
- "Ótimo! Esta receita aumentou seu saldo em R$ 500, melhorando sua margem."
- "Transferência para reserva de emergência. Continue assim!"`;

    const userPrompt = `Gere uma observação para esta transação:

TRANSAÇÃO:
- Tipo: ${txn.type === 'income' ? 'Receita' : txn.type === 'expense' ? 'Despesa' : 'Transferência'}
- Valor: R$ ${txn.amount.toFixed(2)}
- Descrição: ${txn.description}
- Data: ${txn.date}
${txn.category_name ? `- Categoria: ${txn.category_name}` : ''}
${txn.account_name ? `- Conta: ${txn.account_name}` : ''}
${txn.credit_card_name ? `- Cartão: ${txn.credit_card_name}` : ''}

${impact ? `CONTEXTO DE IMPACTO:
- Nível de risco: ${impact.riskLevel}
- Saldo anterior: R$ ${impact.currentBalance.toFixed(2)}
- Novo saldo: R$ ${impact.newBalance.toFixed(2)}
${impact.budgetImpact ? `- Orçamento ${impact.budgetImpact.category_name}: ${impact.budgetImpact.percent_used.toFixed(0)}% usado${impact.budgetImpact.over_budget ? ' (ESTOURADO)' : ''}` : ''}
${impact.warnings.length > 0 ? `- Alertas: ${impact.warnings.join('; ')}` : '- Sem alertas'}` : 'Contexto de impacto não disponível.'}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_observation',
              description: 'Gera uma observação inteligente para a transação',
              parameters: {
                type: 'object',
                properties: {
                  observation: {
                    type: 'string',
                    description: 'Observação curta e contextualizada (máximo 2 frases)'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags relevantes como: orcamento_ok, orcamento_estourado, saldo_baixo, saldo_positivo, meta_atingida, padrao_detectado'
                  },
                  pattern_detected: {
                    type: 'string',
                    nullable: true,
                    description: 'Padrão detectado se aplicável (ex: "gasto_recorrente", "aumento_categoria")'
                  }
                },
                required: ['observation', 'tags'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_observation' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Taxa limite excedida. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_observation') {
      // Fallback observation
      const fallbackObservation: ObservationResult = {
        observation: `${txn.type === 'income' ? 'Receita' : txn.type === 'expense' ? 'Despesa' : 'Transferência'} de R$ ${txn.amount.toFixed(2)} registrada.`,
        tags: [txn.type],
        pattern_detected: null,
      };
      
      return new Response(
        JSON.stringify({ success: true, result: fallbackObservation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ObservationResult = JSON.parse(toolCall.function.arguments);

    console.log('Observation generated:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-observation-generator:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao gerar observação' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
