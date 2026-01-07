import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassificationResult {
  type: 'income' | 'expense' | 'transfer';
  amount: number | null;
  date: string | null;
  description: string;
  category_id: string | null;
  category_name: string | null;
  account_id: string | null;
  account_name: string | null;
  credit_card_id: string | null;
  credit_card_name: string | null;
  destination_account_id: string | null;
  destination_account_name: string | null;
  savings_goal_id: string | null;
  savings_goal_name: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  is_installment: boolean;
  total_installments: number | null;
  confidence: number;
  parsed_text: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, categories, accounts, creditCards, savingsGoals } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text input is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context for the AI
    const categoryList = categories?.map((c: any) => `- ${c.name} (${c.type}, id: ${c.id})`).join('\n') || 'Nenhuma categoria cadastrada';
    const accountList = accounts?.map((a: any) => `- ${a.name} (${a.type}, id: ${a.id})`).join('\n') || 'Nenhuma conta cadastrada';
    const creditCardList = creditCards?.map((cc: any) => `- ${cc.name} (id: ${cc.id})`).join('\n') || 'Nenhum cartão cadastrado';
    const savingsGoalList = savingsGoals?.map((sg: any) => `- ${sg.name} (id: ${sg.id})`).join('\n') || 'Nenhum cofrinho cadastrado';

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `Você é um classificador financeiro inteligente para um app de finanças pessoais brasileiro.

Sua tarefa é interpretar texto livre do usuário e extrair informações estruturadas de transações financeiras.

Data de hoje: ${today}

CATEGORIAS DISPONÍVEIS:
${categoryList}

CONTAS DISPONÍVEIS:
${accountList}

CARTÕES DE CRÉDITO DISPONÍVEIS:
${creditCardList}

COFRINHOS/METAS DE POUPANÇA DISPONÍVEIS:
${savingsGoalList}

REGRAS DE INTERPRETAÇÃO:

1. TIPO DE TRANSAÇÃO:
   - "gastei", "paguei", "comprei", "despesa" → expense
   - "recebi", "ganhei", "entrou", "salário", "receita" → income  
   - "transferi", "passei", "mandei para" → transfer
   
   PALAVRAS-CHAVE PARA COFRINHO (SEMPRE use type: "transfer"):
   - "guardar", "guardei", "economizar", "economizei" → transfer para cofrinho
   - "reservar", "reservei", "separar", "separei" → transfer para cofrinho
   - "poupar", "poupei", "juntar", "juntei" → transfer para cofrinho
   - "colocar no cofrinho", "depositar no cofrinho" → transfer para cofrinho
   - "para emergência", "reserva de emergência" → transfer para cofrinho
   - "para viagem", "fundo de viagem" → transfer para cofrinho (buscar cofrinho com nome similar)
   - "para [objetivo]" quando objetivo parece meta financeira → transfer para cofrinho

2. VALOR:
   - Extraia números do texto
   - "mil" = 1000, "cem" = 100
   - Se não houver valor, retorne null

3. DATA:
   - "hoje" = data atual
   - "ontem" = data atual - 1 dia
   - "semana passada" = data atual - 7 dias
   - Datas específicas como "dia 15", "15/01"
   - Se não especificado, use data atual

4. RECORRÊNCIA:
   - "todo mês", "mensal", "mensalmente" → monthly
   - "toda semana", "semanal" → weekly
   - "todo dia", "diário" → daily
   - "todo ano", "anual" → yearly

5. PARCELAMENTO:
   - "em Xx", "X parcelas", "parcelado em X" → is_installment: true
   - Extraia número de parcelas

6. CONTA/CARTÃO:
   - "no débito", "conta corrente" → procure conta correspondente
   - "no cartão", "no crédito", nome do cartão → procure cartão correspondente
   - "pix", "transferência" → procure conta

7. CATEGORIA:
   - Identifique pela descrição (mercado → Supermercado, restaurante → Restaurantes, etc.)
   - Use as categorias disponíveis

8. TRANSFERÊNCIA:
   - Identifique conta origem e destino
   - "de X para Y", "transferi da conta X para Y"

9. COFRINHO/META DE POUPANÇA (MUITO IMPORTANTE):
   - Quando o usuário mencionar intenção de guardar/economizar/reservar, SEMPRE defina type como "transfer"
   - Se mencionar um nome específico de cofrinho existente, use o ID correto da lista acima
   - Se mencionar um nome que NÃO existe nos cofrinhos disponíveis:
     * Preencha savings_goal_name com o nome mencionado (ex: "Viagem", "Emergência", "Reserva")
     * O usuário poderá criar o cofrinho no fluxo de confirmação
   - Se não mencionar nenhum nome específico, use savings_goal_name: "Poupança"
   - A conta origem (account_id) será de onde sai o dinheiro
   - Exemplos:
     * "guardei 200 reais para viagem" → type: "transfer", savings_goal_name: "Viagem"
     * "economizei 500 hoje" → type: "transfer", savings_goal_name: "Poupança"
     * "coloquei 100 no cofrinho de emergência" → type: "transfer", savings_goal_name: "Emergência"
     * "reservei 300 para festas" → type: "transfer", savings_goal_name: "Festas"

Analise com cuidado e retorne uma estrutura JSON precisa.`;

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
          { role: 'user', content: `Classifique esta transação: "${text}"` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_transaction',
              description: 'Classifica uma transação financeira a partir de texto livre',
              parameters: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['income', 'expense', 'transfer'],
                    description: 'Tipo da transação'
                  },
                  amount: {
                    type: 'number',
                    nullable: true,
                    description: 'Valor da transação em reais'
                  },
                  date: {
                    type: 'string',
                    nullable: true,
                    description: 'Data no formato YYYY-MM-DD'
                  },
                  description: {
                    type: 'string',
                    description: 'Descrição curta e clara da transação'
                  },
                  category_id: {
                    type: 'string',
                    nullable: true,
                    description: 'ID da categoria sugerida'
                  },
                  category_name: {
                    type: 'string',
                    nullable: true,
                    description: 'Nome da categoria sugerida'
                  },
                  account_id: {
                    type: 'string',
                    nullable: true,
                    description: 'ID da conta origem'
                  },
                  account_name: {
                    type: 'string',
                    nullable: true,
                    description: 'Nome da conta origem'
                  },
                  credit_card_id: {
                    type: 'string',
                    nullable: true,
                    description: 'ID do cartão de crédito'
                  },
                  credit_card_name: {
                    type: 'string',
                    nullable: true,
                    description: 'Nome do cartão de crédito'
                  },
                  destination_account_id: {
                    type: 'string',
                    nullable: true,
                    description: 'ID da conta destino (para transferências)'
                  },
                  destination_account_name: {
                    type: 'string',
                    nullable: true,
                    description: 'Nome da conta destino'
                  },
                  savings_goal_id: {
                    type: 'string',
                    nullable: true,
                    description: 'ID do cofrinho/meta de poupança (quando transferir para cofrinho)'
                  },
                  savings_goal_name: {
                    type: 'string',
                    nullable: true,
                    description: 'Nome do cofrinho/meta de poupança'
                  },
                  is_recurring: {
                    type: 'boolean',
                    description: 'Se é uma transação recorrente'
                  },
                  recurrence_frequency: {
                    type: 'string',
                    nullable: true,
                    enum: ['daily', 'weekly', 'monthly', 'yearly'],
                    description: 'Frequência da recorrência'
                  },
                  is_installment: {
                    type: 'boolean',
                    description: 'Se é uma compra parcelada'
                  },
                  total_installments: {
                    type: 'number',
                    nullable: true,
                    description: 'Número total de parcelas'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Nível de confiança da classificação (0-1)'
                  },
                  parsed_text: {
                    type: 'string',
                    description: 'Resumo do que foi entendido do texto'
                  }
                },
                required: ['type', 'description', 'is_recurring', 'is_installment', 'confidence', 'parsed_text'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_transaction' } }
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
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'classify_transaction') {
      throw new Error('Invalid AI response format');
    }

    const classification: ClassificationResult = JSON.parse(toolCall.function.arguments);

    // Set default date if not provided
    if (!classification.date) {
      classification.date = today;
    }

    console.log('Classification result:', JSON.stringify(classification, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        classification 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-transaction-classifier:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao classificar transação' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
