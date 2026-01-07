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
}

interface MonthProjection {
  month: string;
  monthKey: string;
  projectedIncome: number;
  projectedExpenses: number;
  installments: number;
  projectedBalance: number;
}

type ViewMode = 'semester1' | 'semester2' | 'year';

export function AnnualProjectionChart({ 
  recurrences, 
  installmentGroups, 
  accounts, 
  creditCards 
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
    
    for (let i = 0; i < 12; i++) {
      const targetMonth = addMonths(yearStart, i);
      const monthKey = format(targetMonth, 'yyyy-MM');
      const monthLabel = format(targetMonth, 'MMM', { locale: ptBR });
      const monthStart = targetMonth;
      const monthEnd = addMonths(targetMonth, 1);
      
      let projectedIncome = 0;
      let projectedExpenses = 0;
      let installmentsTotal = 0;
      
      // Calculate recurrences
      for (const recurrence of filteredRecurrences) {
        const startDate = parseISO(recurrence.start_date);
        const endDate = recurrence.end_date ? parseISO(recurrence.end_date) : null;
        
        // Check if recurrence is active during this month
        if (isBefore(monthEnd, startDate)) continue;
        if (endDate && isAfter(monthStart, endDate)) continue;
        
        // For monthly recurrences, add the full amount
        // For other frequencies, calculate based on frequency
        let monthlyAmount = recurrence.amount;
        
        if (recurrence.frequency === 'weekly') {
          monthlyAmount = recurrence.amount * 4;
        } else if (recurrence.frequency === 'biweekly') {
          monthlyAmount = recurrence.amount * 2;
        } else if (recurrence.frequency === 'yearly') {
          // Only add if this is the anniversary month
          const recurrenceMonth = startDate.getMonth();
          if (targetMonth.getMonth() !== recurrenceMonth) {
            monthlyAmount = 0;
          }
        } else if (recurrence.frequency === 'daily') {
          monthlyAmount = recurrence.amount * 30;
        }
        
        if (recurrence.type === 'income') {
          projectedIncome += monthlyAmount;
        } else {
          projectedExpenses += monthlyAmount;
        }
      }
      
      // Calculate installments for this month
      for (const group of filteredInstallments) {
        const pendingTransactions = (group.transactions as any[] || [])
          .filter((t: any) => {
            const tDate = new Date(t.date);
            return format(tDate, 'yyyy-MM') === monthKey && t.status === 'pending';
          });
        
        installmentsTotal += pendingTransactions.length * group.installment_amount;
      }
      
      months.push({
        month: monthLabel,
        monthKey,
        projectedIncome,
        projectedExpenses,
        installments: installmentsTotal,
        projectedBalance: projectedIncome - projectedExpenses - installmentsTotal
      });
    }
    
    return months;
  }, [filteredRecurrences, filteredInstallments]);

  // Filter data based on view mode
  const displayData = useMemo(() => {
    switch (viewMode) {
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
      { label: 'Q1 (Jan-Mar)', months: projectionData.slice(0, 3) },
      { label: 'Q2 (Abr-Jun)', months: projectionData.slice(3, 6) },
      { label: 'Q3 (Jul-Set)', months: projectionData.slice(6, 9) },
      { label: 'Q4 (Out-Dez)', months: projectionData.slice(9, 12) },
    ];
    
    return quarters.map(q => ({
      label: q.label,
      income: q.months.reduce((sum, m) => sum + m.projectedIncome, 0),
      expenses: q.months.reduce((sum, m) => sum + m.projectedExpenses + m.installments, 0),
      balance: q.months.reduce((sum, m) => sum + m.projectedBalance, 0)
    }));
  }, [projectionData]);

  // Count months with negative balance
  const negativeMonths = projectionData.filter(m => m.projectedBalance < 0).length;

  // Check if there's any meaningful data
  const hasData = projectionData.some(m => 
    m.projectedIncome > 0 || m.projectedExpenses > 0 || m.installments > 0
  );

  if (!hasData) {
    return null;
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload as MonthProjection;
    
    return (
      <div className="bg-popover/95 backdrop-blur-sm p-3 rounded-lg border shadow-lg min-w-[200px]">
        <p className="font-medium text-foreground capitalize mb-2">{data.month}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-success">Receitas:</span>
            <span className="font-medium">{formatCurrency(data.projectedIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-destructive">Despesas Fixas:</span>
            <span className="font-medium">{formatCurrency(data.projectedExpenses)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary">Parcelamentos:</span>
            <span className="font-medium">{formatCurrency(data.installments)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border/50">
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
                <TabsTrigger value="semester1" className="text-xs px-2 h-6">S1</TabsTrigger>
                <TabsTrigger value="semester2" className="text-xs px-2 h-6">S2</TabsTrigger>
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
                dataKey="projectedIncome" 
                name="Receitas"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                fill="url(#colorIncome)"
              />
              <Area 
                type="monotone"
                dataKey="projectedExpenses" 
                name="Despesas Fixas"
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                fill="url(#colorExpenses)"
              />
              <Area 
                type="monotone"
                dataKey="installments" 
                name="Parcelamentos"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#colorInstallments)"
              />
              <Line 
                type="monotone"
                dataKey="projectedBalance" 
                name="Saldo Projetado"
                stroke="hsl(var(--foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
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
