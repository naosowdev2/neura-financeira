import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============= SYNONYM DICTIONARY FOR SMART SEARCH =============
const synonymDictionary: { [key: string]: string[] } = {
  // Bebidas
  'bebida': ['cerveja', 'cervejas', 'vinho', 'vodka', 'whisky', 'whiskey', 'refrigerante', 'refri', 'suco', 'água', 'agua', 'energético', 'energetico', 'drink', 'drinks', 'chopp', 'chope', 'bar', 'bebidas'],
  'bebidas': ['cerveja', 'cervejas', 'vinho', 'vodka', 'whisky', 'whiskey', 'refrigerante', 'refri', 'suco', 'água', 'agua', 'energético', 'energetico', 'drink', 'drinks', 'chopp', 'chope', 'bar', 'bebida'],
  
  // Comida
  'comida': ['restaurante', 'lanche', 'almoço', 'almoco', 'jantar', 'refeição', 'refeicao', 'delivery', 'ifood', 'rappi', 'uber eats', 'pizza', 'hamburguer', 'sushi', 'padaria', 'café', 'cafe'],
  'restaurante': ['comida', 'lanche', 'almoço', 'almoco', 'jantar', 'refeição', 'refeicao'],
  
  // Transporte
  'transporte': ['uber', 'táxi', 'taxi', '99', 'ônibus', 'onibus', 'metrô', 'metro', 'combustível', 'combustivel', 'gasolina', 'etanol', 'estacionamento'],
  'uber': ['táxi', 'taxi', '99', 'transporte', 'corrida'],
  
  // Saúde
  'saude': ['farmácia', 'farmacia', 'remédio', 'remedio', 'medicamento', 'médico', 'medico', 'hospital', 'exame', 'consulta', 'drogaria'],
  'farmácia': ['farmacia', 'remédio', 'remedio', 'medicamento', 'drogaria', 'saúde', 'saude'],
  'farmacia': ['farmácia', 'remédio', 'remedio', 'medicamento', 'drogaria', 'saúde', 'saude'],
  
  // Compras
  'mercado': ['supermercado', 'feira', 'hortifruti', 'açougue', 'acougue', 'mercearia', 'atacadão', 'atacadao'],
  'supermercado': ['mercado', 'feira', 'hortifruti', 'açougue', 'acougue', 'mercearia'],
  
  // Lazer/Entretenimento
  'lazer': ['cinema', 'teatro', 'show', 'festa', 'bar', 'balada', 'netflix', 'spotify', 'streaming', 'jogo', 'game'],
  'streaming': ['netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'youtube', 'globoplay'],
  
  // Vestuário
  'roupa': ['roupas', 'vestuário', 'vestuario', 'calçado', 'calcado', 'tênis', 'tenis', 'sapato', 'camisa', 'calça', 'calca', 'loja'],
  'roupas': ['roupa', 'vestuário', 'vestuario', 'calçado', 'calcado', 'tênis', 'tenis', 'sapato', 'camisa', 'calça', 'calca', 'loja'],
};

// Function to normalize text (remove accents, lowercase)
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special chars with space
    .trim();
}

// Function to get expanded search terms
function getExpandedTerms(keyword: string): string[] {
  const normalized = normalizeText(keyword);
  const terms = new Set<string>([keyword.toLowerCase(), normalized]);
  
  // Check direct synonyms
  if (synonymDictionary[normalized]) {
    synonymDictionary[normalized].forEach(syn => terms.add(syn));
  }
  
  // Check if keyword is in any synonym list
  for (const [key, synonyms] of Object.entries(synonymDictionary)) {
    if (synonyms.some(s => normalizeText(s) === normalized)) {
      terms.add(key);
      synonyms.forEach(syn => terms.add(syn));
    }
  }
  
  return Array.from(terms);
}

// Define financial tools for the assistant
const financialTools = [
  {
    type: "function",
    function: {
      name: "ask_clarification",
      description: "Faz uma pergunta de esclarecimento ao usuário quando precisa de mais contexto para uma análise precisa. Use quando a pergunta for ambígua, quando precisar de informações adicionais, ou quando houver múltiplas interpretações possíveis.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "A pergunta a ser feita ao usuário"
          },
          context: {
            type: "string",
            description: "Breve explicação de por que a pergunta é necessária"
          },
          suggestedOptions: {
            type: "array",
            items: { type: "string" },
            description: "Opções sugeridas de resposta (opcional, máximo 4)"
          }
        },
        required: ["question", "context"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_complete_financial_picture",
      description: "Retorna o panorama financeiro COMPLETO e integrado: todas as contas com saldos, todos os cofrinhos (savings goals), cartões de crédito, despesas pendentes, recorrências ativas, parcelamentos e projeções. USE ESTA FERRAMENTA SEMPRE que precisar de uma visão geral das finanças.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pending_obligations",
      description: "Lista TODAS as obrigações financeiras pendentes: despesas não pagas, faturas de cartão a vencer, próximas parcelas de parcelamentos e recorrências previstas. Ideal para entender compromissos futuros.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Número de dias para frente (padrão 30)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_spending_capacity",
      description: "Calcula quanto o usuário pode gastar hoje ou em um período, considerando saldo atual, despesas futuras pendentes e metas de economia",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "week", "month"],
            description: "Período para calcular capacidade de gasto"
          }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_balance_coverage",
      description: "Verifica se o saldo atual cobre as despesas previstas para o restante do mês",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_expenses",
      description: "Retorna as maiores despesas do usuário por categoria ou valor",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["week", "month", "quarter", "year"],
            description: "Período para análise"
          },
          groupBy: {
            type: "string",
            enum: ["category", "individual"],
            description: "Agrupar por categoria ou mostrar transações individuais"
          },
          limit: {
            type: "number",
            description: "Número de resultados (padrão 5)"
          }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_budget_status",
      description: "Retorna o status atual dos orçamentos do usuário",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Retorna um resumo financeiro completo do mês atual incluindo patrimônio líquido (contas + cofrinhos)",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_savings_progress",
      description: "Retorna o progresso das metas de economia (cofrinhos) do usuário, incluindo valores atuais e quanto falta",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_expenses",
      description: "Retorna as próximas despesas previstas (recorrentes e faturas)",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Número de dias para frente (padrão 30)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_category_spending",
      description: "Soma os gastos de uma CATEGORIA específica do usuário. USE ESTA FERRAMENTA quando o usuário perguntar sobre gastos 'em [categoria]' ou 'na categoria [X]' (ex: 'quanto gastei em Mercado?', 'gastos em Alimentação', 'em farmácia esse mês'). Esta busca encontra a categoria pelo nome e soma todas as transações vinculadas a ela e suas subcategorias. É mais precisa que search_transactions para categorias cadastradas.",
      parameters: {
        type: "object",
        properties: {
          categoryName: {
            type: "string",
            description: "Nome da categoria a buscar (ex: 'Mercado', 'Alimentação', 'Transporte', 'Farmácia')"
          },
          period: {
            type: "string",
            enum: ["week", "month", "quarter", "year", "all"],
            description: "Período da busca (padrão: month). 'month'=mês INTEIRO (início ao fim do mês)"
          },
          includeSubcategories: {
            type: "boolean",
            description: "Se deve incluir subcategorias na soma (padrão: true)"
          },
          status: {
            type: "string",
            enum: ["confirmed", "pending", "all"],
            description: "Status das transações (padrão: all - confirmadas + pendentes)"
          }
        },
        required: ["categoryName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_transactions",
      description: "Busca transações por palavras-chave na descrição, observações e notas de IA. USE ESTA FERRAMENTA quando o usuário perguntar sobre gastos com TERMOS ESPECÍFICOS que podem não ser uma categoria cadastrada (ex: 'uber', 'iFood', 'Netflix', 'café', 'bebidas', 'cervejas'). Usa busca inteligente com sinônimos (ex: 'bebidas' encontra 'cervejas', 'vinho', etc.).",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "Palavra-chave para buscar (ex: 'bebidas', 'uber', 'café', 'iFood')"
          },
          period: {
            type: "string",
            enum: ["week", "month", "quarter", "year", "all"],
            description: "Período da busca (padrão: month). 'month'=mês INTEIRO (início ao fim do mês)"
          },
          type: {
            type: "string",
            enum: ["expense", "income", "all"],
            description: "Tipo de transação a buscar (padrão: expense)"
          },
          status: {
            type: "string",
            enum: ["confirmed", "pending", "all"],
            description: "Status da transação (padrão: all - busca confirmadas e pendentes)"
          },
          categoryName: {
            type: "string",
            description: "Nome da categoria para filtrar adicionalmente (opcional)"
          }
        },
        required: ["keyword"]
      }
    }
  }
];

