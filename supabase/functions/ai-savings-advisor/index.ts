import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  is_completed: boolean;
  created_at: string;
}

interface UserFinances {
  monthlyRecurringIncome: number;
  monthlyFixedExpenses: number;
  availableForSavings: number;
  otherGoalsCommitment: number;
}

interface Patterns {
  averageContribution: number;
  contributionCount: number;
  monthsSinceCreation: number;
}

interface RequestBody {
  goal: SavingsGoal;
  event: 'contribution' | 'withdrawal' | 'creation' | 'status';
  amount?: number;
  userFinances: UserFinances;
  patterns: Patterns;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

function calculateProjection(goal: SavingsGoal, userFinances: UserFinances, patterns: Patterns) {
  const remaining = goal.target_amount - goal.current_amount;
  const percentage = (goal.current_amount / goal.target_amount) * 100;
  
  // Calculate months remaining if deadline exists
  let monthsToDeadline: number | null = null;
  if (goal.deadline) {
    const deadlineDate = new Date(goal.deadline);
    const now = new Date();
    monthsToDeadline = Math.max(0, 
      (deadlineDate.getFullYear() - now.getFullYear()) * 12 + 
      (deadlineDate.getMonth() - now.getMonth())
    );
  }
  
  // Calculate suggested monthly based on deadline or available funds
  let suggestedMonthly: number;
  if (monthsToDeadline && monthsToDeadline > 0) {
    suggestedMonthly = remaining / monthsToDeadline;
  } else {
    // Suggest 30% of available savings if no deadline
    suggestedMonthly = userFinances.availableForSavings * 0.3;
  }
  
  // Estimate months to goal based on average contribution or suggested
  const contributionRate = patterns.averageContribution > 0 
    ? patterns.averageContribution 
    : suggestedMonthly;
  
  const monthsToGoal = contributionRate > 0 
    ? Math.ceil(remaining / contributionRate) 
    : 999;
  
  // Check if on track
  const onTrack = !monthsToDeadline || monthsToGoal <= monthsToDeadline;
  
  return {
    remaining,
    percentage,
    monthsToDeadline,
    suggestedMonthly,
    monthsToGoal,
    onTrack,
    contributionRate,
  };
}

function buildPrompt(body: RequestBody, projection: ReturnType<typeof calculateProjection>): string {
  const { goal, event, amount, userFinances, patterns } = body;
  
  const baseContext = `
Você é Neura, a consultora financeira pessoal do usuário, amigável e motivadora. Analise a situação do cofrinho e forneça feedback personalizado.

DADOS DO COFRINHO:
- Nome: ${goal.name}
- Meta: ${formatCurrency(goal.target_amount)}
- Guardado: ${formatCurrency(goal.current_amount)} (${projection.percentage.toFixed(1)}%)
- Falta: ${formatCurrency(projection.remaining)}
${goal.deadline ? `- Prazo: ${new Date(goal.deadline).toLocaleDateString('pt-BR')} (${projection.monthsToDeadline} meses restantes)` : '- Sem prazo definido'}

FINANÇAS DO USUÁRIO:
- Receita recorrente mensal: ${formatCurrency(userFinances.monthlyRecurringIncome)}
- Despesas fixas mensais: ${formatCurrency(userFinances.monthlyFixedExpenses)}
- Margem disponível para poupar: ${formatCurrency(userFinances.availableForSavings)}

HISTÓRICO DE CONTRIBUIÇÕES:
- Total de contribuições: ${patterns.contributionCount}
- Média por contribuição: ${formatCurrency(patterns.averageContribution)}
- Meses desde criação: ${patterns.monthsSinceCreation}

PROJEÇÕES:
- Valor sugerido mensal: ${formatCurrency(projection.suggestedMonthly)}
- Meses estimados para meta: ${projection.monthsToGoal}
- ${projection.onTrack ? 'Está no caminho certo!' : 'Precisa aumentar contribuições para atingir no prazo'}
`;

  let eventContext = '';
  
  switch (event) {
    case 'contribution':
      eventContext = `
EVENTO: O usuário acabou de fazer uma CONTRIBUIÇÃO de ${formatCurrency(amount || 0)}.
- Parabenize o progresso
- Mostre o impacto desta contribuição na projeção
- Dê dicas para manter a consistência
`;
      break;
    case 'withdrawal':
      eventContext = `
EVENTO: O usuário fez uma RETIRADA de ${formatCurrency(amount || 0)}.
- Seja compreensivo (pode ter sido necessário)
- Mostre o impacto na projeção de forma gentil
- Sugira como recuperar o progresso
`;
      break;
    case 'creation':
      eventContext = `
EVENTO: O usuário acabou de CRIAR este cofrinho.
- Parabenize pela iniciativa
- Analise se a meta é realista baseada nas finanças
- Sugira um plano de contribuições
`;
      break;
    case 'status':
      eventContext = `
EVENTO: O usuário quer ver a SITUAÇÃO atual do cofrinho.
- Faça um resumo do progresso
- Dê feedback sobre o ritmo de contribuições
- Sugira próximos passos
`;
      break;
  }

  const milestoneCheck = `
VERIFICAR MARCOS:
${projection.percentage >= 100 ? '- META ATINGIDA! Celebrar com entusiasmo!' : ''}
${projection.percentage >= 75 && projection.percentage < 100 ? '- 75% completo - Reta final!' : ''}
${projection.percentage >= 50 && projection.percentage < 75 ? '- Passou da metade!' : ''}
${projection.percentage >= 25 && projection.percentage < 50 ? '- 25% já guardado!' : ''}
`;

  return `${baseContext}\n${eventContext}\n${milestoneCheck}

INSTRUÇÕES:
1. Responda APENAS em JSON válido com esta estrutura exata:
{
  "message": "mensagem principal (2-4 frases, motivadora e personalizada)",
  "projection": {
    "monthsToGoal": número,
    "suggestedMonthly": número,
    "onTrack": boolean
  },
  "tips": ["dica1", "dica2"] (2-3 dicas práticas e específicas),
  "celebration": "string ou null" (mensagem de celebração se atingiu marco),
  "alertLevel": "success" | "warning" | "info"
}

2. Use português brasileiro natural e amigável
3. Seja específico com números e datas
4. Se a margem for pequena, seja realista mas encorajador
5. NUNCA inclua texto fora do JSON`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as RequestBody;
    
    console.log('AI Savings Advisor request:', {
      goalName: body.goal.name,
      event: body.event,
      amount: body.amount,
    });

    const projection = calculateProjection(body.goal, body.userFinances, body.patterns);
    const prompt = buildPrompt(body, projection);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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
            content: 'Você é Neura, a consultora financeira pessoal do usuário, especializada em ajudar pessoas a atingirem suas metas de poupança. Responda APENAS em JSON válido, sem markdown, sem texto adicional.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    console.log('AI raw response:', aiContent);

    // Parse JSON response
    let parsedResponse;
    try {
      // Clean up potential markdown code blocks
      const cleanContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return a fallback response
      parsedResponse = {
        message: `Ótimo progresso com "${body.goal.name}"! Você já guardou ${formatCurrency(body.goal.current_amount)} de ${formatCurrency(body.goal.target_amount)}. Continue assim!`,
        projection: {
          monthsToGoal: projection.monthsToGoal,
          suggestedMonthly: projection.suggestedMonthly,
          onTrack: projection.onTrack,
        },
        tips: [
          'Configure contribuições automáticas para não esquecer',
          'Revise suas despesas variáveis para encontrar oportunidades de economia',
        ],
        celebration: projection.percentage >= 100 ? '🎉 Parabéns! Meta atingida!' : null,
        alertLevel: projection.onTrack ? 'success' : 'warning',
      };
    }

    console.log('AI Savings Advisor response:', parsedResponse);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Savings Advisor error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Não foi possível analisar sua meta no momento. Tente novamente.',
        tips: [],
        alertLevel: 'info',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
