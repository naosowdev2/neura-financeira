import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import type { CreditCardInvoice, Transaction } from '@/types/financial';

interface Props {
  cardId: string;
  creditLimit: number;
  invoices: CreditCardInvoice[];
  transactions: Transaction[];
  children: React.ReactNode;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function CreditLimitBreakdown({ cardId, creditLimit, invoices, transactions, children }: Props) {
  const breakdown = useMemo(() => {
    // Unpaid invoices grouped by month
    const cardInvoices = invoices
      .filter(inv => inv.credit_card_id === cardId && inv.status !== 'paid')
      .sort((a, b) => new Date(a.reference_month).getTime() - new Date(b.reference_month).getTime());
    
    // Orphan transactions (not yet assigned to an invoice)
    const orphanTxns = transactions.filter(t => 
      t.credit_card_id === cardId && 
      !t.invoice_id && 
      t.type === 'expense' && 
      t.status === 'confirmed'
    );
    
    const invoiceBreakdown = cardInvoices.map(inv => ({
      id: inv.id,
      month: format(parseDateOnly(inv.reference_month), "MMM/yy", { locale: ptBR }),
      amount: inv.total_amount || 0,
      status: inv.status,
    }));
    
    const orphanTotal = orphanTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const invoicesTotal = invoiceBreakdown.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCommitted = invoicesTotal + orphanTotal;
    const available = creditLimit - totalCommitted;
    const usagePercent = creditLimit > 0 ? (totalCommitted / creditLimit) * 100 : 0;
    
    return {
      invoices: invoiceBreakdown,
      orphanTotal,
      orphanCount: orphanTxns.length,
      totalCommitted,
      available,
      usagePercent,
    };
  }, [cardId, invoices, transactions, creditLimit]);

  // If nothing is committed, just render children without hover
  if (breakdown.totalCommitted <= 0) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="cursor-help">
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 p-0">
        <div className="p-3 space-y-3">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-sm font-medium">Detalhamento do Limite</span>
            <span className="text-xs text-muted-foreground">
              {breakdown.usagePercent.toFixed(0)}% usado
            </span>
          </div>
          
          {/* Invoice List */}
          {breakdown.invoices.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Faturas Pendentes:</p>
              <div className="space-y-1">
                {breakdown.invoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{inv.month}</span>
                    <span className="font-mono text-foreground">{formatCurrency(inv.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Orphan Transactions */}
          {breakdown.orphanTotal > 0 && (
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">
                Aguardando fatura ({breakdown.orphanCount})
              </span>
              <span className="font-mono text-foreground">{formatCurrency(breakdown.orphanTotal)}</span>
            </div>
          )}
          
          {/* Total */}
          <div className="flex justify-between font-medium border-t border-border pt-2">
            <span>Total Comprometido</span>
            <span className="text-destructive font-mono">{formatCurrency(breakdown.totalCommitted)}</span>
          </div>
          
          {/* Available */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Disponível</span>
            <span className="text-emerald-600 font-mono">{formatCurrency(breakdown.available)}</span>
          </div>
          
          {/* Progress Bar */}
          <Progress value={Math.min(breakdown.usagePercent, 100)} className="h-1.5" />
          
          <p className="text-[10px] text-muted-foreground">
            Limite total: {formatCurrency(creditLimit)}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