// ============= TOOL EXECUTION FUNCTIONS =============

async function executeGetCompleteFinancialPicture(supabase: any, userId: string) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  // 1. Get ALL accounts with individual balances
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, color, icon, initial_balance, include_in_total, is_archived')
    .eq('user_id', userId)
    .eq('is_archived', false);

  const accountsWithBalances = [];
  let totalAccountsBalance = 0;
  let totalIncludedBalance = 0;

  for (const account of accounts || []) {
    const { data: balanceData } = await supabase.rpc('calculate_account_balance', {
      p_account_id: account.id,
      p_include_pending: false
    });
    const balance = balanceData || 0;
    accountsWithBalances.push({
      id: account.id,
      name: account.name,
      type: account.type,
      balance,
      includeInTotal: account.include_in_total
    });
    totalAccountsBalance += balance;
    if (account.include_in_total) {
      totalIncludedBalance += balance;
    }
  }

  // 2. Get ALL savings goals (cofrinhos) - CRITICAL: must be included in net worth
  const { data: savingsGoals } = await supabase
    .from('savings_goals')
    .select('id, name, target_amount, current_amount, deadline, is_completed, description')
    .eq('user_id', userId)
    .eq('is_completed', false);

  const totalInSavings = savingsGoals?.reduce((sum: number, g: any) => sum + (g.current_amount || 0), 0) || 0;
  const savingsDetails = (savingsGoals || []).map((g: any) => ({
    name: g.name,
    currentAmount: g.current_amount,
    targetAmount: g.target_amount,
    progress: g.target_amount ? ((g.current_amount / g.target_amount) * 100).toFixed(1) : null,
    deadline: g.deadline,
    description: g.description
  }));

  // 3. PATRIMÔNIO LÍQUIDO = Saldo Contas + Cofrinhos
  const netWorth = totalIncludedBalance + totalInSavings;

  // 4. Get credit cards with current usage
  const { data: creditCards } = await supabase
    .from('credit_cards')
    .select('id, name, credit_limit, closing_day, due_day, is_archived')
    .eq('user_id', userId)
    .eq('is_archived', false);

  const { data: openInvoices } = await supabase
    .from('credit_card_invoices')
    .select('id, credit_card_id, total_amount, due_date, status, reference_month')
    .eq('user_id', userId)
    .eq('status', 'open');

  const totalCreditLimit = creditCards?.reduce((sum: number, c: any) => sum + (c.credit_limit || 0), 0) || 0;
  const totalCreditUsed = openInvoices?.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0) || 0;

  const creditCardsDetails = (creditCards || []).map((card: any) => {
    const cardInvoices = openInvoices?.filter((i: any) => i.credit_card_id === card.id) || [];
    const cardUsed = cardInvoices.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
    return {
      name: card.name,
      limit: card.credit_limit,
      used: cardUsed,
      available: card.credit_limit - cardUsed,
      closingDay: card.closing_day,
      dueDay: card.due_day,
      nextInvoice: cardInvoices[0] ? {
        amount: cardInvoices[0].total_amount,
        dueDate: cardInvoices[0].due_date
      } : null
    };
  });

  // 5. Get month income and expenses (confirmed) - USE FULL MONTH
  const { data: monthIncome } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .eq('status', 'confirmed')
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0]);

  const { data: monthExpensesConfirmed } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'confirmed')
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0]);

  const totalMonthIncome = monthIncome?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const totalMonthExpensesConfirmed = monthExpensesConfirmed?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  // 6. Get PENDING expenses (within the month)
  const { data: pendingExpenses } = await supabase
    .from('transactions')
    .select('id, amount, description, date, categories(name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'pending')
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0])
    .order('date');

  const totalPendingExpenses = pendingExpenses?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const pendingExpensesList = (pendingExpenses || []).map((t: any) => ({
    description: t.description,
    amount: t.amount,
    date: t.date,
    category: t.categories?.name || 'Sem categoria'
  }));

  // 7. Get active recurrences
  const { data: recurrences } = await supabase
    .from('recurrences')
    .select('id, description, amount, frequency, type, next_occurrence')
    .eq('user_id', userId)
    .eq('is_active', true);

  const activeRecurrences = (recurrences || []).map((r: any) => ({
    description: r.description,
    amount: r.amount,
    frequency: r.frequency,
    type: r.type,
    nextOccurrence: r.next_occurrence
  }));

  const monthlyRecurringExpenses = (recurrences || [])
    .filter((r: any) => r.type === 'expense')
    .reduce((sum: number, r: any) => {
      const multiplier = r.frequency === 'weekly' ? 4 : r.frequency === 'biweekly' ? 2 : 1;
      return sum + (r.amount * multiplier);
    }, 0);

  // 8. Get active installments
  const { data: installmentGroups } = await supabase
    .from('installment_groups')
    .select('id, description, total_amount, installment_amount, total_installments, first_installment_date')
    .eq('user_id', userId);

  // Count remaining installments
  const installmentsWithRemaining = [];
  for (const group of installmentGroups || []) {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('installment_group_id', group.id)
      .eq('status', 'confirmed');
    
    const paid = count || 0;
    const remaining = group.total_installments - paid;
    if (remaining > 0) {
      installmentsWithRemaining.push({
        description: group.description,
        installmentAmount: group.installment_amount,
        totalInstallments: group.total_installments,
        paidInstallments: paid,
        remainingInstallments: remaining,
        remainingTotal: group.installment_amount * remaining
      });
    }
  }

  const totalRemainingInstallments = installmentsWithRemaining.reduce((sum, i) => sum + i.remainingTotal, 0);

  // 9. Calculate projections
  const monthBalance = totalMonthIncome - totalMonthExpensesConfirmed;
  const projectedMonthBalance = totalMonthIncome - totalMonthExpensesConfirmed - totalPendingExpenses;
  
  // Calculate financial runway (months of expenses covered by net worth)
  const averageMonthlyExpenses = totalMonthExpensesConfirmed > 0 ? totalMonthExpensesConfirmed : (monthlyRecurringExpenses || 1);
  const monthsOfRunway = netWorth / averageMonthlyExpenses;

  // Real available balance = net worth - pending expenses - upcoming invoices
  const realAvailableBalance = netWorth - totalPendingExpenses - totalCreditUsed;

  // Financial health assessment
  let financialHealth: 'excellent' | 'healthy' | 'moderate' | 'attention' | 'critical';
  let healthAnalysis: string;

  if (monthsOfRunway >= 6) {
    financialHealth = 'excellent';
    healthAnalysis = `Situação excelente! Seu patrimônio líquido de R$ ${netWorth.toFixed(2)} cobre ${monthsOfRunway.toFixed(1)} meses de despesas. Você tem uma reserva financeira muito sólida.`;
  } else if (monthsOfRunway >= 3) {
    financialHealth = 'healthy';
    healthAnalysis = `Situação saudável. Seu patrimônio cobre ${monthsOfRunway.toFixed(1)} meses de despesas. Recomendo continuar economizando para atingir 6 meses de reserva.`;
  } else if (monthsOfRunway >= 1) {
    financialHealth = 'moderate';
    healthAnalysis = `Situação moderada. Seu patrimônio cobre ${monthsOfRunway.toFixed(1)} mês(es) de despesas. É importante aumentar sua reserva de emergência.`;
  } else if (netWorth > 0) {
    financialHealth = 'attention';
    healthAnalysis = `Atenção! Seu patrimônio cobre menos de 1 mês de despesas. Priorize construir uma reserva de emergência.`;
  } else {
    financialHealth = 'critical';
    healthAnalysis = `Situação crítica! Patrimônio negativo ou zerado. É urgente revisar gastos e buscar aumentar receitas.`;
  }

  return {
    // PATRIMÔNIO LÍQUIDO (mais importante)
    netWorth: {
      total: netWorth,
      breakdown: {
        accountsBalance: totalIncludedBalance,
        savingsGoalsBalance: totalInSavings
      },
      monthsOfRunway: monthsOfRunway === Infinity ? 'infinito' : monthsOfRunway.toFixed(1)
    },

    // CONTAS DETALHADAS
    accounts: {
      count: accountsWithBalances.length,
      totalBalance: totalAccountsBalance,
      details: accountsWithBalances
    },

    // COFRINHOS (reservas de emergência)
    savingsGoals: {
      count: savingsDetails.length,
      totalSaved: totalInSavings,
      details: savingsDetails,
      note: "Cofrinhos são parte do patrimônio e podem ser usados em emergências"
    },

    // MOVIMENTO DO MÊS
    monthSummary: {
      income: totalMonthIncome,
      expensesConfirmed: totalMonthExpensesConfirmed,
      expensesPending: totalPendingExpenses,
      balance: monthBalance,
      projectedBalance: projectedMonthBalance
    },

    // DESPESAS PENDENTES
    pendingObligations: {
      expenses: pendingExpensesList,
      total: totalPendingExpenses,
      count: pendingExpensesList.length
    },

    // CARTÕES DE CRÉDITO
    creditCards: {
      count: creditCardsDetails.length,
      totalLimit: totalCreditLimit,
      totalUsed: totalCreditUsed,
      totalAvailable: totalCreditLimit - totalCreditUsed,
      utilizationPercent: totalCreditLimit > 0 ? ((totalCreditUsed / totalCreditLimit) * 100).toFixed(1) : 0,
      details: creditCardsDetails
    },

    // RECORRÊNCIAS
    recurrences: {
      count: activeRecurrences.length,
      monthlyTotal: monthlyRecurringExpenses,
      details: activeRecurrences
    },

    // PARCELAMENTOS
    installments: {
      count: installmentsWithRemaining.length,
      totalRemaining: totalRemainingInstallments,
      details: installmentsWithRemaining
    },

    // PROJEÇÃO
    projections: {
      realAvailableBalance,
      financialHealth,
      healthAnalysis
    }
  };
}

