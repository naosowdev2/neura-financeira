import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, CreditCard, Filter } from "lucide-react";
import { format, startOfYear, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InstallmentGroup } from "@/types/financial";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface InstallmentProjectionChartProps {
  installmentGroups: InstallmentGroup[];
  creditCards?: { id: string; name: string }[];
}

interface MonthProjection {
  month: string;
  monthKey: string;
  amount: number;
  groups: string[];
  groupCount: number;
}

type ViewMode = 'semester1' | 'semester2' | 'year';

export function InstallmentProjectionChart({ installmentGroups, creditCards = [] }: InstallmentProjectionChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [selectedCard, setSelectedCard] = useState<string>('all');

  // Filter by credit card
  const filteredGroups = useMemo(() => {
    if (selectedCard === 'all') return installmentGroups;
    return installmentGroups.filter(g => g.credit_card_id === selectedCard);
  }, [installmentGroups, selectedCard]);

  // Calculate projection for 12 months (Jan-Dec of current year)
  const projectionData = useMemo(() => {
    const months: MonthProjection[] = [];
    const today = new Date();
    const yearStart = startOfYear(today);
    
    // Generate 12 months of the year
    for (let i = 0; i < 12; i++) {
      const targetMonth = addMonths(yearStart, i);
      const monthKey = format(targetMonth, 'yyyy-MM');
      const monthLabel = format(targetMonth, 'MMM', { locale: ptBR });
      
      let totalAmount = 0;
      const contributingGroups: string[] = [];
      
      // For each installment group
      for (const group of filteredGroups) {
        // Find pending transactions in this month
        const pendingTransactions = (group.transactions as any[] || [])
          .filter((t: any) => {
            const tDate = new Date(t.date);
            return format(tDate, 'yyyy-MM') === monthKey && t.status === 'pending';
          });
        
        if (pendingTransactions.length > 0) {
          totalAmount += pendingTransactions.length * group.installment_amount;
          contributingGroups.push(group.description);
        }
      }
      
      months.push({
        month: monthLabel,
        monthKey,
        amount: totalAmount,
        groups: contributingGroups,
        groupCount: contributingGroups.length
      });
    }
    
    return months;
  }, [filteredGroups]);

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

  // Total for the year
  const totalAnnual = projectionData.reduce((sum, m) => sum + m.amount, 0);
  const totalDisplayed = displayData.reduce((sum, m) => sum + m.amount, 0);
  
  // Check if there's any data to show
  const hasData = totalAnnual > 0;

  if (!hasData) {
    return null;
  }

  // Get next 4 months with data for summary cards
  const today = new Date();
  const currentMonthKey = format(today, 'yyyy-MM');
  const upcomingMonths = projectionData
    .filter(m => m.monthKey >= currentMonthKey && m.amount > 0)
    .slice(0, 4);

  const chartConfig = {
    amount: {
      label: "Valor",
      color: "hsl(var(--primary))",
    },
  };

  // Custom tooltip content
  const CustomTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as MonthProjection;
    
    return (
      <div className="bg-popover/95 backdrop-blur-sm p-3 rounded-lg border shadow-lg min-w-[180px]">
        <p className="font-medium text-foreground capitalize mb-1">{data.month}</p>
        <p className="text-primary font-semibold">{formatCurrency(data.amount)}</p>
        {data.groups.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              {data.groupCount} parcelamento(s):
            </p>
            <div className="space-y-0.5">
              {data.groups.slice(0, 4).map((g, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate max-w-[160px]">
                  • {g}
                </p>
              ))}
              {data.groups.length > 4 && (
                <p className="text-xs text-muted-foreground/70">
                  +{data.groups.length - 4} outros
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Projeção de Parcelamentos</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        <p className="text-sm text-muted-foreground mt-1">
          Total {viewMode === 'year' ? 'anual' : viewMode === 'semester1' ? '1º semestre' : '2º semestre'}: {formatCurrency(totalDisplayed)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
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
              <ChartTooltip content={<CustomTooltipContent />} />
              <Area 
                type="monotone"
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Summary cards for upcoming months */}
        {upcomingMonths.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {upcomingMonths.map((month, i) => (
              <div 
                key={i} 
                className="text-center p-2 sm:p-3 rounded-lg bg-secondary/30 border border-border/30"
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground capitalize">{month.month}</p>
                </div>
                <p className="font-semibold text-sm">{formatCurrency(month.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {month.groupCount} parcelamento{month.groupCount !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
