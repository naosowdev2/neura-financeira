import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Tooltip, Legend 
} from "recharts";
import { TrendingUp, AlertTriangle, Wallet, CreditCard } from "lucide-react";
import { format, startOfYear, addMonths, isBefore, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Recurrence, InstallmentGroup } from "@/types/financial";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface AnnualProjectionChartProps {
  recurrences: Recurrence[];
  installmentGroups: InstallmentGroup[];
  accounts: { id: string; name: string }[];
  creditCards: { id: string; name: string }[];
  transactions?: any[];
}

interface MonthProjection {
  month: string;
  monthKey: string;
  // Receitas
  receitasAvulsas: number;
  recorrenciasReceita: number;
  totalReceitas: number;
  // Despesas
  despesasAvulsas: number;
  recorrenciasDespesa: number;
  parcelamentos: number;
  totalDespesas: number;
  // Saldo
  projectedBalance: number;
  isPast: boolean;
}

type ViewMode = 'q1' | 'q2' | 'q3' | 'q4' | 'semester1' | 'semester2' | 'year';

export function AnnualProjectionChart({ 
  recurrences, 
  installmentGroups, 
  accounts, 
  creditCards,
  transactions = []
}: AnnualProjectionChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<string>('all');

  // Filter recurrences and installments based on filters
  const filteredRecurrences = useMemo(() => {
    return recurrences.filter(r => {
      if (!r.is_active) return false;
      if (selectedAccount !== 'all' && r.account_id !== selectedAccount) return false;
      if (selectedCard !== 'all' && r.credit_card_id !== selectedCard) return false;
      return true;
    });
  }, [recurrences, selectedAccount, selectedCard]);

  const filteredInstallments = useMemo(() => {
    return installmentGroups.filter(g => {
      if (selectedAccount !== 'all' && g.account_id !== selectedAccount) return false;
      if (selectedCard !== 'all' && g.credit_card_id !== selectedCard) return false;
      return true;
    });
  }, [installmentGroups, selectedAccount, selectedCard]);

  // Calculate monthly projections for the entire year
  const projectionData = useMemo(() => {
    const months: MonthProjection[] = [];
    const today = new Date();
    const yearStart = startOfYear(today);
    const currentMonthKey = format(today, 'yyyy-MM');
    
    for (let i = 0; i < 12; i++) {
      const targetMonth = addMonths(yearStart, i);
      const monthKey = format(targetMonth, 'yyyy-MM');
      const monthLabel = format(targetMonth, 'MMM', { locale: ptBR });
      const monthStart = targetMonth;
      const monthEnd = addMonths(targetMonth, 1);
      const isPastOrCurrentMonth = monthKey <= currentMonthKey;
      
      // Filter transactions for this month (excluding credit card and savings goal)
      const monthTransactions = transactions.filter(t => {
        const tDate = format(parseISO(t.date), 'yyyy-MM');
        return tDate === monthKey && 
               (t.status === 'confirmed' || t.status === 'pending') &&
               !t.credit_card_id && 
               !t.savings_goal_id;
      });
      
      // ========== RECEITAS ==========
      // Avulsas: transações sem recurrence_id e sem installment_group_id
      const receitasAvulsas = monthTransactions
        .filter(t => t.type === 'income' && !t.recurrence_id && !t.installment_group_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Recorrências de receita
      let recorrenciasReceita = 0;
      if (isPastOrCurrentMonth) {
        // Mês passado/atual: usar transações reais com recurrence_id
        recorrenciasReceita = monthTransactions
          .filter(t => t.type === 'income' && t.recurrence_id !== null)
          .reduce((sum, t) => sum + Number(t.amount), 0);
      } else {
        // Mês futuro: projetar baseado em recorrências ativas sem end_date
        for (const recurrence of filteredRecurrences) {
          if (recurrence.type !== 'income') continue;
          if (recurrence.end_date) continue; // Ignorar com prazo definido
          
          const startDate = parseISO(recurrence.start_date);
          if (isBefore(monthEnd, startDate)) continue;
          
          let monthlyAmount = recurrence.amount;
          if (recurrence.frequency === 'weekly') monthlyAmount *= 4;
          else if (recurrence.frequency === 'biweekly') monthlyAmount *= 2;
          else if (recurrence.frequency === 'yearly') {
            if (targetMonth.getMonth() !== startDate.getMonth()) monthlyAmount = 0;
          } else if (recurrence.frequency === 'daily') monthlyAmount *= 30;
          
          recorrenciasReceita += monthlyAmount;
        }
      }
      
      const totalReceitas = receitasAvulsas + recorrenciasReceita;
      
      // ========== DESPESAS ==========
      // Avulsas: transações sem recurrence_id e sem installment_group_id
      const despesasAvulsas = monthTransactions
        .filter(t => t.type === 'expense' && !t.recurrence_id && !t.installment_group_id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Recorrências de despesa (fixas, sem prazo)
      let recorrenciasDespesa = 0;
      if (isPastOrCurrentMonth) {
        // Mês passado/atual: usar transações reais com recurrence_id
        recorrenciasDespesa = monthTransactions
          .filter(t => t.type === 'expense' && t.recurrence_id !== null)
          .reduce((sum, t) => sum + Number(t.amount), 0);
      } else {
        // Mês futuro: projetar baseado em recorrências ativas sem end_date
        for (const recurrence of filteredRecurrences) {
          if (recurrence.type !== 'expense') continue;
          if (recurrence.end_date) continue; // Ignorar com prazo definido
          
          const startDate = parseISO(recurrence.start_date);
          if (isBefore(monthEnd, startDate)) continue;
          
          let monthlyAmount = recurrence.amount;
          if (recurrence.frequency === 'weekly') monthlyAmount *= 4;
          else if (recurrence.frequency === 'biweekly') monthlyAmount *= 2;
          else if (recurrence.frequency === 'yearly') {
            if (targetMonth.getMonth() !== startDate.getMonth()) monthlyAmount = 0;
          } else if (recurrence.frequency === 'daily') monthlyAmount *= 30;
          
          recorrenciasDespesa += monthlyAmount;
        }
      }
      
      // Parcelamentos: transações com installment_group_id
      const parcelamentos = monthTransactions
        .filter(t => t.type === 'expense' && t.installment_group_id !== null)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalDespesas = despesasAvulsas + recorrenciasDespesa + parcelamentos;
      
      months.push({
        month: monthLabel,
        monthKey,
        receitasAvulsas,
        recorrenciasReceita,
        totalReceitas,
        despesasAvulsas,
        recorrenciasDespesa,
        parcelamentos,
        totalDespesas,
        projectedBalance: totalReceitas - totalDespesas,
        isPast: isPastOrCurrentMonth
      });
    }
    
    return months;
  }, [filteredRecurrences, transactions]);

  // Filter data based on view mode
  const displayData = useMemo(() => {
    switch (viewMode) {
      case 'q1':
        return projectionData.slice(0, 3);
      case 'q2':
        return projectionData.slice(3, 6);
      case 'q3':
        return projectionData.slice(6, 9);
      case 'q4':
        return projectionData.slice(9, 12);
      case 'semester1':
        return projectionData.slice(0, 6);
      case 'semester2':
        return projectionData.slice(6, 12);
      default:
        return projectionData;
    }
  }, [projectionData, viewMode]);

  // Calculate quarterly summaries
  const quarterSummaries = useMemo(() => {
    const quarters = [
      { label: '1º Trimestre (Jan-Mar)', months: projectionData.slice(0, 3) },
      { label: '2º Trimestre (Abr-Jun)', months: projectionData.slice(3, 6) },
      { label: '3º Trimestre (Jul-Set)', months: projectionData.slice(6, 9) },
      { label: '4º Trimestre (Out-Dez)', months: projectionData.slice(9, 12) },
    ];
    
    return quarters.map(q => ({
      label: q.label,
      income: q.months.reduce((sum, m) => sum + m.totalReceitas, 0),
      expenses: q.months.reduce((sum, m) => sum + m.totalDespesas, 0),
      balance: q.months.reduce((sum, m) => sum + m.projectedBalance, 0)
    }));
  }, [projectionData]);

  // Count months with negative balance
  const negativeMonths = projectionData.filter(m => m.projectedBalance < 0).length;

  // Check if there's any meaningful data
  const hasData = projectionData.some(m => 
    m.totalReceitas > 0 || m.totalDespesas > 0
  );

  if (!hasData) {
    return null;
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload as MonthProjection;
    
    return (
      <div className="bg-popover/95 backdrop-blur-sm p-3 rounded-lg border shadow-lg min-w-[240px]">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-medium text-foreground capitalize">{data.month}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded ${data.isPast ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
            {data.isPast ? 'Real' : 'Projetado'}
          </span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="text-xs text-muted-foreground font-medium mb-1">Receitas</div>
          {data.receitasAvulsas > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-success/80">Avulsas:</span>
              <span className="font-medium">{formatCurrency(data.receitasAvulsas)}</span>
            </div>
          )}
          {data.recorrenciasReceita > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-success/80">Recorrências:</span>
              <span className="font-medium">{formatCurrency(data.recorrenciasReceita)}</span>
            </div>
          )}
          <div className="flex justify-between text-success font-medium">
            <span>Total Receitas:</span>
            <span>{formatCurrency(data.totalReceitas)}</span>
          </div>
          
          <div className="text-xs text-muted-foreground font-medium mb-1 mt-2">Despesas</div>
          {data.despesasAvulsas > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-destructive/80">Avulsas:</span>
              <span className="font-medium">{formatCurrency(data.despesasAvulsas)}</span>
            </div>
          )}
          {data.recorrenciasDespesa > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-destructive/80">Recorrências:</span>
              <span className="font-medium">{formatCurrency(data.recorrenciasDespesa)}</span>
            </div>
          )}
          {data.parcelamentos > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-primary/80">Parcelamentos:</span>
              <span className="font-medium">{formatCurrency(data.parcelamentos)}</span>
            </div>
          )}
          <div className="flex justify-between text-destructive font-medium">
            <span>Total Despesas:</span>
            <span>{formatCurrency(data.totalDespesas)}</span>
          </div>
          
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className={data.projectedBalance >= 0 ? 'text-success' : 'text-destructive'}>
              Saldo:
            </span>
            <span className={`font-semibold ${data.projectedBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(data.projectedBalance)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">Projeção Financeira Anual</CardTitle>
              {negativeMonths > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {negativeMonths} mês(es) negativo(s)
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {accounts.length > 0 && (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {creditCards.length > 0 && (
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {creditCards.map(card => (
                    <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="q1" className="text-xs px-2 h-6">1º Tri</TabsTrigger>
                <TabsTrigger value="q2" className="text-xs px-2 h-6">2º Tri</TabsTrigger>
                <TabsTrigger value="q3" className="text-xs px-2 h-6">3º Tri</TabsTrigger>
                <TabsTrigger value="q4" className="text-xs px-2 h-6">4º Tri</TabsTrigger>
                <TabsTrigger value="semester1" className="text-xs px-2 h-6">1º Sem</TabsTrigger>
                <TabsTrigger value="semester2" className="text-xs px-2 h-6">2º Sem</TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-2 h-6">Ano</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorInstallments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="capitalize"
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
              
              <Area 
                type="monotone"
                dataKey="totalReceitas" 
                name="Receitas"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                fill="url(#colorIncome)"
              />
              <Area 
                type="monotone"
                dataKey="recorrenciasDespesa" 
                name="Desp. Recorrentes"
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                fill="url(#colorExpenses)"
              />
              <Area 
                type="monotone"
                dataKey="parcelamentos" 
                name="Parcelamentos"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#colorInstallments)"
              />
              <Line 
                type="monotone"
                dataKey="projectedBalance" 
                name="Saldo"
                stroke="hsl(var(--foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with category explanations */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Legenda das categorias:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-full bg-success flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Receitas:</span>
                <span className="text-muted-foreground"> Entradas avulsas + recorrências fixas (salário, etc.)</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Desp. Recorrentes:</span>
                <span className="text-muted-foreground"> Despesas fixas sem prazo (aluguel, internet, etc.)</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-full bg-primary flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Parcelamentos:</span>
                <span className="text-muted-foreground"> Compras parceladas com número definido de parcelas</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-full bg-foreground/60 flex-shrink-0 mt-0.5" style={{ border: '2px dashed hsl(var(--foreground))' }} />
              <div>
                <span className="font-medium text-foreground">Saldo:</span>
                <span className="text-muted-foreground"> Receitas - Despesas totais do mês</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quarterly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quarterSummaries.map((quarter, i) => (
            <div 
              key={i} 
              className={`text-center p-2 sm:p-3 rounded-lg border ${
                quarter.balance >= 0 
                  ? 'bg-success/5 border-success/20' 
                  : 'bg-destructive/5 border-destructive/20'
              }`}
            >
              <p className="text-xs text-muted-foreground mb-1">{quarter.label}</p>
              <p className={`font-semibold text-sm ${
                quarter.balance >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {formatCurrency(quarter.balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saldo projetado
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
