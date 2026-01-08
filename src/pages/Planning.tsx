import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useBudgets } from "@/hooks/useBudgets";
import { useSavingsGoals, SavingsGoal } from "@/hooks/useSavingsGoals";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useSavingsGoalAI } from "@/hooks/useSavingsGoalAI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, PiggyBank, Trash2, Edit2, Wallet, Calendar, TrendingUp, Minus, Sparkles, ClipboardList, RefreshCcw, Layers, Scale } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CategorySelector } from "@/components/forms/CategorySelector";
import { IconPicker } from "@/components/forms/IconPicker";
import { ColorPicker } from "@/components/forms/ColorPicker";
import { CurrencyField } from "@/components/forms/CurrencyField";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { SavingsGoalAIFeedback } from "@/components/planning/SavingsGoalAIFeedback";
import { SavingsGoalHistory } from "@/components/planning/SavingsGoalHistory";
import { SavingsGoalDetailSheet } from "@/components/planning/SavingsGoalDetailSheet";
import { RecurrencesTab } from "@/components/planning/RecurrencesTab";
import { InstallmentsTab } from "@/components/planning/InstallmentsTab";
import { ProjectionsTab } from "@/components/planning/ProjectionsTab";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Dynamic icon component
function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const iconName = name.split('-').map((part, i) => 
    i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.PiggyBank;
  return <IconComponent className={className} style={style} />;
}

