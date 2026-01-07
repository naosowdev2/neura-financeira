import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PiggyBank, ArrowRight, Calendar, Plus, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";
import * as LucideIcons from "lucide-react";
import { SavingsGoal, useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useAccounts } from "@/hooks/useAccounts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const iconName = name.split('-').map((part) => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.PiggyBank;
  return <IconComponent className={className} style={style} />;
}

interface SavingsGoalsListProps {
  savingsGoals: SavingsGoal[];
}

type ActionType = 'deposit' | 'withdraw';

export function SavingsGoalsList({ savingsGoals }: SavingsGoalsListProps) {
  const activeGoals = savingsGoals.filter(g => !g.is_completed).slice(0, 3);
  const { accounts } = useAccounts();
  const { contribute, withdraw } = useSavingsGoals();
  
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType>('deposit');
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string>("");

  const handleOpenAction = (goal: SavingsGoal, type: ActionType) => {
    setActiveGoalId(goal.id);
    setActionType(type);
    setAmount("");
    setAccountId(goal.parent_account_id || "");
  };

  const handleCloseAction = () => {
    setActiveGoalId(null);
    setAmount("");
    setAccountId("");
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (!activeGoalId || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!accountId) {
      toast.error("Selecione uma conta");
      return;
    }

    const goal = savingsGoals.find(g => g.id === activeGoalId);
    if (actionType === 'withdraw' && goal && parsedAmount > goal.current_amount) {
      toast.error("Valor maior que o saldo do cofrinho");
      return;
    }

    try {
      if (actionType === 'deposit') {
        await contribute.mutateAsync({ 
          id: activeGoalId, 
          amount: parsedAmount,
          accountId
        });
      } else {
        await withdraw.mutateAsync({ 
          id: activeGoalId, 
          amount: parsedAmount,
          accountId
        });
      }
      handleCloseAction();
    } catch (error: any) {
      toast.error(error.message || `Erro ao ${actionType === 'deposit' ? 'depositar' : 'resgatar'}`);
    }
  };

  const isPending = contribute.isPending || withdraw.isPending;

  return (
    <Card className="glass card-interactive card-hover-green">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Cofrinhos
        </CardTitle>
        <Link to="/planning?tab=savings">
          <Button variant="ghost" size="sm">
            Ver todos <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeGoals.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <PiggyBank className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum cofrinho ativo</p>
            <Link to="/planning?tab=savings">
              <Button variant="link" size="sm" className="mt-2">
                Criar cofrinho
              </Button>
            </Link>
          </div>
        ) : (
          activeGoals.map((goal) => {
            const hasTarget = goal.target_amount && goal.target_amount > 0;
            const percentage = hasTarget 
              ? Math.min((goal.current_amount / goal.target_amount!) * 100, 100) 
              : 0;
            const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
            const isActive = activeGoalId === goal.id;
            
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: goal.color + '20' }}
                    >
                      <DynamicIcon name={goal.icon || 'piggy-bank'} className="h-4 w-4" style={{ color: goal.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(goal.current_amount)}
                        {hasTarget && ` / ${formatCurrency(goal.target_amount!)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-right mr-1">
                      {hasTarget && (
                        <p className="text-sm font-semibold" style={{ color: goal.color }}>
                          {percentage.toFixed(0)}%
                        </p>
                      )}
                      {daysLeft !== null && daysLeft > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {daysLeft}d
                        </p>
                      )}
                    </div>
                    
                    {/* Withdraw Button */}
                    <Popover open={isActive && actionType === 'withdraw'} onOpenChange={(open) => {
                      if (open) handleOpenAction(goal, 'withdraw');
                      else handleCloseAction();
                    }}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 hover:bg-destructive/10"
                          disabled={goal.current_amount <= 0}
                        >
                          <Minus className="h-4 w-4 text-destructive" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 z-[10000] bg-popover" align="end">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Resgatar de {goal.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Disponível: {formatCurrency(goal.current_amount)}
                          </p>
                          <div className="space-y-2">
                            <Label className="text-xs">Valor</Label>
                            <Input
                              type="text"
                              placeholder="R$ 0,00"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Conta destino</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent className="z-[10000]" position="popper">
                                {accounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-8"
                              onClick={handleCloseAction}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="flex-1 h-8"
                              onClick={handleSubmit}
                              disabled={isPending}
                            >
                              {isPending ? "..." : "Resgatar"}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Deposit Button */}
                    <Popover open={isActive && actionType === 'deposit'} onOpenChange={(open) => {
                      if (open) handleOpenAction(goal, 'deposit');
                      else handleCloseAction();
                    }}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 hover:bg-primary/10"
                          style={{ color: goal.color }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 z-[10000] bg-popover" align="end">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Depositar em {goal.name}</h4>
                          <div className="space-y-2">
                            <Label className="text-xs">Valor</Label>
                            <Input
                              type="text"
                              placeholder="R$ 0,00"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Conta de origem</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent className="z-[10000]" position="popper">
                                {accounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-8"
                              onClick={handleCloseAction}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 h-8"
                              onClick={handleSubmit}
                              disabled={isPending}
                            >
                              {isPending ? "..." : "Confirmar"}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {hasTarget && (
                  <Progress
                    value={percentage}
                    className="h-2"
                    style={{
                      '--progress-color': goal.color
                    } as React.CSSProperties}
                  />
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