async function executeGetPendingObligations(supabase: any, userId: string, days: number = 30) {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  // 1. Get pending expenses
  const { data: pendingExpenses } = await supabase
    .from('transactions')
    .select('id, amount, description, date, categories(name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'pending')
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date');

  // 2. Get upcoming credit card invoices
  const { data: invoices } = await supabase
    .from('credit_card_invoices')
    .select('id, total_amount, due_date, credit_cards(name)')
    .eq('user_id', userId)
    .eq('status', 'open')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', endDate.toISOString().split('T')[0])
    .order('due_date');

  // 3. Get upcoming recurrences
  const { data: recurrences } = await supabase
    .from('recurrences')
    .select('id, description, amount, frequency, next_occurrence')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('type', 'expense')
    .gte('next_occurrence', today.toISOString().split('T')[0])
    .lte('next_occurrence', endDate.toISOString().split('T')[0]);

  // 4. Get pending installments
  const { data: pendingInstallments } = await supabase
    .from('transactions')
    .select('id, amount, description, date, installment_number, total_installments')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'pending')
    .not('installment_group_id', 'is', null)
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date');

  // Calculate totals
  const pendingTotal = pendingExpenses?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const invoicesTotal = invoices?.reduce((sum: number, i: any) => sum + i.total_amount, 0) || 0;
  const recurrencesTotal = recurrences?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
  const installmentsTotal = pendingInstallments?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  const grandTotal = pendingTotal + invoicesTotal + recurrencesTotal;

  return {
    days,
    pendingExpenses: {
      count: pendingExpenses?.length || 0,
      total: pendingTotal,
      items: (pendingExpenses || []).map((t: any) => ({
        description: t.description,
        amount: t.amount,
        date: t.date,
        category: t.categories?.name || 'Sem categoria'
      }))
    },
    creditCardInvoices: {
      count: invoices?.length || 0,
      total: invoicesTotal,
      items: (invoices || []).map((i: any) => ({
        card: i.credit_cards?.name,
        amount: i.total_amount,
        dueDate: i.due_date
      }))
    },
    recurrences: {
      count: recurrences?.length || 0,
      total: recurrencesTotal,
      items: (recurrences || []).map((r: any) => ({
        description: r.description,
        amount: r.amount,
        nextDate: r.next_occurrence,
        frequency: r.frequency
      }))
    },
    installments: {
      count: pendingInstallments?.length || 0,
      total: installmentsTotal,
      items: (pendingInstallments || []).map((t: any) => ({
        description: t.description,
        amount: t.amount,
        date: t.date,
        installmentInfo: `${t.installment_number}/${t.total_installments}`
      }))
    },
    grandTotal,
    summary: `Nos próximos ${days} dias você tem R$ ${grandTotal.toFixed(2)} em obrigações financeiras: R$ ${pendingTotal.toFixed(2)} em despesas pendentes, R$ ${invoicesTotal.toFixed(2)} em faturas e R$ ${recurrencesTotal.toFixed(2)} em recorrências.`
  };
}

