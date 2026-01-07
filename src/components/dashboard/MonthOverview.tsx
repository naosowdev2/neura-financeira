import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  monthIncome: number;
  monthExpenses: number;
  selectedMonth: number;
  selectedYear: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function MonthOverview({ monthIncome, monthExpenses, selectedMonth, selectedYear }: Props) {
  const navigate = useNavigate();

  const handleIncomeClick = () => {
    navigate(`/reports?month=${selectedMonth}&year=${selectedYear}`);
  };

  const handleExpenseClick = () => {
    navigate(`/reports?month=${selectedMonth}&year=${selectedYear}`);
  };

  return (
    <Card className="animate-fade-in card-interactive card-hover-purple" style={{ animationDelay: '300ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Visão Geral do Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div 
            onClick={handleIncomeClick}
            className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 transition-all duration-300 hover:bg-green-500/15 hover:border-green-500/30 hover:scale-[1.02] cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/60">Receitas</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(monthIncome)}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-green-400 transition-colors" />
          </div>

          <div 
            onClick={handleExpenseClick}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 transition-all duration-300 hover:bg-red-500/15 hover:border-red-500/30 hover:scale-[1.02] cursor-pointer group"
          >
            <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/60">Despesas</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(monthExpenses)}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-red-400 transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}