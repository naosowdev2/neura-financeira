import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FlaskConical, 
  Plus, 
  Minus, 
  X, 
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info
} from "lucide-react";
import { format, addMonths, subMonths, isSameMonth, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AddScenarioDialog, ScenarioItem, ScenarioType } from "./AddScenarioDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface ScenarioSimulatorProps {
  // Data from main projections tab
  baseBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  initialBalance: number;
  // Multi-month simulation data
  simulatedInitialBalance?: number;
  simulatedProjectedBalance?: number;
  originalProjectedBalance?: number;
  scenarioImpactTotal?: number;
  isSimulating?: boolean;
  // Month navigation
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
  scenarioBaseMonth: Date | null;
  // Scenario management (elevated state)
  scenarios: ScenarioItem[];
  onAddScenario: (scenario: ScenarioItem) => void;
  onRemoveScenario: (id: string) => void;
  onClearScenarios: () => void;
}

export function ScenarioSimulator({ 
  baseBalance,
  projectedIncome,
  projectedExpenses,
  initialBalance,
  simulatedInitialBalance,
  simulatedProjectedBalance,
  originalProjectedBalance,
  scenarioImpactTotal = 0,
  isSimulating = false,
  selectedDate,
  onMonthChange,
  scenarioBaseMonth,
  scenarios,
  onAddScenario,
  onRemoveScenario,
  onClearScenarios,
}: ScenarioSimulatorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<ScenarioType>('income');

  const openDialog = (type: ScenarioType) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  // Calculate impact for this simulator's display
  const totalIncome = scenarios
    .filter(s => s.type === 'income')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const totalExpenses = scenarios
    .filter(s => s.type === 'expense')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const totalImpact = totalIncome - totalExpenses;
  
  const hasScenarios = scenarios.length > 0;

  // Month navigation
  const handlePreviousMonth = () => {
    // Don't go before the scenario base month
    if (scenarioBaseMonth && isSameMonth(selectedDate, scenarioBaseMonth)) {
      return;
    }
    onMonthChange(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(selectedDate, 1));
  };

  const monthName = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  
  const isAtBaseMonth = scenarioBaseMonth && isSameMonth(selectedDate, scenarioBaseMonth);
  const canGoBack = !scenarioBaseMonth || !isSameMonth(selectedDate, scenarioBaseMonth);

  // Calculate display values
  const displayInitialBalance = isSimulating && simulatedInitialBalance !== undefined 
    ? simulatedInitialBalance 
    : initialBalance;
  
  const displayFinalBalance = isSimulating && simulatedProjectedBalance !== undefined
    ? simulatedProjectedBalance
    : baseBalance + totalImpact;

  const originalFinalBalance = originalProjectedBalance ?? baseBalance;

  return (
    <>
      <Card className="bg-violet-500/10 border-violet-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base">Simulador de Cenários</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Teste impactos hipotéticos no seu saldo
                </p>
              </div>
            </div>
            {hasScenarios && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearScenarios}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Month Navigator - only visible when simulating */}
          {hasScenarios && (
            <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
              <div className="flex items-center justify-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePreviousMonth}
                  disabled={!canGoBack}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {capitalizedMonth}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNextMonth}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {scenarioBaseMonth && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Cenários aplicados desde {format(scenarioBaseMonth, "MMM/yy", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {/* Add Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              onClick={() => openDialog('income')}
            >
              <Plus className="h-4 w-4" />
              Receita Hipotética
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
              onClick={() => openDialog('expense')}
            >
              <Minus className="h-4 w-4" />
              Despesa Hipotética
            </Button>
          </div>

          {/* Scenarios List */}
          {hasScenarios && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Cenários Recorrentes
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px]">
                        Estes cenários se repetem em cada mês projetado
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {scenarios.length}
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {scenarios.map((scenario) => (
                  <ScenarioListItem 
                    key={scenario.id} 
                    scenario={scenario} 
                    onRemove={onRemoveScenario}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Impact Summary */}
          {hasScenarios && (
            <div className="space-y-3 pt-2 border-t border-violet-500/20">
              {/* Month Breakdown */}
              <div className="space-y-2 p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo Inicial (simulado):</span>
                  <span className={displayInitialBalance >= 0 ? '' : 'text-destructive'}>
                    {formatCurrency(displayInitialBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">+ Receitas Previstas:</span>
                  <span className="text-green-400">+{formatCurrency(projectedIncome)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">- Despesas Previstas:</span>
                  <span className="text-orange-400">-{formatCurrency(projectedExpenses)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">+ Impacto dos Cenários:</span>
                  <span className={totalImpact >= 0 ? 'text-green-400' : 'text-orange-400'}>
                    {totalImpact >= 0 ? '+' : ''}{formatCurrency(totalImpact)}
                  </span>
                </div>
                <div className="border-t border-border/50 pt-2 mt-2">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Saldo Final Simulado:</span>
                    <span className={displayFinalBalance >= 0 ? 'text-violet-400' : 'text-destructive'}>
                      {formatCurrency(displayFinalBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className={`font-semibold ${originalFinalBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(originalFinalBalance)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Simulado</p>
                    <p className={`font-bold text-lg ${displayFinalBalance >= 0 ? 'text-violet-400' : 'text-destructive'}`}>
                      {formatCurrency(displayFinalBalance)}
                    </p>
                  </div>
                </div>
                
                <div className="text-center mt-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      displayFinalBalance - originalFinalBalance >= 0 
                        ? 'border-green-500/50 text-green-400' 
                        : 'border-orange-500/50 text-orange-400'
                    }`}
                  >
                    {displayFinalBalance - originalFinalBalance >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(displayFinalBalance - originalFinalBalance))}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasScenarios && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Adicione receitas ou despesas hipotéticas para simular cenários.
            </p>
          )}
        </CardContent>
      </Card>

      <AddScenarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={onAddScenario}
        initialType={dialogType}
      />
    </>
  );
}

interface ScenarioListItemProps {
  scenario: ScenarioItem;
  onRemove: (id: string) => void;
}

function ScenarioListItem({ scenario, onRemove }: ScenarioListItemProps) {
  const isIncome = scenario.type === 'income';
  
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${
      isIncome ? 'bg-green-500/5 border border-green-500/20' : 'bg-orange-500/5 border border-orange-500/20'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        {isIncome ? (
          <TrendingUp className="h-4 w-4 text-green-400 shrink-0" />
        ) : (
          <TrendingDown className="h-4 w-4 text-orange-400 shrink-0" />
        )}
        <span className="text-sm truncate">{scenario.description}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-medium text-sm ${isIncome ? 'text-green-400' : 'text-orange-400'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(scenario.amount)}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(scenario.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
