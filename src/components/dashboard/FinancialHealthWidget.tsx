import { TrendingUp, TrendingDown, Minus, Shield, Calendar, PiggyBank, CreditCard, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFinancialHealth } from '@/hooks/useFinancialHealth';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function FinancialHealthWidget() {
  const { data, isLoading } = useFinancialHealth();

  if (isLoading || !data) {
    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Saúde Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Boa';
      case 'fair': return 'Regular';
      case 'poor': return 'Precisa atenção';
      default: return status;
    }
  };

  const TrendIcon = data.balanceTrend === 'up' 
    ? TrendingUp 
    : data.balanceTrend === 'down' 
      ? TrendingDown 
      : Minus;

  const trendColor = data.balanceTrend === 'up' 
    ? 'text-emerald-500' 
    : data.balanceTrend === 'down' 
      ? 'text-red-500' 
      : 'text-muted-foreground';

  return (
    <TooltipProvider>
      <Card className="col-span-full lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Saúde Financeira
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-sm">
                  Pontuação calculada com base na cobertura de despesas, taxa de poupança e uso do crédito.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Score Circle */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={201}
                  strokeDashoffset={201 - (201 * data.healthScore) / 100}
                  strokeLinecap="round"
                  className={getScoreColor(data.healthScore)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-xl font-bold", getScoreColor(data.healthScore))}>
                  {Math.round(data.healthScore)}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className={cn("text-lg font-semibold", getScoreColor(data.healthScore))}>
                {getStatusLabel(data.healthStatus)}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendIcon className={cn("h-4 w-4", trendColor)} />
                <span>
                  {data.balanceTrend === 'up' && 'Subindo'}
                  {data.balanceTrend === 'down' && 'Descendo'}
                  {data.balanceTrend === 'stable' && 'Estável'}
                </span>
              </div>
            </div>
          </div>

          {/* Key Indicators Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Months of Coverage */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-xs">Cobertura</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {data.monthsOfCoverage.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">meses</span>
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-sm">
                  <strong>Meses de Cobertura:</strong> Por quantos meses seu saldo atual cobriria suas despesas médias mensais (baseado nos últimos 4 meses).
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Savings Rate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <PiggyBank className="h-3.5 w-3.5" />
                    <span className="text-xs">Taxa de Poupança</span>
                  </div>
                  <p className={cn(
                    "text-lg font-semibold",
                    data.savingsRate >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {data.savingsRate.toFixed(0)}%
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-sm">
                  <strong>Taxa de Poupança:</strong> Percentual da sua renda mensal que sobra após as despesas. Valores positivos indicam economia, negativos indicam que gastou mais do que ganhou.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Credit Utilization */}
          {data.totalCreditLimit > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-2 cursor-help">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Uso do Crédito</span>
                    </div>
                    <span className={cn(
                      "font-medium",
                      data.creditUtilization <= 30 ? 'text-emerald-500' :
                      data.creditUtilization <= 70 ? 'text-amber-500' : 'text-red-500'
                    )}>
                      {data.creditUtilization.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(data.creditUtilization, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(data.totalCreditUsed)} de {formatCurrency(data.totalCreditLimit)}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-sm">
                  <strong>Uso do Crédito:</strong> Percentual do limite total de crédito utilizado nas faturas abertas. Recomendado manter abaixo de 30%.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