async function executeGetSpendingCapacity(supabase: any, userId: string, period: string) {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  let endDate: Date;
  let daysInPeriod: number;
  
  if (period === 'today') {
    endDate = today;
    daysInPeriod = 1;
  } else if (period === 'week') {
    endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    daysInPeriod = 7;
  } else {
    endDate = endOfMonth;
    daysInPeriod = Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Get current balance (accounts)
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .eq('include_in_total', true);

  let totalBalance = 0;
  for (const account of accounts || []) {
    const { data: balanceData } = await supabase.rpc('calculate_account_balance', {
      p_account_id: account.id,
      p_include_pending: false
    });
    totalBalance += balanceData || 0;
  }

  // Get savings
  const { data: savingsGoals } = await supabase
    .from('savings_goals')
    .select('current_amount')
    .eq('user_id', userId)
    .eq('is_completed', false);

  const totalInSavings = savingsGoals?.reduce((sum: number, g: any) => sum + (g.current_amount || 0), 0) || 0;

  // Get pending expenses in period
  const { data: pendingExpenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'pending')
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  const pendingTotal = pendingExpenses?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  // Get upcoming invoices
  const { data: invoices } = await supabase
    .from('credit_card_invoices')
    .select('total_amount')
    .eq('user_id', userId)
    .eq('status', 'open')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', endDate.toISOString().split('T')[0]);

  const invoicesTotal = invoices?.reduce((sum: number, i: any) => sum + i.total_amount, 0) || 0;

  const totalObligations = pendingTotal + invoicesTotal;
  const availableFromAccounts = totalBalance - totalObligations;
  const totalAvailable = availableFromAccounts + totalInSavings;
  const dailyBudget = availableFromAccounts > 0 ? availableFromAccounts / daysInPeriod : 0;

  const periodLabels: { [key: string]: string } = {
    today: 'hoje',
    week: 'esta semana',
    month: 'este mês'
  };

  let advice: string;
  if (availableFromAccounts > 0) {
    advice = `Você pode gastar até R$ ${availableFromAccounts.toFixed(2)} ${periodLabels[period]} (R$ ${dailyBudget.toFixed(2)}/dia) sem tocar nos cofrinhos.`;
  } else if (totalAvailable > 0) {
    advice = `Saldo insuficiente nas contas. Precisaria usar R$ ${Math.abs(availableFromAccounts).toFixed(2)} dos cofrinhos para cobrir as obrigações.`;
  } else {
    advice = `Atenção! Obrigações excedem todo o patrimônio em R$ ${Math.abs(totalAvailable).toFixed(2)}.`;
  }

  return {
    period: periodLabels[period],
    daysInPeriod,
    accountsBalance: totalBalance,
    savingsBalance: totalInSavings,
    pendingExpenses: pendingTotal,
    upcomingInvoices: invoicesTotal,
    totalObligations,
    availableFromAccounts,
    totalAvailable,
    dailyBudget,
    advice
  };
}

async function executeCheckBalanceCoverage(supabase: any, userId: string) {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Get current balance
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .eq('include_in_total', true);

  let totalBalance = 0;
  for (const account of accounts || []) {
    const { data: balanceData } = await supabase.rpc('calculate_account_balance', {
      p_account_id: account.id,
      p_include_pending: false
    });
    totalBalance += balanceData || 0;
  }

  // Get savings as backup
  const { data: savingsGoals } = await supabase
    .from('savings_goals')
    .select('current_amount, name')
    .eq('user_id', userId)
    .eq('is_completed', false);

  const totalInSavings = savingsGoals?.reduce((sum: number, g: any) => sum + (g.current_amount || 0), 0) || 0;

  // Get expected expenses (pending + recurrences)
  const { data: pendingExpenses } = await supabase
    .from('transactions')
    .select('amount, description, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'pending')
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0]);

  const pendingTotal = pendingExpenses?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  // Get upcoming invoices
  const { data: invoices } = await supabase
    .from('credit_card_invoices')
    .select('total_amount, due_date, credit_cards(name)')
    .eq('user_id', userId)
    .eq('status', 'open')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', endOfMonth.toISOString().split('T')[0]);

  const invoicesTotal = invoices?.reduce((sum: number, i: any) => sum + i.total_amount, 0) || 0;

  const totalExpected = pendingTotal + invoicesTotal;
  const surplus = totalBalance - totalExpected;
  const coversWithAccounts = surplus >= 0;
  const coversWithSavings = (totalBalance + totalInSavings) >= totalExpected;

  let analysis: string;
  if (coversWithAccounts) {
    analysis = `Sim! Seu saldo de R$ ${totalBalance.toFixed(2)} cobre as despesas previstas de R$ ${totalExpected.toFixed(2)}, sobrando R$ ${surplus.toFixed(2)}.`;
  } else if (coversWithSavings) {
    const needFromSavings = Math.abs(surplus);
    analysis = `Seu saldo em contas (R$ ${totalBalance.toFixed(2)}) não cobre totalmente as despesas de R$ ${totalExpected.toFixed(2)}, mas você tem R$ ${totalInSavings.toFixed(2)} em cofrinhos. Precisaria usar R$ ${needFromSavings.toFixed(2)} dos cofrinhos.`;
  } else {
    const shortfall = totalExpected - totalBalance - totalInSavings;
    analysis = `Atenção! Mesmo somando contas (R$ ${totalBalance.toFixed(2)}) e cofrinhos (R$ ${totalInSavings.toFixed(2)}), faltam R$ ${shortfall.toFixed(2)} para cobrir despesas de R$ ${totalExpected.toFixed(2)}.`;
  }

  return {
    accountsBalance: totalBalance,
    savingsBalance: totalInSavings,
    totalPatrimony: totalBalance + totalInSavings,
    expectedExpenses: totalExpected,
    pendingTransactions: pendingTotal,
    creditCardInvoices: invoicesTotal,
    surplus,
    daysRemaining,
    coversWithAccounts,
    coversWithSavings,
    upcomingInvoices: invoices?.map((i: any) => ({
      card: i.credit_cards?.name,
      amount: i.total_amount,
      dueDate: i.due_date
    })),
    analysis
  };
}

async function executeGetTopExpenses(supabase: any, userId: string, period: string, groupBy: string = 'category', limit: number = 5) {
  const today = new Date();
  let startDate = new Date();
  
  if (period === 'week') {
    startDate.setDate(today.getDate() - 7);
  } else if (period === 'month') {
    startDate.setMonth(today.getMonth() - 1);
  } else if (period === 'quarter') {
    startDate.setMonth(today.getMonth() - 3);
  } else {
    startDate.setFullYear(today.getFullYear() - 1);
  }

  if (groupBy === 'category') {
    const { data: expenses } = await supabase
      .from('transactions')
      .select('amount, categories(name, icon, color)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0]);

    const categoryTotals: { [key: string]: { name: string; total: number } } = {};
    for (const expense of expenses || []) {
      const catName = expense.categories?.name || 'Sem categoria';
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { name: catName, total: 0 };
      }
      categoryTotals[catName].total += expense.amount;
    }

    const sorted = Object.values(categoryTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    const grandTotal = sorted.reduce((sum, cat) => sum + cat.total, 0);

    return {
      period,
      groupBy,
      topCategories: sorted.map((cat, idx) => ({
        rank: idx + 1,
        category: cat.name,
        total: cat.total,
        percentage: ((cat.total / grandTotal) * 100).toFixed(1)
      })),
      grandTotal
    };
  } else {
    const { data: expenses } = await supabase
      .from('transactions')
      .select('amount, description, date, categories(name)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0])
      .order('amount', { ascending: false })
      .limit(limit);

    return {
      period,
      groupBy,
      topExpenses: expenses?.map((e: any, idx: number) => ({
        rank: idx + 1,
        description: e.description,
        category: e.categories?.name || 'Sem categoria',
        amount: e.amount,
        date: e.date
      }))
    };
  }
}

async function executeGetBudgetStatus(supabase: any, userId: string) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, amount, category_id, categories(name)')
    .eq('user_id', userId)
    .eq('is_active', true);

  const results = [];
  for (const budget of budgets || []) {
    const { data: spent } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('category_id', budget.category_id)
      .eq('status', 'confirmed')
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0]);

    const totalSpent = spent?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    const percentage = (totalSpent / budget.amount) * 100;
    const remaining = budget.amount - totalSpent;

    results.push({
      category: budget.categories?.name || 'Geral',
      budgetAmount: budget.amount,
      spent: totalSpent,
      remaining,
      percentage: percentage.toFixed(1),
      status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
    });
  }

  return {
    budgets: results,
    summary: results.length > 0
      ? `Você tem ${results.length} orçamento(s) ativo(s). ${results.filter(b => b.status === 'exceeded').length} estourado(s), ${results.filter(b => b.status === 'warning').length} em alerta.`
      : 'Você não tem orçamentos ativos configurados.'
  };
}

