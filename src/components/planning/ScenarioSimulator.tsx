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
  ArrowRight
} from "lucide-react";
import { AddScenarioDialog, ScenarioItem, ScenarioType } from "./AddScenarioDialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface ScenarioSimulatorProps {
  baseBalance: number;
  onMonthChange?: () => void;
}

export function ScenarioSimulator({ baseBalance }: ScenarioSimulatorProps) {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<ScenarioType>('income');

  const handleAddScenario = (scenario: ScenarioItem) => {
    setScenarios(prev => [...prev, scenario]);
  };

  const handleRemoveScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const handleClearAll = () => {
    setScenarios([]);
  };

  const openDialog = (type: ScenarioType) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  // Calculate impact
  const totalIncome = scenarios
    .filter(s => s.type === 'income')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const totalExpenses = scenarios
    .filter(s => s.type === 'expense')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const totalImpact = totalIncome - totalExpenses;
  const simulatedBalance = baseBalance + totalImpact;

  const hasScenarios = scenarios.length > 0;

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
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Base Balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-sm text-muted-foreground">Saldo base do mês:</span>
            <span className={`font-semibold ${baseBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(baseBalance)}
            </span>
          </div>

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
                <span className="text-sm font-medium text-muted-foreground">
                  Cenários Adicionados
                </span>
                <Badge variant="secondary" className="text-xs">
                  {scenarios.length}
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {scenarios.map((scenario) => (
                  <ScenarioListItem 
                    key={scenario.id} 
                    scenario={scenario} 
                    onRemove={handleRemoveScenario}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Impact Summary */}
          {hasScenarios && (
            <div className="space-y-3 pt-2 border-t border-violet-500/20">
              {/* Total Impact */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <span className="text-sm text-muted-foreground">Impacto Total:</span>
                <span className={`font-semibold ${totalImpact >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                  {totalImpact >= 0 ? '+' : ''}{formatCurrency(totalImpact)}
                </span>
              </div>

              {/* Comparison */}
              <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className={`font-semibold ${baseBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(baseBalance)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Simulado</p>
                    <p className={`font-bold text-lg ${simulatedBalance >= 0 ? 'text-violet-400' : 'text-destructive'}`}>
                      {formatCurrency(simulatedBalance)}
                    </p>
                  </div>
                </div>
                
                <div className="text-center mt-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${totalImpact >= 0 ? 'border-green-500/50 text-green-400' : 'border-orange-500/50 text-orange-400'}`}
                  >
                    {totalImpact >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(totalImpact))}
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
        onAdd={handleAddScenario}
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
