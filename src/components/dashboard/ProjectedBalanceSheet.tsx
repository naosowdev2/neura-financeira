import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Clock, RefreshCcw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  projectedBalance: number;
  pendingExpenses: Transaction[];
  pendingIncome: Transaction[];
  selectedDate: Date;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ProjectedBalanceSheet({
  open,
  onOpenChange,
  currentBalance,
  projectedBalance,
  pendingExpenses,
  pendingIncome,
  selectedDate,
}: Props) {
  const navigate = useNavigate();
  const totalPendingExpenses = pendingExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPendingIncome = pendingIncome.reduce((sum, t) => sum + Number(t.amount), 0);

  const monthName = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  const handleViewDetails = () => {
    onOpenChange(false);
    navigate('/planning?tab=projections');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-400" />
            Saldo Previsto - {monthName}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Balance Comparison */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-3 text-center">
                <Wallet className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Saldo Atual</p>
                <p className={`text-sm font-bold ${currentBalance >= 0 ? 'text-blue-400' : 'text-destructive'}`}>
                  {formatCurrency(currentBalance)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30 border-border/50 flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Card>

            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-3 text-center">
                <TrendingDown className="h-5 w-5 text-green-400 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Saldo Previsto</p>
                <p className={`text-sm font-bold ${projectedBalance >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                  {formatCurrency(projectedBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Impact Summary */}
          <Card className="bg-secondary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm">Receitas Pendentes</span>
                </div>
                <span className="font-medium text-green-400">
                  +{formatCurrency(totalPendingIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-400" />
                  <span className="text-sm">Despesas Pendentes</span>
                </div>
                <span className="font-medium text-orange-400">
                  -{formatCurrency(totalPendingExpenses)}
                </span>
              </div>
              <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Impacto Total</span>
                <span className={`font-bold ${(totalPendingIncome - totalPendingExpenses) >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                  {formatCurrency(totalPendingIncome - totalPendingExpenses)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Transactions List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Transações Pendentes do Mês
            </h3>

            <ScrollArea className="h-[calc(100vh-520px)]">
              <div className="space-y-2 pr-4">
                {pendingIncome.length === 0 && pendingExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma transação pendente para este mês.
                  </p>
                ) : (
                  <>
                    {/* Pending Income */}
                    {pendingIncome.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-400" />
                            <span className="font-medium text-sm">{transaction.description}</span>
                            {transaction.is_recurring && (
                              <Badge variant="outline" className="text-xs gap-1 border-blue-500/50 text-blue-400">
                                <RefreshCcw className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {format(new Date(transaction.date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                            {transaction.category && ` • ${transaction.category.name}`}
                          </p>
                        </div>
                        <span className="font-semibold text-green-400">
                          +{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}

                    {/* Pending Expenses */}
                    {pendingExpenses.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-orange-400" />
                            <span className="font-medium text-sm">{transaction.description}</span>
                            {transaction.is_recurring && (
                              <Badge variant="outline" className="text-xs gap-1 border-blue-500/50 text-blue-400">
                                <RefreshCcw className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {format(new Date(transaction.date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                            {transaction.category && ` • ${transaction.category.name}`}
                          </p>
                        </div>
                        <span className="font-semibold text-orange-400">
                          -{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* View Details Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleViewDetails}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver projeções detalhadas
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