async function executeGetFinancialSummary(supabase: any, userId: string) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Get accounts balance
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .eq('include_in_total', true);

  let totalBalance = 0;
  for (const account of accounts || []) {
    const { data: balanceData } = await supabase.rpc('calculate_account_balance', {
      p_account_id: account.id,
      p_include_pending: false
    });
    totalBalance += balanceData || 0;
  }

  // Get savings goals - CRITICAL for net worth calculation
  const { data: savingsGoals } = await supabase
    .from('savings_goals')
    .select('id, name, current_amount, target_amount')
    .eq('user_id', userId)
    .eq('is_completed', false);

  const totalInSavings = savingsGoals?.reduce((sum: number, g: any) => sum + (g.current_amount || 0), 0) || 0;
  
  // PATRIMÔNIO LÍQUIDO = Contas + Cofrinhos
  const netWorth = totalBalance + totalInSavings;

  // Get month income
  const { data: income } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .eq('status', 'confirmed')
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0]);

  const monthIncome = income?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  // Get month expenses (confirmed)
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'confirmed')
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0]);

  const monthExpenses = expenses?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  // Get pending expenses
  const { data: pendingExpenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'pending')
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0]);

  const totalPendingExpenses = pendingExpenses?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  // Get credit cards usage
  const { data: creditCards } = await supabase
    .from('credit_cards')
    .select('name, credit_limit')
    .eq('user_id', userId)
    .eq('is_archived', false);

  const { data: openInvoices } = await supabase
    .from('credit_card_invoices')
    .select('total_amount')
    .eq('user_id', userId)
    .eq('status', 'open');

  const totalCreditUsed = openInvoices?.reduce((sum: number, i: any) => sum + i.total_amount, 0) || 0;
  const totalCreditLimit = creditCards?.reduce((sum: number, c: any) => sum + c.credit_limit, 0) || 0;

  const monthBalance = monthIncome - monthExpenses;
  const projectedMonthBalance = monthIncome - monthExpenses - totalPendingExpenses;
  const savingsRate = monthIncome > 0 ? ((monthBalance / monthIncome) * 100) : 0;
  
  // Calculate "financial runway" - how many months of expenses the NET WORTH covers
  const averageMonthlyExpenses = monthExpenses > 0 ? monthExpenses : 1;
  const monthsOfRunway = netWorth / averageMonthlyExpenses;

  // Contextual analysis considering NET WORTH (not just account balance)
  let analysis = '';
  let financialHealth: 'healthy' | 'moderate' | 'critical' | 'excellent' = 'moderate';
  
  if (monthBalance >= 0) {
    if (monthsOfRunway > 6) {
      analysis = `Excelente! Você está economizando ${savingsRate.toFixed(1)}% da sua renda este mês. Seu patrimônio líquido de R$ ${netWorth.toFixed(2)} (contas: R$ ${totalBalance.toFixed(2)} + cofrinhos: R$ ${totalInSavings.toFixed(2)}) cobre mais de 6 meses de despesas!`;
      financialHealth = 'excellent';
    } else if (monthsOfRunway > 3) {
      analysis = `Ótimo! Você está no positivo este mês (${savingsRate.toFixed(1)}% de economia). Seu patrimônio líquido de R$ ${netWorth.toFixed(2)} cobre ${monthsOfRunway.toFixed(0)} meses de despesas.`;
      financialHealth = 'healthy';
    } else {
      analysis = `Positivo este mês com ${savingsRate.toFixed(1)}% de economia. Continue assim para fortalecer sua reserva (patrimônio atual cobre ${monthsOfRunway.toFixed(0)} mês(es)).`;
      financialHealth = 'moderate';
    }
  } else {
    const deficitAmount = Math.abs(monthBalance);
    
    if (monthsOfRunway > 6) {
      analysis = `Este mês você gastou R$ ${deficitAmount.toFixed(2)} a mais do que recebeu, mas tranquilo: seu patrimônio líquido de R$ ${netWorth.toFixed(2)} cobre ${monthsOfRunway.toFixed(0)} meses nesse ritmo. Fique de olho para equilibrar nos próximos meses.`;
      financialHealth = 'healthy';
    } else if (monthsOfRunway > 3) {
      analysis = `Atenção leve: déficit de R$ ${deficitAmount.toFixed(2)} este mês. Porém, seu patrimônio de R$ ${netWorth.toFixed(2)} ainda cobre ${monthsOfRunway.toFixed(0)} meses. Hora de ajustar alguns gastos.`;
      financialHealth = 'moderate';
    } else if (netWorth > 0) {
      analysis = `Alerta: você gastou R$ ${deficitAmount.toFixed(2)} a mais este mês e seu patrimônio de R$ ${netWorth.toFixed(2)} só cobre ${monthsOfRunway.toFixed(1)} mês(es) nesse ritmo. Revise seus gastos!`;
      financialHealth = 'critical';
    } else {
      analysis = `Urgente! Déficit de R$ ${deficitAmount.toFixed(2)} este mês e patrimônio negativo. É necessário revisar gastos imediatamente.`;
      financialHealth = 'critical';
    }
  }

  return {
    // PATRIMÔNIO LÍQUIDO (mais importante que saldo da conta)
    netWorth,
    accountsBalance: totalBalance,
    savingsBalance: totalInSavings,
    
    // Movimento do mês
    monthIncome,
    monthExpenses,
    monthPendingExpenses: totalPendingExpenses,
    monthBalance,
    projectedMonthBalance,
    savingsRate: savingsRate.toFixed(1),
    
    // Runway
    monthsOfRunway: monthsOfRunway === Infinity ? 'infinito' : monthsOfRunway.toFixed(1),
    
    // Crédito
    creditUsed: totalCreditUsed,
    creditLimit: totalCreditLimit,
    creditAvailable: totalCreditLimit - totalCreditUsed,
    creditUtilization: totalCreditLimit > 0 ? ((totalCreditUsed / totalCreditLimit) * 100).toFixed(1) : 0,
    
    // Estrutura
    accountsCount: accounts?.length || 0,
    savingsGoalsCount: savingsGoals?.length || 0,
    creditCardsCount: creditCards?.length || 0,
    
    // Análise
    financialHealth,
    analysis
  };
}

async function executeGetSavingsProgress(supabase: any, userId: string) {
  const { data: goals } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false);

  const totalSaved = goals?.reduce((sum: number, g: any) => sum + (g.current_amount || 0), 0) || 0;
  const totalTargets = goals?.reduce((sum: number, g: any) => sum + (g.target_amount || 0), 0) || 0;

  const results = (goals || []).map((goal: any) => {
    const percentage = goal.target_amount ? (goal.current_amount / goal.target_amount) * 100 : 0;
    let daysRemaining = null;
    if (goal.deadline) {
      daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    }
    const remaining = (goal.target_amount || 0) - goal.current_amount;

    return {
      name: goal.name,
      description: goal.description,
      target: goal.target_amount,
      current: goal.current_amount,
      remaining: remaining > 0 ? remaining : 0,
      percentage: percentage.toFixed(1),
      deadline: goal.deadline,
      daysRemaining,
      monthlyNeeded: daysRemaining && daysRemaining > 0 && remaining > 0 
        ? (remaining / (daysRemaining / 30)).toFixed(2) 
        : null,
      isEmergencyFund: goal.name?.toLowerCase().includes('emergência') || goal.name?.toLowerCase().includes('reserva')
    };
  });

  return {
    goals: results,
    totalSaved,
    totalTargets,
    overallProgress: totalTargets > 0 ? ((totalSaved / totalTargets) * 100).toFixed(1) : 0,
    summary: results.length > 0
      ? `Você tem ${results.length} meta(s) de economia ativa(s) com R$ ${totalSaved.toFixed(2)} guardados. Este valor faz parte do seu patrimônio líquido.`
      : 'Você não tem metas de economia configuradas. Considere criar uma reserva de emergência!',
    note: "Lembre-se: o valor em cofrinhos é parte do seu patrimônio e pode ser usado em emergências."
  };
}

