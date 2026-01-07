import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { ProjectedBalanceSheet } from "./ProjectedBalanceSheet";

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  is_recurring?: boolean;
  category?: {
    name: string;
    color: string | null;
  } | null;
}

interface Props {
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
  pendingExpenses?: Transaction[];
  pendingIncome?: Transaction[];
  selectedDate?: Date;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function BalanceCards({ 
  initialBalance, 
  currentBalance, 
  projectedBalance,
  pendingExpenses = [],
  pendingIncome = [],
  selectedDate = new Date()
}: Props) {
  const [projectedSheetOpen, setProjectedSheetOpen] = useState(false);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-hover animate-fade-in card-interactive card-hover-purple" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Saldo Inicial do Mês</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Wallet className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-2xl font-bold ${initialBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(initialBalance)}
            </div>
            <p className="text-xs text-white/40 mt-1">Início do período</p>
          </CardContent>
        </Card>

        <Card className="glass-hover animate-fade-in card-interactive card-hover-blue" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Saldo Atual</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-2xl font-bold ${currentBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(currentBalance)}
            </div>
            <p className="text-xs text-white/40 mt-1">Transações efetivadas</p>
          </CardContent>
        </Card>

        <Card 
          className="glass-hover animate-fade-in card-interactive card-hover-green cursor-pointer" 
          style={{ animationDelay: '200ms' }}
          onClick={() => setProjectedSheetOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Saldo Previsto</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingDown className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-2xl font-bold ${projectedBalance >= 0 ? 'text-green-400' : 'text-destructive'}`}>
              {formatCurrency(projectedBalance)}
            </div>
            <p className="text-xs text-white/40 mt-1">Clique para ver detalhes</p>
          </CardContent>
        </Card>
      </div>

      <ProjectedBalanceSheet
        open={projectedSheetOpen}
        onOpenChange={setProjectedSheetOpen}
        currentBalance={currentBalance}
        projectedBalance={projectedBalance}
        pendingExpenses={pendingExpenses}
        pendingIncome={pendingIncome}
        selectedDate={selectedDate}
      />
    </>
  );
}
