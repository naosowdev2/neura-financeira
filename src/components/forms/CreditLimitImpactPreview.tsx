import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CreditCard, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import type { CreditCard as CreditCardType, CreditCardInvoice, Transaction } from '@/types/financial';

interface Props {
  creditCard: CreditCardType;
  purchaseAmount: number;
  invoices: CreditCardInvoice[];
  transactions: Transaction[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function CreditLimitImpactPreview({ creditCard, purchaseAmount, invoices, transactions }: Props) {
  const { 
    currentCommitted, 
    currentAvailable, 
    newCommitted, 
    newAvailable, 
    currentUsagePercent, 
    newUsagePercent,
    riskLevel 
  } = useMemo(() => {
    const creditLimit = creditCard.credit_limit || 0;
    
    // Calculate current committed amount (same logic as Accounts.tsx)
    const unpaidInvoicesTotal = invoices
      .filter(inv => inv.credit_card_id === creditCard.id && inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    
    const orphanTxns = transactions.filter(t => 
      t.credit_card_id === creditCard.id && 
      !t.invoice_id && 
      t.type === 'expense' && 
      t.status === 'confirmed'
    );
    const orphanTotal = orphanTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const currentCommitted = unpaidInvoicesTotal + orphanTotal;
    const currentAvailable = creditLimit - currentCommitted;
    const currentUsagePercent = creditLimit > 0 ? (currentCommitted / creditLimit) * 100 : 0;
    
    // Calculate new values after purchase
    const newCommitted = currentCommitted + purchaseAmount;
    const newAvailable = creditLimit - newCommitted;
    const newUsagePercent = creditLimit > 0 ? (newCommitted / creditLimit) * 100 : 0;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (newUsagePercent >= 95) riskLevel = 'critical';
    else if (newUsagePercent >= 80) riskLevel = 'high';
    else if (newUsagePercent >= 60) riskLevel = 'medium';
    
    return {
      currentCommitted,
      currentAvailable,
      newCommitted,
      newAvailable,
      currentUsagePercent,
      newUsagePercent,
      riskLevel,
    };
  }, [creditCard, purchaseAmount, invoices, transactions]);

  const creditLimit = creditCard.credit_limit || 0;

  // Don't show if no credit limit or no purchase amount
  if (creditLimit <= 0 || purchaseAmount <= 0) return null;

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-emerald-500';
    }
  };

  const getRiskBgColor = () => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      case 'high': return 'bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      default: return 'bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const RiskIcon = riskLevel === 'low' ? CheckCircle : AlertTriangle;

  return (
    <Card className={`${getRiskBgColor()} transition-colors`}>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Impacto no Limite</span>
        </div>

        {/* Before/After Comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Atual</p>
            <p className="text-sm font-mono font-medium">
              {formatCurrency(currentAvailable)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {currentUsagePercent.toFixed(0)}% usado
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Após Compra</p>
            <p className={`text-sm font-mono font-medium ${getRiskColor()}`}>
              {formatCurrency(newAvailable)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {newUsagePercent.toFixed(0)}% usado
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <Progress 
            value={Math.min(newUsagePercent, 100)} 
            className="h-2"
          />
          {/* Marker for current position */}
          {currentUsagePercent < 100 && (
            <div 
              className="absolute top-0 h-2 w-0.5 bg-foreground/50"
              style={{ left: `${currentUsagePercent}%` }}
            />
          )}
        </div>

        {/* Warning Message */}
        {riskLevel !== 'low' && (
          <div className={`flex items-start gap-2 text-xs ${getRiskColor()}`}>
            <RiskIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              {riskLevel === 'critical' 
                ? 'Limite praticamente esgotado após esta compra!'
                : riskLevel === 'high'
                ? 'Limite acima de 80% após esta compra. Atenção!'
                : 'Uso moderado do limite. Fique atento.'
              }
            </p>
          </div>
        )}

        {/* Info about limit release */}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Limite liberado conforme parcelas são pagas
        </p>
      </CardContent>
    </Card>
  );
}