async function executeGetUpcomingExpenses(supabase: any, userId: string, days: number = 30) {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  // Get pending transactions
  const { data: pending } = await supabase
    .from('transactions')
    .select('amount, description, date, categories(name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('status', 'pending')
    .gte('date', today.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date');

  // Get upcoming invoices
  const { data: invoices } = await supabase
    .from('credit_card_invoices')
    .select('total_amount, due_date, credit_cards(name)')
    .eq('user_id', userId)
    .eq('status', 'open')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', endDate.toISOString().split('T')[0])
    .order('due_date');

  // Get upcoming recurrences
  const { data: recurrences } = await supabase
    .from('recurrences')
    .select('description, amount, next_occurrence, frequency')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('type', 'expense')
    .gte('next_occurrence', today.toISOString().split('T')[0])
    .lte('next_occurrence', endDate.toISOString().split('T')[0]);

  const pendingTotal = pending?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const invoicesTotal = invoices?.reduce((sum: number, i: any) => sum + i.total_amount, 0) || 0;
  const recurrencesTotal = recurrences?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;

  return {
    days,
    pendingTransactions: pending?.map((t: any) => ({
      description: t.description,
      category: t.categories?.name,
      amount: t.amount,
      date: t.date
    })),
    upcomingInvoices: invoices?.map((i: any) => ({
      card: i.credit_cards?.name,
      amount: i.total_amount,
      dueDate: i.due_date
    })),
    upcomingRecurrences: recurrences?.map((r: any) => ({
      description: r.description,
      amount: r.amount,
      date: r.next_occurrence,
      frequency: r.frequency
    })),
    pendingTotal,
    invoicesTotal,
    recurrencesTotal,
    grandTotal: pendingTotal + invoicesTotal + recurrencesTotal,
    summary: `Nos próximos ${days} dias você tem R$ ${(pendingTotal + invoicesTotal + recurrencesTotal).toFixed(2)} em despesas previstas.`
  };
}

// NEW: Get category spending with subcategories support
async function executeGetCategorySpending(
  supabase: any,
  userId: string,
  categoryName: string,
  period: string = 'month',
  includeSubcategories: boolean = true,
  status: string = 'all'
) {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;
  
  // Define period - CRITICAL: use FULL MONTH for 'month' period
  if (period === 'week') {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);
    endDate = today;
  } else if (period === 'month') {
    // FULL MONTH: from 1st to last day of current month
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (period === 'quarter') {
    startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 3);
    endDate = today;
  } else if (period === 'year') {
    startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - 1);
    endDate = today;
  } else {
    startDate = new Date(2000, 0, 1);
    endDate = new Date(2100, 0, 1);
  }

  // Find categories by name (fuzzy match)
  const normalizedSearch = normalizeText(categoryName);
  
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, parent_id, type')
    .eq('user_id', userId)
    .eq('type', 'expense');

  if (!allCategories || allCategories.length === 0) {
    return {
      error: 'Nenhuma categoria de despesa encontrada',
      categoryName,
      matchCount: 0,
      totalAmount: 0
    };
  }

  // Find matching categories (fuzzy)
  const matchedCategories = allCategories.filter((cat: any) => {
    const normalized = normalizeText(cat.name);
    return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
  });

  if (matchedCategories.length === 0) {
    // Try partial match
    const partialMatches = allCategories.filter((cat: any) => {
      const normalized = normalizeText(cat.name);
      return normalized.split(' ').some((word: string) => 
        normalizedSearch.includes(word) || word.includes(normalizedSearch)
      );
    });

    if (partialMatches.length === 0) {
      return {
        error: `Categoria "${categoryName}" não encontrada. Categorias disponíveis: ${allCategories.slice(0, 10).map((c: any) => c.name).join(', ')}`,
        categoryName,
        matchCount: 0,
        totalAmount: 0,
        availableCategories: allCategories.map((c: any) => c.name)
      };
    }

    matchedCategories.push(...partialMatches);
  }

  // Collect all category IDs (including subcategories if requested)
  const categoryIds = new Set<string>();
  
  for (const cat of matchedCategories) {
    categoryIds.add(cat.id);
    
    if (includeSubcategories) {
      // Find direct children
      const children = allCategories.filter((c: any) => c.parent_id === cat.id);
      for (const child of children) {
        categoryIds.add(child.id);
        // Find grandchildren
        const grandchildren = allCategories.filter((c: any) => c.parent_id === child.id);
        for (const gc of grandchildren) {
          categoryIds.add(gc.id);
        }
      }
    }
  }

  // Query transactions
  let query = supabase
    .from('transactions')
    .select('id, amount, description, notes, ai_notes, date, type, status, category_id, categories(name, icon)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .in('category_id', Array.from(categoryIds))
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: transactions, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('Category spending error:', error);
    return { error: 'Erro ao buscar transações por categoria' };
  }

  // Calculate totals
  const totalAmount = transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const confirmedTotal = transactions?.filter((t: any) => t.status === 'confirmed')
    .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const pendingTotal = transactions?.filter((t: any) => t.status === 'pending')
    .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  // Period labels
  const periodLabels: { [key: string]: string } = {
    week: 'última semana',
    month: 'este mês',
    quarter: 'últimos 3 meses',
    year: 'último ano',
    all: 'todo o período'
  };

  return {
    categoryName,
    categoriesMatched: matchedCategories.map((c: any) => c.name),
    categoriesIncluded: Array.from(categoryIds).length,
    includeSubcategories,
    period: periodLabels[period] || period,
    periodDates: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    },
    
    // Totals
    matchCount: transactions?.length || 0,
    totalAmount,
    confirmedTotal,
    pendingTotal,
    
    // Transactions (top 20)
    transactions: (transactions || []).slice(0, 20).map((t: any) => ({
      description: t.description,
      notes: t.notes,
      amount: t.amount,
      date: t.date,
      category: t.categories?.name || 'Sem categoria',
      status: t.status
    })),
    
    hasMore: (transactions?.length || 0) > 20,
    totalResults: transactions?.length || 0,
    
    summary: transactions && transactions.length > 0
      ? `Encontrei ${transactions.length} transação(ões) na categoria "${matchedCategories[0]?.name}" ${periodLabels[period]}, totalizando R$ ${totalAmount.toFixed(2)} (R$ ${confirmedTotal.toFixed(2)} confirmados + R$ ${pendingTotal.toFixed(2)} pendentes).`
      : `Não encontrei transações na categoria "${categoryName}" ${periodLabels[period]}.`
  };
}

