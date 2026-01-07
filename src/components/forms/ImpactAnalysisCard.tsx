import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp,
  Wallet,
  PiggyBank,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Shield,
  CreditCard
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ImpactAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  currentBalance: number;
  newBalance: number;
  projectedBalance: number;
  isCreditCard?: boolean;
  creditLimit?: number;
  budgetImpact: {
    category_id: string;
    category_name: string;
    budget_amount: number;
    current_spent: number;
    after_transaction: number;
    percent_used: number;
    over_budget: boolean;
  } | null;
  warnings: string[];
  positives: string[];
  summary: string;
  recommendation: 'proceed' | 'proceed_with_caution' | 'review_recommended';
}

interface ImpactAnalysisCardProps {
  analysis: ImpactAnalysis | null;
  isLoading?: boolean;
  transactionType: 'income' | 'expense' | 'transfer';
  transactionAmount: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ImpactAnalysisCard({ 
  analysis, 
  isLoading,
  transactionType,
  transactionAmount,
}: ImpactAnalysisCardProps) {
  if (isLoading) {
    return (
      <Card className="border-2 border-muted">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Analisando impacto financeiro...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const riskConfig = {
    low: {
      icon: ShieldCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      label: 'Baixo Risco',
    },
    medium: {
      icon: Shield,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      label: 'Atenção',
    },
    high: {
      icon: ShieldAlert,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      label: 'Alto Risco',
    },
  };

  const config = riskConfig[analysis.riskLevel];
  const RiskIcon = config.icon;

  const balanceChange = analysis.newBalance - analysis.currentBalance;
  const isPositiveChange = balanceChange >= 0;
  const isCreditCard = analysis.isCreditCard ?? false;

  // Calculate credit card usage percentage if applicable
  const creditUsagePercent = isCreditCard && analysis.creditLimit 
    ? ((analysis.creditLimit - analysis.newBalance) / analysis.creditLimit) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Risk Level Header */}
      <Card className={cn("border-2", config.borderColor, config.bgColor)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", config.bgColor)}>
              <RiskIcon className={cn("h-5 w-5", config.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("font-semibold", config.color)}>{config.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {analysis.summary}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance/Limit Impact */}
      <Card>
        <CardContent className="py-4 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            {isCreditCard ? (
              <>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Impacto no Limite
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Impacto no Saldo
              </>
            )}
          </h4>
          
          <div className="space-y-3">
            {/* Grid with Current and New Balance/Limit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2.5 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  {isCreditCard ? 'Limite Disponível' : 'Saldo Atual'}
                </div>
                <div className={cn(
                  "text-base font-semibold truncate",
                  analysis.currentBalance < 0 ? "text-rose-500" : "text-foreground"
                )}>
                  {formatCurrency(analysis.currentBalance)}
                </div>
              </div>

              <div className="text-center p-2.5 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  {isCreditCard ? 'Limite Após Compra' : 'Novo Saldo'}
                </div>
                <div className={cn(
                  "text-base font-semibold truncate",
                  analysis.newBalance < 0 ? "text-rose-500" : "text-emerald-600"
                )}>
                  {formatCurrency(analysis.newBalance)}
                </div>
              </div>
            </div>

            {/* Credit card usage progress bar */}
            {isCreditCard && analysis.creditLimit && analysis.creditLimit > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uso do limite</span>
                  <span className={cn(
                    creditUsagePercent > 80 ? "text-amber-500" : "",
                    creditUsagePercent > 100 ? "text-rose-500" : ""
                  )}>
                    {creditUsagePercent.toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(creditUsagePercent, 100)} 
                  className={cn(
                    "h-2",
                    creditUsagePercent > 100 
                      ? "[&>div]:bg-rose-500" 
                      : creditUsagePercent > 80
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-pink-500"
                  )}
                />
                <div className="text-xs text-muted-foreground text-right">
                  Limite total: {formatCurrency(analysis.creditLimit)}
                </div>
              </div>
            )}

            {/* Badge showing change amount */}
            <div className="flex justify-center">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                isPositiveChange ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                {isPositiveChange ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {isPositiveChange ? '+' : ''}{formatCurrency(balanceChange)}
              </div>
            </div>
          </div>

          {/* Projected balance - only for regular accounts */}
          {!isCreditCard && analysis.projectedBalance !== analysis.newBalance && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <PiggyBank className="h-4 w-4" />
                  Saldo projetado (30 dias)
                </span>
                <span className={cn(
                  "font-medium",
                  analysis.projectedBalance < 0 ? "text-rose-500" : "text-foreground"
                )}>
                  {formatCurrency(analysis.projectedBalance)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Impact */}
      {analysis.budgetImpact && (
        <Card className={cn(
          "border-2",
          analysis.budgetImpact.over_budget 
            ? "border-rose-500/30 bg-rose-500/5" 
            : analysis.budgetImpact.percent_used >= 80
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border"
        )}>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Orçamento: {analysis.budgetImpact.category_name}
              </h4>
              <span className={cn(
                "text-sm font-medium",
                analysis.budgetImpact.over_budget 
                  ? "text-rose-500" 
                  : analysis.budgetImpact.percent_used >= 80
                    ? "text-amber-500"
                    : "text-muted-foreground"
              )}>
                {analysis.budgetImpact.percent_used.toFixed(0)}%
              </span>
            </div>

            <Progress 
              value={Math.min(analysis.budgetImpact.percent_used, 100)} 
              className={cn(
                "h-2",
                analysis.budgetImpact.over_budget 
                  ? "[&>div]:bg-rose-500" 
                  : analysis.budgetImpact.percent_used >= 80
                    ? "[&>div]:bg-amber-500"
                    : ""
              )}
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Gasto: {formatCurrency(analysis.budgetImpact.current_spent)} → {formatCurrency(analysis.budgetImpact.after_transaction)}
              </span>
              <span>
                Limite: {formatCurrency(analysis.budgetImpact.budget_amount)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="space-y-2">
          {analysis.warnings.map((warning, idx) => (
            <div 
              key={idx}
              className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Positives */}
      {analysis.positives.length > 0 && (
        <div className="space-y-2">
          {analysis.positives.map((positive, idx) => (
            <div 
              key={idx}
              className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{positive}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
