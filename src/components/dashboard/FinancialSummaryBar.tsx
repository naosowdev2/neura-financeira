import { Link } from 'react-router-dom';
import { Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FinancialSummaryBarProps {
  totalAccounts: number;
  totalInvoices: number;
  totalSavings: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function FinancialSummaryBar({ 
  totalAccounts, 
  totalInvoices, 
  totalSavings 
}: FinancialSummaryBarProps) {
  return (
    <div className="flex items-center justify-center sm:justify-between gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-muted/30 border flex-wrap">
      <Link 
        to="/accounts" 
        className="flex items-center gap-1.5 sm:gap-2 hover:bg-muted/50 px-2 sm:px-3 py-1.5 rounded transition-colors min-w-fit"
      >
        <Wallet className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Contas</span>
        <span className={`text-sm font-semibold ${totalAccounts >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
          {formatCurrency(totalAccounts)}
        </span>
      </Link>
      
      <Separator orientation="vertical" className="h-6 hidden sm:block" />
      
      <Link 
        to="/accounts?tab=cards" 
        className="flex items-center gap-1.5 sm:gap-2 hover:bg-muted/50 px-2 sm:px-3 py-1.5 rounded transition-colors min-w-fit"
      >
        <CreditCard className="h-4 w-4 text-pink-500 shrink-0" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Faturas</span>
        <span className="text-sm font-semibold text-destructive">
          {formatCurrency(totalInvoices)}
        </span>
      </Link>
      
      <Separator orientation="vertical" className="h-6 hidden sm:block" />
      
      <Link 
        to="/planning" 
        className="flex items-center gap-1.5 sm:gap-2 hover:bg-muted/50 px-2 sm:px-3 py-1.5 rounded transition-colors min-w-fit"
      >
        <PiggyBank className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Metas</span>
        <span className="text-sm font-semibold text-emerald-600">
          {formatCurrency(totalSavings)}
        </span>
      </Link>
    </div>
  );
}