// IMPROVED: Search transactions with synonyms and ai_notes
async function executeSearchTransactions(
  supabase: any, 
  userId: string, 
  keyword: string,
  period: string = 'month',
  type: string = 'expense',
  status: string = 'all',
  categoryName?: string
) {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;
  
  // Define period - CRITICAL: use FULL MONTH for 'month' period
  if (period === 'week') {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);
    endDate = today;
  } else if (period === 'month') {
    // FULL MONTH: from 1st to last day of current month
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (period === 'quarter') {
    startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 3);
    endDate = today;
  } else if (period === 'year') {
    startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - 1);
    endDate = today;
  } else {
    startDate = new Date(2000, 0, 1);
    endDate = new Date(2100, 0, 1);
  }

  // Build base query - include ai_notes
  let query = supabase
    .from('transactions')
    .select('id, amount, description, notes, ai_notes, date, type, status, categories(name, icon)')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  // Filter by type
  if (type !== 'all') {
    query = query.eq('type', type);
  }

  // Filter by status
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: transactions, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('Search transactions error:', error);
    return { error: 'Erro ao buscar transações' };
  }

  // Get expanded search terms (synonyms)
  const searchTerms = getExpandedTerms(keyword);
  console.log(`Search terms for "${keyword}":`, searchTerms);

  // Filter by keyword in description, notes, OR ai_notes (with normalization and synonyms)
  const matchedTransactions = (transactions || []).filter((t: any) => {
    const descNormalized = normalizeText(t.description || '');
    const notesNormalized = normalizeText(t.notes || '');
    const aiNotesNormalized = normalizeText(t.ai_notes || '');
    const categoryNormalized = normalizeText(t.categories?.name || '');
    
    // Check if any search term matches any field
    const matchesKeyword = searchTerms.some(term => {
      const termNormalized = normalizeText(term);
      return descNormalized.includes(termNormalized) ||
             notesNormalized.includes(termNormalized) ||
             aiNotesNormalized.includes(termNormalized);
    });

    // Category filter (if specified)
    const categoryMatch = categoryName 
      ? categoryNormalized.includes(normalizeText(categoryName))
      : true;
    
    return matchesKeyword && categoryMatch;
  });

  // Calculate totals
  const totalAmount = matchedTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
  const confirmedTotal = matchedTransactions
    .filter((t: any) => t.status === 'confirmed')
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  const pendingTotal = matchedTransactions
    .filter((t: any) => t.status === 'pending')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  // Group by category for insights
  const byCategory: { [key: string]: { count: number; total: number } } = {};
  for (const t of matchedTransactions) {
    const catName = t.categories?.name || 'Sem categoria';
    if (!byCategory[catName]) {
      byCategory[catName] = { count: 0, total: 0 };
    }
    byCategory[catName].count++;
    byCategory[catName].total += t.amount;
  }

  // Format period for display
  const periodLabels: { [key: string]: string } = {
    week: 'última semana',
    month: 'este mês',
    quarter: 'últimos 3 meses',
    year: 'último ano',
    all: 'todo o período'
  };

  return {
    keyword,
    searchTermsUsed: searchTerms,
    period: periodLabels[period] || period,
    periodDates: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    },
    typeFilter: type,
    statusFilter: status,
    
    // Results
    matchCount: matchedTransactions.length,
    totalAmount,
    confirmedTotal,
    pendingTotal,
    
    // Matched transactions (limited to 20 to avoid overload)
    transactions: matchedTransactions.slice(0, 20).map((t: any) => ({
      description: t.description,
      notes: t.notes,
      aiNotes: t.ai_notes,
      amount: t.amount,
      date: t.date,
      category: t.categories?.name || 'Sem categoria',
      status: t.status,
      type: t.type
    })),
    
    // Distribution by category
    byCategory: Object.entries(byCategory)
      .map(([name, data]) => ({ category: name, count: data.count, total: data.total }))
      .sort((a, b) => b.total - a.total),
    
    // Summary
    summary: matchedTransactions.length > 0
      ? `Encontrei ${matchedTransactions.length} transação(ões) com "${keyword}" (termos: ${searchTerms.slice(0, 5).join(', ')}${searchTerms.length > 5 ? '...' : ''}) ${periodLabels[period]}, totalizando R$ ${totalAmount.toFixed(2)} (R$ ${confirmedTotal.toFixed(2)} confirmados + R$ ${pendingTotal.toFixed(2)} pendentes).`
      : `Não encontrei nenhuma transação com "${keyword}" ${periodLabels[period]}. Termos buscados: ${searchTerms.join(', ')}.`,
    
    // Hint about more results
    hasMore: matchedTransactions.length > 20,
    totalResults: matchedTransactions.length
  };
}

function executeAskClarification(args: { question: string; context: string; suggestedOptions?: string[] }) {
  // Return a structured clarification request that the frontend will handle
  return {
    type: 'clarification',
    question: args.question,
    context: args.context,
    suggestedOptions: args.suggestedOptions || []
  };
}

