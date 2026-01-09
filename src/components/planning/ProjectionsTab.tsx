import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Scale,
  RefreshCcw,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProjections, ProjectionTransaction } from "@/hooks/useProjections";
import { useMultiMonthProjection } from "@/hooks/useMultiMonthProjection";
import { ScenarioSimulator } from "./ScenarioSimulator";
import { ScenarioItem } from "./AddScenarioDialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ProjectionsTab() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  
  // Scenario state (elevated from ScenarioSimulator)
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [scenarioBaseMonth, setScenarioBaseMonth] = useState<Date | null>(null);
  const [simulatorSelectedDate, setSimulatorSelectedDate] = useState(new Date());

  const { data, isLoading } = useProjections(selectedDate);
  
  // Multi-month projection for the simulator
  const { data: multiMonthData } = useMultiMonthProjection(
    scenarioBaseMonth,
    simulatorSelectedDate,
    scenarios
  );

  const handlePreviousMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };

  // Scenario handlers
  const handleAddScenario = (scenario: ScenarioItem) => {
    if (scenarios.length === 0) {
      // Set the base month when first scenario is added
      setScenarioBaseMonth(selectedDate);
      setSimulatorSelectedDate(selectedDate);
    }
    setScenarios(prev => [...prev, scenario]);
  };

  const handleRemoveScenario = (id: string) => {
    const newScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(newScenarios);
    
    // If all scenarios removed, reset base month
    if (newScenarios.length === 0) {
      setScenarioBaseMonth(null);
      setSimulatorSelectedDate(selectedDate);
    }
  };

  const handleClearScenarios = () => {
    setScenarios([]);
    setScenarioBaseMonth(null);
    setSimulatorSelectedDate(selectedDate);
  };

  const handleSimulatorMonthChange = (date: Date) => {
    setSimulatorSelectedDate(date);
  };

  const monthName = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Não foi possível carregar as projeções.
      </div>
    );
  }

  // Get values for the simulator based on which month it's displaying
  const simulatorProjectedIncome = multiMonthData?.monthBreakdown?.find(
    m => format(m.month, 'yyyy-MM') === format(simulatorSelectedDate, 'yyyy-MM')
  )?.projectedIncome ?? data.projectedIncome;
  
  const simulatorProjectedExpenses = multiMonthData?.monthBreakdown?.find(
    m => format(m.month, 'yyyy-MM') === format(simulatorSelectedDate, 'yyyy-MM')
  )?.projectedExpenses ?? data.projectedExpenses;

  return (
    <div className="space-y-6">
      {/* Header with description */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Projeções</h2>
        <p className="text-muted-foreground">Visualize o saldo previsto mês a mês</p>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold min-w-[200px] text-center">
          {capitalizedMonth}
        </span>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Initial Balance Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Saldo Inicial do Mês</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`text-xs gap-1 cursor-help ${
                          data.hasProjectedInitialBalance 
                            ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {data.hasProjectedInitialBalance ? "Projetado" : "Real"}
                        <Info className="h-3 w-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      {data.hasProjectedInitialBalance 
                        ? `Inclui ${data.pendingCountBeforeMonth} transação(ões) pendente(s) de meses anteriores tratadas como confirmadas`
                        : "Baseado apenas em transações confirmadas"
                      }
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className={`text-2xl font-bold ${data.initialBalance >= 0 ? 'text-blue-400' : 'text-destructive'}`}>
                {formatCurrency(data.initialBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Section */}
      <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen}>
        <Card className="bg-green-500/10 border-green-500/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-green-500/5 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Receitas Previstas</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {data.incomeTransactions.length} lançamento{data.incomeTransactions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-green-400">
                    +{formatCurrency(data.projectedIncome)}
                  </span>
                  {incomeOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <div className="space-y-2 border-t border-green-500/20 pt-4">
                {data.incomeTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma receita prevista para este mês.
                  </p>
                ) : (
                  data.incomeTransactions.map((transaction) => (
                    <TransactionItem key={transaction.id} transaction={transaction} type="income" />
                  ))
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Expenses Section */}
      <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen}>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-orange-500/5 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Despesas Previstas</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {data.expenseTransactions.length} lançamento{data.expenseTransactions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-orange-400">
                    -{formatCurrency(data.projectedExpenses)}
                  </span>
                  {expensesOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <div className="space-y-2 border-t border-orange-500/20 pt-4">
                {data.expenseTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma despesa prevista para este mês.
                  </p>
                ) : (
                  data.expenseTransactions.map((transaction) => (
                    <TransactionItem key={transaction.id} transaction={transaction} type="expense" />
                  ))
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Projected Balance Card */}
      <Card className={`${data.projectedBalance >= 0 ? 'bg-purple-500/10 border-purple-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${data.projectedBalance >= 0 ? 'bg-purple-500/20' : 'bg-destructive/20'}`}>
              <Scale className={`h-6 w-6 ${data.projectedBalance >= 0 ? 'text-purple-400' : 'text-destructive'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Saldo Previsto (final do mês)</p>
              <p className={`text-2xl font-bold ${data.projectedBalance >= 0 ? 'text-purple-400' : 'text-destructive'}`}>
                {formatCurrency(data.projectedBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Summary */}
      <Card className="bg-secondary/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            {formatCurrency(data.initialBalance)} + {formatCurrency(data.projectedIncome)} - {formatCurrency(data.projectedExpenses)} = {formatCurrency(data.projectedBalance)}
          </p>
        </CardContent>
      </Card>

      {/* Scenario Simulator */}
      <ScenarioSimulator 
        baseBalance={data.projectedBalance}
        projectedIncome={simulatorProjectedIncome}
        projectedExpenses={simulatorProjectedExpenses}
        initialBalance={data.initialBalance}
        simulatedInitialBalance={multiMonthData?.simulatedInitialBalance}
        simulatedProjectedBalance={multiMonthData?.simulatedProjectedBalance}
        originalProjectedBalance={multiMonthData?.originalProjectedBalance}
        scenarioImpactTotal={multiMonthData?.scenarioImpact}
        isSimulating={multiMonthData?.isSimulating}
        selectedDate={simulatorSelectedDate}
        onMonthChange={handleSimulatorMonthChange}
        scenarioBaseMonth={scenarioBaseMonth}
        scenarios={scenarios}
        onAddScenario={handleAddScenario}
        onRemoveScenario={handleRemoveScenario}
        onClearScenarios={handleClearScenarios}
      />
    </div>
  );
}

interface TransactionItemProps {
  transaction: ProjectionTransaction;
  type: 'income' | 'expense';
}

function TransactionItem({ transaction, type }: TransactionItemProps) {
  const isIncome = type === 'income';
  const colorClass = isIncome ? 'text-green-400' : 'text-orange-400';
  const bgClass = isIncome ? 'bg-green-500/5' : 'bg-orange-500/5';
  const borderClass = isIncome ? 'border-green-500/10' : 'border-orange-500/10';

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${bgClass} border ${borderClass}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{transaction.description}</span>
          {transaction.is_recurring && (
            <Badge variant="outline" className="text-xs gap-1 border-blue-500/50 text-blue-400 shrink-0">
              <RefreshCcw className="h-3 w-3" />
            </Badge>
          )}
          {transaction.status === 'pending' && (
            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400 shrink-0">
              Pendente
            </Badge>
          )}
        </div>
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>
            {format(new Date(transaction.due_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
          </span>
          {transaction.competency_date && transaction.competency_date !== transaction.due_date && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-purple-400 cursor-help">
                    Comp: {format(new Date(transaction.competency_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-black/90 backdrop-blur-xl border-white/10">
                  <p className="text-sm">Data de competência diferente do vencimento</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {transaction.category && <span>{transaction.category.name}</span>}
        </div>
      </div>
      <span className={`font-semibold ${colorClass} shrink-0 ml-2`}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}
