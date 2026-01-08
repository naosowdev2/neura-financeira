import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark } from "lucide-react";
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
  totalSavingsGoals?: number;
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
  totalSavingsGoals = 0,
  pendingExpenses = [],
  pendingIncome = [],
  selectedDate = new Date()
}: Props) {
  const navigate = useNavigate();
  const [projectedSheetOpen, setProjectedSheetOpen] = useState(false);
  const netWorth = currentBalance + totalSavingsGoals;

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Saldo Inicial do Mês */}
        <Card className="glass-hover animate-fade-in card-interactive card-hover-purple" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-white/60">Saldo Inicial</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-base sm:text-2xl font-bold ${initialBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(initialBalance)}
            </div>
            <p className="text-[10px] sm:text-xs text-white/40 mt-1">Início do período</p>
          </CardContent>
        </Card>

        {/* Saldo Disponível (nas contas) */}
        <Card 
          className="glass-hover animate-fade-in card-interactive card-hover-blue cursor-pointer" 
          style={{ animationDelay: '100ms' }}
          onClick={() => navigate('/accounts')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-white/60">Saldo Disponível</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20">
              <Landmark className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-base sm:text-2xl font-bold ${currentBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(currentBalance)}
            </div>
            <p className="text-[10px] sm:text-xs text-white/40 mt-1">Dinheiro em contas</p>
          </CardContent>
        </Card>

        {/* Saldo em Metas */}
        <Card 
          className="glass-hover animate-fade-in card-interactive card-hover-amber cursor-pointer" 
          style={{ animationDelay: '200ms' }}
          onClick={() => navigate('/planning?tab=savings')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-white/60">Saldo em Metas</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/20">
              <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-2xl font-bold text-amber-400">
              {formatCurrency(totalSavingsGoals)}
            </div>
            <p className="text-[10px] sm:text-xs text-white/40 mt-1">Total nos cofrinhos</p>
          </CardContent>
        </Card>

        {/* Patrimônio Líquido */}
        <Card className="glass-hover animate-fade-in card-interactive card-hover-emerald" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-white/60">Patrimônio Líquido</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-base sm:text-2xl font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
              {formatCurrency(netWorth)}
            </div>
            <p className="text-[10px] sm:text-xs text-white/40 mt-1">Disponível + Metas</p>
          </CardContent>
        </Card>
      </div>

      {/* Card separado para Saldo Previsto */}
      <Card 
        className="mt-4 glass-hover animate-fade-in card-interactive card-hover-green cursor-pointer" 
        style={{ animationDelay: '400ms' }}
        onClick={() => setProjectedSheetOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/60">Saldo Previsto</CardTitle>
          <div className="p-2 rounded-lg bg-green-500/20">
            <TrendingDown className="h-4 w-4 text-green-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div className={`text-2xl font-bold ${projectedBalance >= 0 ? 'text-green-400' : 'text-destructive'}`}>
              {formatCurrency(projectedBalance)}
            </div>
            <p className="text-xs text-white/40">Saldo Disponível + Receitas - Despesas pendentes • Clique para detalhes</p>
          </div>
        </CardContent>
      </Card>

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