export default function Planning() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'projections';
  
  const { budgets, isLoading: budgetsLoading, createBudget, updateBudget, deleteBudget } = useBudgets();
  const { savingsGoals, isLoading: goalsLoading, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, contribute, withdraw } = useSavingsGoals();
  const { getCategoriesByType, getCategoryPath } = useCategories();
  const { accounts } = useAccounts();
  const { getAIFeedback, feedback: aiFeedback, isLoading: aiLoading, error: aiError, clearFeedback } = useSavingsGoalAI();
  
  // Track which goal is showing AI feedback
  const [activeAIGoalId, setActiveAIGoalId] = useState<string | null>(null);
  
  // Budget form state
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [budgetCategoryId, setBudgetCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState<number>(0);

  // Savings goal form state
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalAccountId, setGoalAccountId] = useState<string | undefined>();
  const [goalIcon, setGoalIcon] = useState('piggy-bank');
  const [goalColor, setGoalColor] = useState('#10b981');
  const [goalDeadline, setGoalDeadline] = useState<Date | undefined>();

  // Contribute/withdraw dialog state
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState(0);
  const [contributeAccountId, setContributeAccountId] = useState('');
  const [isWithdraw, setIsWithdraw] = useState(false);

  // Detail sheet state
  const [detailGoal, setDetailGoal] = useState<SavingsGoal | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBudget) {
      await updateBudget.mutateAsync({
        id: editingBudget.id,
        amount: budgetAmount,
      });
    } else {
      await createBudget.mutateAsync({
        category_id: budgetCategoryId,
        amount: budgetAmount,
        period: 'monthly',
      });
    }
    
    setBudgetOpen(false);
    resetBudgetForm();
  };

  const resetBudgetForm = () => {
    setBudgetCategoryId('');
    setBudgetAmount(0);
    setEditingBudget(null);
  };

  const handleBudgetEdit = (budget: any) => {
    setEditingBudget(budget);
    setBudgetCategoryId(budget.category_id);
    setBudgetAmount(budget.amount);
    setBudgetOpen(true);
  };

  const handleBudgetDelete = async (id: string) => {
    await deleteBudget.mutateAsync(id);
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingGoal) {
      await updateSavingsGoal.mutateAsync({
        id: editingGoal.id,
        name: goalName,
        description: goalDescription || undefined,
        target_amount: parseFloat(goalTarget) || 0,
        icon: goalIcon,
        color: goalColor,
        deadline: goalDeadline ? format(goalDeadline, 'yyyy-MM-dd') : null,
      });
    } else {
      await createSavingsGoal.mutateAsync({
        name: goalName,
        description: goalDescription || undefined,
        target_amount: goalTarget ? parseFloat(goalTarget) : undefined,
        icon: goalIcon,
        color: goalColor,
        deadline: goalDeadline ? format(goalDeadline, 'yyyy-MM-dd') : undefined,
        parent_account_id: goalAccountId || undefined,
      });
    }
    
    setGoalOpen(false);
    resetGoalForm();
  };

  const resetGoalForm = () => {
    setGoalName('');
    setGoalDescription('');
    setGoalTarget('');
    setGoalAccountId(undefined);
    setGoalIcon('piggy-bank');
    setGoalColor('#10b981');
    setGoalDeadline(undefined);
    setEditingGoal(null);
  };

  const handleGoalEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalDescription(goal.description || '');
    setGoalTarget(goal.target_amount?.toString() || '');
    setGoalIcon(goal.icon);
    setGoalColor(goal.color);
    setGoalDeadline(goal.deadline ? new Date(goal.deadline) : undefined);
    setGoalOpen(true);
  };

  const handleGoalDelete = async (id: string) => {
    await deleteSavingsGoal.mutateAsync(id);
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;

    const amount = contributeAmount;
    if (amount <= 0) return;

    if (isWithdraw && amount > contributeGoal.current_amount) {
      return;
    }

    const accountId = contributeAccountId || undefined;
    const goalId = contributeGoal.id;
    const goalToAnalyze = contributeGoal;

    if (isWithdraw) {
      await withdraw.mutateAsync({ id: goalId, amount, accountId });
    } else {
      await contribute.mutateAsync({ id: goalId, amount, accountId });
    }

    // Close dialog first
    setContributeOpen(false);
    setContributeGoal(null);
    setContributeAmount(0);
    setContributeAccountId('');
    setIsWithdraw(false);

    // Trigger AI feedback with updated goal data
    setActiveAIGoalId(goalId);
    const updatedGoal = {
      ...goalToAnalyze,
      current_amount: isWithdraw 
        ? goalToAnalyze.current_amount - amount 
        : goalToAnalyze.current_amount + amount,
    };
    await getAIFeedback(updatedGoal, isWithdraw ? 'withdrawal' : 'contribution', amount);
  };

  const openContributeDialog = (goal: SavingsGoal, withdraw = false) => {
    setContributeGoal(goal);
    setIsWithdraw(withdraw);
    setContributeOpen(true);
  };

  const handleRequestAIAnalysis = async (goal: SavingsGoal) => {
    setActiveAIGoalId(goal.id);
    await getAIFeedback(goal, 'status');
  };

  const handleCloseAIFeedback = () => {
    setActiveAIGoalId(null);
    clearFeedback();
  };

  const handleGoalClick = (goal: SavingsGoal) => {
    setDetailGoal(goal);
    setDetailSheetOpen(true);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <PageHeader
        title="Planejamento"
        description="Orçamentos e metas de poupança"
        icon={ClipboardList}
      />

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="flex w-full max-w-3xl overflow-x-auto h-auto">
            <TabsTrigger value="projections" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-3">
              <Scale className="h-4 w-4" />
              <span>Projeções</span>
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-3">
              <Wallet className="h-4 w-4" />
              <span>Orçamentos</span>
            </TabsTrigger>
            <TabsTrigger value="savings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-3">
              <PiggyBank className="h-4 w-4" />
              <span>Cofrinhos</span>
            </TabsTrigger>
            <TabsTrigger value="recurrences" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-3">
              <RefreshCcw className="h-4 w-4" />
              <span>Recorrências</span>
            </TabsTrigger>
            <TabsTrigger value="installments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-3">
              <Layers className="h-4 w-4" />
              <span>Parcelas</span>
            </TabsTrigger>
          </TabsList>

          {/* Projeções Tab */}
          <TabsContent value="projections" className="space-y-6">
            <ProjectionsTab />
          </TabsContent>

          {/* Orçamentos Tab */}
          <TabsContent value="budgets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Orçamentos</h2>
                <p className="text-muted-foreground">Defina limites de gastos por categoria</p>
              </div>
              <Dialog open={budgetOpen} onOpenChange={(v) => { setBudgetOpen(v); if (!v) resetBudgetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Novo Orçamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBudgetSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <CategorySelector
                        value={budgetCategoryId}
                        onChange={setBudgetCategoryId}
                        type="expense"
                        placeholder="Selecione uma categoria"
                      />
                      {budgetCategoryId && (
                        <p className="text-xs text-muted-foreground">
                          {getCategoryPath(budgetCategoryId)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget-amount">Limite mensal</Label>
                      <CurrencyField
                        id="budget-amount"
                        value={budgetAmount}
                        onChange={setBudgetAmount}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={createBudget.isPending || updateBudget.isPending}>
                      {createBudget.isPending || updateBudget.isPending ? 'Salvando...' : editingBudget ? 'Atualizar' : 'Criar Orçamento'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {budgetsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Nenhum orçamento definido</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie orçamentos para acompanhar seus gastos por categoria
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {budgets.map((budget: any) => {
                  const percentage = Math.min((budget.spent / budget.amount) * 100, 100);
                  const isOverBudget = budget.spent > budget.amount;
                  const categoryPath = budget.category_id ? getCategoryPath(budget.category_id) : '';
                  
                  return (
                    <Card key={budget.id} className="glass">
                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: budget.category?.color || '#6366f1' }}
                            />
                            <CardTitle className="text-base truncate">{budget.category?.name || 'Categoria'}</CardTitle>
                          </div>
                          {categoryPath && categoryPath !== budget.category?.name && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{categoryPath}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleBudgetEdit(budget)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleBudgetDelete(budget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className={isOverBudget ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                            {formatCurrency(budget.spent)}
                          </span>
                          <span className="text-muted-foreground">
                            de {formatCurrency(budget.amount)}
                          </span>
                        </div>
                        <Progress
                          value={percentage}
                          className="h-3"
                          style={{
                            '--progress-color': isOverBudget ? 'hsl(var(--destructive))' : budget.category?.color || 'hsl(var(--primary))'
                          } as React.CSSProperties}
                        />
                        <div className="text-right">
                          <span className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : 'text-success'}`}>
                            {isOverBudget
                              ? `Excedido em ${formatCurrency(budget.spent - budget.amount)}`
                              : `Restam ${formatCurrency(budget.amount - budget.spent)}`}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Cofrinhos Tab */}
          <TabsContent value="savings" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Cofrinhos</h2>
                <p className="text-muted-foreground">Planeje suas metas de poupança</p>
              </div>
              <Dialog open={goalOpen} onOpenChange={(v) => { setGoalOpen(v); if (!v) resetGoalForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Novo Cofrinho
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5" />
                      {editingGoal ? 'Editar Cofrinho' : 'Novo Cofrinho'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleGoalSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="goal-name">Nome</Label>
                      <Input
                        id="goal-name"
                        placeholder="Ex: Viagem para Europa"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="goal-description">Descrição (opcional)</Label>
                      <Textarea
                        id="goal-description"
                        placeholder="Descreva sua meta..."
                        value={goalDescription}
                        onChange={(e) => setGoalDescription(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Valor da meta (opcional)</Label>
                      <CurrencyField
                        value={goalTarget ? parseFloat(goalTarget) : 0}
                        onChange={(value) => setGoalTarget(value > 0 ? value.toString() : '')}
                        placeholder="R$ 0,00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Cofrinhos sem meta servem para reservar dinheiro sem um objetivo específico
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Conta vinculada (opcional)</Label>
                      <Select value={goalAccountId || '__none__'} onValueChange={(v) => setGoalAccountId(v === '__none__' ? undefined : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma conta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma conta</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                {account.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Vincule a uma conta para que o cofrinho seja tratado como uma reserva dentro dela
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ícone</Label>
                        <IconPicker value={goalIcon} onChange={setGoalIcon} />
                      </div>
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <ColorPicker value={goalColor} onChange={setGoalColor} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Prazo (opcional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !goalDeadline && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {goalDeadline ? format(goalDeadline, "PPP", { locale: ptBR }) : "Selecione uma data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={goalDeadline}
                            onSelect={setGoalDeadline}
                            initialFocus
                            className="p-3 pointer-events-auto"
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      {goalDeadline && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setGoalDeadline(undefined)}
                        >
                          Remover prazo
                        </Button>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={createSavingsGoal.isPending || updateSavingsGoal.isPending}>
                      {createSavingsGoal.isPending || updateSavingsGoal.isPending ? 'Salvando...' : editingGoal ? 'Atualizar' : 'Criar Cofrinho'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {goalsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : savingsGoals.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Nenhum cofrinho criado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie cofrinhos para planejar viagens, compras e outras metas
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savingsGoals.map((goal) => {
                  const hasTarget = goal.target_amount && goal.target_amount > 0;
                  const percentage = hasTarget ? Math.min((goal.current_amount / goal.target_amount!) * 100, 100) : 0;
                  const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
                  const linkedAccount = goal.parent_account_id ? accounts.find(a => a.id === goal.parent_account_id) : null;
                  
                  return (
                    <Card 
                      key={goal.id} 
                      className={cn(
                        "glass cursor-pointer transition-all hover:ring-2 hover:ring-primary/20", 
                        goal.is_completed && "border-success/50"
                      )}
                      onClick={() => handleGoalClick(goal)}
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: goal.color + '20' }}
                          >
                            <DynamicIcon name={goal.icon} className="h-5 w-5" style={{ color: goal.color }} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{goal.name}</CardTitle>
                            {goal.is_completed && (
                              <span className="text-xs text-success font-medium">✓ Meta atingida!</span>
                            )}
                            {linkedAccount && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Wallet className="h-3 w-3" />
                                {linkedAccount.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleGoalEdit(goal)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cofrinho?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O valor guardado não será transferido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleGoalDelete(goal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {goal.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold" style={{ color: goal.color }}>
                            {formatCurrency(goal.current_amount)}
                          </span>
                          {hasTarget && (
                            <span className="text-muted-foreground">
                              de {formatCurrency(goal.target_amount!)}
                            </span>
                          )}
                          {!hasTarget && (
                            <span className="text-muted-foreground text-xs">
                              Sem meta definida
                            </span>
                          )}
                        </div>
                        
                        {hasTarget && (
                          <Progress
                            value={percentage}
                            className="h-3"
                            style={{
                              '--progress-color': goal.color
                            } as React.CSSProperties}
                          />
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          {hasTarget && (
                            <span className="text-muted-foreground">
                              {percentage.toFixed(0)}% completo
                            </span>
                          )}
                          {daysLeft !== null && daysLeft > 0 && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {daysLeft} dias restantes
                            </span>
                          )}
                          {daysLeft !== null && daysLeft <= 0 && !goal.is_completed && (
                            <span className="text-destructive text-xs font-medium">Prazo vencido</span>
                          )}
                        </div>

                        {/* Savings Goal History */}
                        <SavingsGoalHistory goalId={goal.id} goalColor={goal.color} />

                        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openContributeDialog(goal, false)}
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Depositar
                          </Button>
                          {goal.current_amount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openContributeDialog(goal, true)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestAIAnalysis(goal)}
                            disabled={aiLoading && activeAIGoalId === goal.id}
                          >
                            <Sparkles className="h-4 w-4" style={{ color: goal.color }} />
                          </Button>
                        </div>

                        {/* AI Feedback */}
                        {activeAIGoalId === goal.id && (
                          <div className="mt-3">
                            <SavingsGoalAIFeedback
                              feedback={aiFeedback}
                              isLoading={aiLoading}
                              error={aiError}
                              onRefresh={() => getAIFeedback(goal, 'status')}
                              onClose={handleCloseAIFeedback}
                              goalColor={goal.color}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Recorrências Tab */}
          <TabsContent value="recurrences" className="space-y-6">
            <RecurrencesTab />
          </TabsContent>

          {/* Parcelamentos Tab */}
          <TabsContent value="installments" className="space-y-6">
            <InstallmentsTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Contribute/Withdraw Dialog */}
      <Dialog open={contributeOpen} onOpenChange={(v) => { setContributeOpen(v); if (!v) { setContributeGoal(null); setContributeAmount(0); setContributeAccountId(''); setIsWithdraw(false); } }}>
        <DialogContent className="sm:max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isWithdraw ? <Minus className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
              {isWithdraw ? 'Retirar do Cofrinho' : 'Depositar no Cofrinho'}
            </DialogTitle>
          </DialogHeader>
          {contributeGoal && (
            <form onSubmit={handleContribute} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: contributeGoal.color + '20' }}
                >
                  <DynamicIcon name={contributeGoal.icon} className="h-5 w-5" style={{ color: contributeGoal.color }} />
                </div>
                <div>
                  <p className="font-medium">{contributeGoal.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Saldo atual: {formatCurrency(contributeGoal.current_amount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contribute-amount">Valor</Label>
                <CurrencyField
                  id="contribute-amount"
                  value={contributeAmount}
                  onChange={setContributeAmount}
                  placeholder="R$ 0,00"
                  required
                />
                {isWithdraw && contributeAmount > contributeGoal.current_amount && (
                  <p className="text-xs text-destructive">
                    O valor não pode exceder o saldo atual do cofrinho
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{isWithdraw ? 'Conta de destino (opcional)' : 'Conta de origem (opcional)'}</Label>
                <Select value={contributeAccountId || "none"} onValueChange={(v) => setContributeAccountId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem movimentação de conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem movimentação de conta</SelectItem>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isWithdraw 
                    ? 'Se selecionada, uma receita será criada nesta conta'
                    : 'Se selecionada, uma despesa será criada nesta conta'
                  }
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={contribute.isPending || withdraw.isPending}
                variant={isWithdraw ? "destructive" : "default"}
              >
                {contribute.isPending || withdraw.isPending ? 'Processando...' : isWithdraw ? 'Retirar' : 'Depositar'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Savings Goal Detail Sheet */}
      <SavingsGoalDetailSheet
        goal={detailGoal}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onDeposit={(goal) => {
          setDetailSheetOpen(false);
          openContributeDialog(goal, false);
        }}
        onWithdraw={(goal) => {
          setDetailSheetOpen(false);
          openContributeDialog(goal, true);
        }}
        onEdit={(goal) => {
          setDetailSheetOpen(false);
          handleGoalEdit(goal);
        }}
        onDelete={handleGoalDelete}
      />
    </div>
  );
}