async function executeToolCall(supabase: any, userId: string, toolName: string, args: any) {
  console.log(`Executing tool: ${toolName} with args:`, JSON.stringify(args));
  
  switch (toolName) {
    case 'ask_clarification':
      return executeAskClarification(args);
    case 'get_complete_financial_picture':
      return await executeGetCompleteFinancialPicture(supabase, userId);
    case 'get_pending_obligations':
      return await executeGetPendingObligations(supabase, userId, args.days);
    case 'get_spending_capacity':
      return await executeGetSpendingCapacity(supabase, userId, args.period);
    case 'check_balance_coverage':
      return await executeCheckBalanceCoverage(supabase, userId);
    case 'get_top_expenses':
      return await executeGetTopExpenses(supabase, userId, args.period, args.groupBy, args.limit);
    case 'get_budget_status':
      return await executeGetBudgetStatus(supabase, userId);
    case 'get_financial_summary':
      return await executeGetFinancialSummary(supabase, userId);
    case 'get_savings_progress':
      return await executeGetSavingsProgress(supabase, userId);
    case 'get_upcoming_expenses':
      return await executeGetUpcomingExpenses(supabase, userId, args.days);
    case 'get_category_spending':
      return await executeGetCategorySpending(supabase, userId, args.categoryName, args.period, args.includeSubcategories ?? true, args.status ?? 'all');
    case 'search_transactions':
      return await executeSearchTransactions(supabase, userId, args.keyword, args.period, args.type, args.status, args.categoryName);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, financialContext, userId, conversationHistory, debug } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Track tool calls for debug mode
    const toolCallsLog: { name: string; args: any; resultSummary: string; durationMs: number }[] = [];

    const systemPrompt = `Você é Neura, uma consultora financeira pessoal integrada e onipresente em todo o sistema.

**SUA IDENTIDADE:**
Você não é apenas um chatbot - você é uma IA financeira que tem ACESSO COMPLETO a todos os dados do usuário: contas, cofrinhos, cartões, transações, recorrências, parcelamentos e projeções. Use esse poder para dar análises REAIS e PROFUNDAS.

**REGRAS FUNDAMENTAIS DE ANÁLISE (CRÍTICO):**

1. **PATRIMÔNIO LÍQUIDO = Saldo Contas + Cofrinhos**
   - NUNCA analise apenas o saldo das contas
   - Cofrinhos (savings_goals) são RESERVAS DE EMERGÊNCIA e fazem parte do patrimônio
   - Se alguém tem R$ 300 na conta mas R$ 5.000 em cofrinhos, o patrimônio é R$ 5.300

2. **DESPESAS PENDENTES devem ser consideradas**
   - Saldo Disponível Real = Patrimônio - Despesas Pendentes - Faturas a Vencer
   - NUNCA ignore transações com status 'pending'

3. **Déficit mensal NÃO é alarme se patrimônio é sólido**
   - Se patrimônio cobre 6+ meses de despesas: situação EXCELENTE (mesmo com déficit mensal)
   - Se cobre 3-6 meses: situação SAUDÁVEL
   - Se cobre 1-3 meses: atenção moderada
   - Se cobre menos de 1 mês: alerta real

4. **SEMPRE use as ferramentas para dados precisos**
   - Para visão geral: use get_complete_financial_picture
   - Para obrigações: use get_pending_obligations  
   - Para cofrinhos: use get_savings_progress
   - NUNCA responda sobre finanças sem consultar os dados reais

5. **BUSCA POR CATEGORIA vs BUSCA POR PALAVRA-CHAVE (MUITO IMPORTANTE)**
   
   **USE get_category_spending QUANDO:**
   - O usuário perguntar sobre gastos "em [categoria]" ou "na categoria [X]"
   - Exemplos: "quanto gastei em Mercado?", "gastos em Alimentação", "em Transporte esse mês"
   - Esta ferramenta soma transações pela CATEGORIA cadastrada (mais precisa para categorias)
   - Inclui automaticamente subcategorias
   
   **USE search_transactions QUANDO:**
   - O usuário perguntar sobre gastos com TERMOS ESPECÍFICOS que podem não ser uma categoria
   - Exemplos: "quanto gastei com bebidas?", "gastos com uber", "quanto gastei em cerveja?"
   - Esta ferramenta busca por PALAVRA-CHAVE na descrição, observações e notas de IA
   - USA SINÔNIMOS automaticamente (ex: "bebidas" encontra "cerveja", "vinho", etc.)

6. **PERÍODO "ESTE MÊS" significa o MÊS INTEIRO**
   - Início: dia 1 do mês atual
   - Fim: último dia do mês atual (inclui despesas futuras/pendentes dentro do mês)
   - Isso garante que os valores batam com o dashboard do app

**ESTRUTURA DE RESPOSTA PARA RESUMO FINANCEIRO:**

💎 **Patrimônio Líquido**
- Saldo em Contas: R$ X.XXX,XX
- Reserva em Cofrinhos: R$ X.XXX,XX
- **Total: R$ X.XXX,XX** (cobre X meses de despesas)

📅 **Movimento do Mês**
- Receitas: R$ X.XXX,XX
- Despesas Confirmadas: R$ X.XXX,XX
- Despesas Pendentes: R$ X.XXX,XX
- Resultado: +/- R$ X.XXX,XX

💳 **Cartões de Crédito**
- Limite Total: R$ X.XXX | Usado: R$ X.XXX | Livre: R$ X.XXX

⏳ **Obrigações Futuras (30 dias)**
[Lista de faturas, recorrências e parcelamentos]

💡 **Análise Personalizada**
[Análise contextualizada considerando TODO o patrimônio, não apenas saldo em conta]

**FORMATAÇÃO OBRIGATÓRIA:**
- Use quebras de linha para separar seções
- Use **negrito** para valores importantes
- Use emojis no início de cada seção (moderadamente)
- NUNCA coloque tudo em um parágrafo corrido
- Seja objetivo mas completo

**QUANDO FAZER PERGUNTAS DE ESCLARECIMENTO:**
- Se o usuário fizer uma pergunta ambígua (ex: "como estou?" pode ser financeiro, cofrinhos, cartões...)
- Se precisar saber o objetivo específico de uma análise
- Se houver múltiplas interpretações possíveis
- Use a ferramenta ask_clarification para perguntas estruturadas com opções

**COMPORTAMENTO:**
- Seja proativo: se vir algo importante nos dados, mencione
- Seja educativo: explique conceitos quando relevante
- Seja preciso: use os valores REAIS das ferramentas
- Seja contextual: déficit mensal com patrimônio alto é diferente de déficit com patrimônio baixo
- Para perguntas muito genéricas, peça esclarecimento ao invés de assumir

${conversationHistory && conversationHistory.length > 0 ? `
**CONTEXTO DE CONVERSAS ANTERIORES:**
O usuário já conversou com você antes. Aqui está um resumo das últimas mensagens para contexto:
${conversationHistory.slice(-10).map((m: any) => `- ${m.role === 'user' ? 'Usuário' : 'Neura'}: ${m.content.substring(0, 150)}${m.content.length > 150 ? '...' : ''}`).join('\n')}

Use esse contexto para dar respostas mais personalizadas e lembrar de preocupações anteriores do usuário.
` : ''}

Contexto rápido do usuário:
${financialContext ? `
💰 Contas: R$ ${financialContext.totalBalance?.toFixed(2) || '0,00'}
🐷 Cofrinhos: R$ ${financialContext.savingsGoalsTotal?.toFixed(2) || '0,00'}
💎 Patrimônio Líquido: R$ ${((financialContext.totalBalance || 0) + (financialContext.savingsGoalsTotal || 0)).toFixed(2)}
📅 Mês: Receita R$ ${financialContext.monthlyIncome?.toFixed(2) || '0,00'} | Despesa R$ ${financialContext.monthlyExpenses?.toFixed(2) || '0,00'}
⏳ Pendentes: R$ ${financialContext.pendingExpensesTotal?.toFixed(2) || '0,00'}
💳 Crédito: Limite R$ ${(financialContext.totalCreditLimit || 0).toFixed(2)} | Usado R$ ${(financialContext.totalCreditUsed || 0).toFixed(2)}
📊 Estrutura: ${financialContext.accountsCount || 0} conta(s), ${financialContext.savingsGoalsCount || 0} cofrinho(s), ${financialContext.creditCardsCount || 0} cartão(ões)
🔄 Recorrências: ${financialContext.hasRecurrences ? 'Sim' : 'Não'} | Parcelamentos: ${financialContext.activeInstallments || 0}
` : 'Contexto não disponível - USE AS FERRAMENTAS para buscar dados completos.'}

Responda em português brasileiro. Seja útil, objetivo e sempre considere o QUADRO COMPLETO das finanças.`;

    console.log("AI Assistant request with messages:", messages.length, "userId:", userId, "debug:", debug);

    // First request - may trigger tool calls
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
          ...messages,
        ],
        tools: userId ? financialTools : undefined,
        stream: false,
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

    const data = await response.json();
    const choice = data.choices?.[0];
    
    // Check if there are tool calls
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0 && userId) {
      console.log("Processing tool calls:", choice.message.tool_calls.length);
      
      // Execute all tool calls
      const toolResults = [];
      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const startTime = Date.now();
        const result = await executeToolCall(supabase, userId, toolCall.function.name, args);
        const durationMs = Date.now() - startTime;
        
        // Log for debug
        toolCallsLog.push({
          name: toolCall.function.name,
          args,
          resultSummary: (result as any).summary || (result as any).analysis || `${(result as any).matchCount || (result as any).count || 0} results`,
          durationMs
        });
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
      }

      // Second request with tool results
      const messagesWithTools = [
        { role: "system", content: systemPrompt },
        ...messages,
        choice.message,
        ...toolResults
      ];

      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: messagesWithTools,
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("Final AI gateway error:", finalResponse.status, errorText);
        throw new Error(`AI gateway error: ${finalResponse.status}`);
      }

      // If debug mode, prepend debug info to stream
      if (debug && toolCallsLog.length > 0) {
        const debugBlock = `[DEBUG]${JSON.stringify(toolCallsLog)}[/DEBUG]\n`;
        const debugEncoder = new TextEncoder();
        const debugChunk = debugEncoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: debugBlock } }] })}\n\n`);
        
        // Create a combined stream
        const reader = finalResponse.body?.getReader();
        const stream = new ReadableStream({
          async start(controller) {
            // First send debug info
            controller.enqueue(debugChunk);
            
            // Then pipe the rest
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            }
            controller.close();
          }
        });

        return new Response(stream, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // No tool calls - stream directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error("Error in ai-assistant function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
