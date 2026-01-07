import { useState } from "react";
import { useRecurrences } from "@/hooks/useRecurrences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySelector } from "@/components/forms/CategorySelector";
import { CurrencyField } from "@/components/forms/CurrencyField";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { RefreshCcw, Plus, Trash2, Edit2, TrendingDown, TrendingUp, Pause, Play, Calendar, CreditCard } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Recurrence, FrequencyType, CreateRecurrenceInput } from "@/types/financial";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function addIntervalByFrequency(date: Date, frequency: FrequencyType, intervals: number = 1): Date {
  switch (frequency) {
    case 'daily': return addDays(date, intervals);
    case 'weekly': return addWeeks(date, intervals);
    case 'biweekly': return addWeeks(date, intervals * 2);
    case 'monthly': return addMonths(date, intervals);
    case 'yearly': return addYears(date, intervals);
    default: return addMonths(date, intervals);
  }
}

export function RecurrencesTab() {
  const { recurrences, isLoading, createRecurrence, updateRecurrence, deleteRecurrence, toggleActive } = useRecurrences();
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecurrence, setEditingRecurrence] = useState<Recurrence | null>(null);
  
  // Form state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<FrequencyType>('monthly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');

  const resetForm = () => {
    setType('expense');
    setDescription('');
    setAmount(0);
    setFrequency('monthly');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setPaymentMethod('account');
    setAccountId('');
    setCreditCardId('');
    setEditingRecurrence(null);
  };

  const handleOpenEdit = (recurrence: Recurrence) => {
    setEditingRecurrence(recurrence);
    setType(recurrence.type);
    setDescription(recurrence.description);
    setAmount(recurrence.amount);
    setFrequency(recurrence.frequency);
    setStartDate(recurrence.start_date);
    setCategoryId(recurrence.category_id || '');
    setPaymentMethod(recurrence.credit_card_id ? 'credit_card' : 'account');
    setAccountId(recurrence.account_id || '');
    setCreditCardId(recurrence.credit_card_id || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: CreateRecurrenceInput = {
      type,
      description,
      amount: amount || 0,
      frequency,
      start_date: startDate,
      category_id: categoryId || undefined,
      account_id: paymentMethod === 'account' ? (accountId || undefined) : undefined,
      credit_card_id: paymentMethod === 'credit_card' ? (creditCardId || undefined) : undefined,
    };

    if (editingRecurrence) {
      await updateRecurrence.mutateAsync({ id: editingRecurrence.id, ...data });
    } else {
      await createRecurrence.mutateAsync(data);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteRecurrence.mutateAsync(id);
  };

  const handleToggleActive = async (recurrence: Recurrence) => {
    await toggleActive.mutateAsync({ id: recurrence.id, is_active: !recurrence.is_active });
  };

  // Separate income and expense recurrences
  const expenseRecurrences = recurrences.filter(r => r.type === 'expense');
  const incomeRecurrences = recurrences.filter(r => r.type === 'income');

  const renderRecurrenceCard = (recurrence: Recurrence) => {
    const isExpense = recurrence.type === 'expense';
    const today = new Date();
    const startDate = new Date(recurrence.start_date + 'T12:00:00');
    
    // Use start_date if it's in the future, otherwise use next_occurrence
    const baseDate = startDate > today 
      ? startDate 
      : new Date((recurrence.next_occurrence || recurrence.start_date) + 'T12:00:00');
    
    const nextDates = [0, 1, 2].map(i => 
      addIntervalByFrequency(baseDate, recurrence.frequency, i)
    );

    return (
      <Card key={recurrence.id} className={`glass ${!recurrence.is_active ? 'opacity-60' : ''}`}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${isExpense ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {isExpense ? (
                <TrendingDown className="h-4 w-4 text-red-400" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{recurrence.description}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {FREQUENCY_LABELS[recurrence.frequency] || recurrence.frequency}
                </Badge>
                {recurrence.category && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: recurrence.category.color || '#6366f1' }} 
                    />
                    {recurrence.category.name}
                  </Badge>
                )}
                {!recurrence.is_active && (
                  <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/50">
                    <Pause className="h-3 w-3 mr-1" /> Pausada
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className={`text-lg font-bold ${isExpense ? 'text-red-400' : 'text-green-400'}`}>
            {isExpense ? '-' : '+'}{formatCurrency(recurrence.amount)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Payment method */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {recurrence.credit_card ? (
              <>
                <CreditCard className="h-4 w-4" />
                <span>{recurrence.credit_card.name}</span>
              </>
            ) : recurrence.account ? (
              <>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: recurrence.account.color || '#6366f1' }} />
                <span>{recurrence.account.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground/50">Sem conta definida</span>
            )}
          </div>

          {/* Next occurrences */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Próximos lançamentos:
            </p>
            <div className="flex flex-wrap gap-1">
              {nextDates.map((date, i) => (
                <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded">
                  {format(date, "dd/MM/yy", { locale: ptBR })}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={recurrence.is_active}
                onCheckedChange={() => handleToggleActive(recurrence)}
              />
              <span className="text-xs text-muted-foreground">
                {recurrence.is_active ? 'Ativa' : 'Pausada'}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(recurrence)}>
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
                    <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A recorrência "{recurrence.description}" será permanentemente removida.
                      <br /><br />
                      <strong>Nota:</strong> As transações já geradas por esta recorrência não serão excluídas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(recurrence.id)} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recorrências</h2>
          <p className="text-muted-foreground">Gerencie despesas e receitas recorrentes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova Recorrência
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCcw className="h-5 w-5" />
                {editingRecurrence ? 'Editar Recorrência' : 'Nova Recorrência'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type */}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Tabs value={type} onValueChange={(v) => setType(v as 'expense' | 'income')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expense" className="gap-2">
                      <TrendingDown className="h-4 w-4" /> Despesa
                    </TabsTrigger>
                    <TabsTrigger value="income" className="gap-2">
                      <TrendingUp className="h-4 w-4" /> Receita
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Ex: Aluguel, Salário, Netflix..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Amount and Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <CurrencyField
                    value={amount}
                    onChange={setAmount}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as FrequencyType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start-date">Data do primeiro lançamento</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria</Label>
                <CategorySelector
                  value={categoryId}
                  onChange={setCategoryId}
                  type={type}
                  placeholder="Selecione uma categoria"
                />
              </div>

              {/* Payment Method (only for expenses) */}
              {type === 'expense' && (
                <>
                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'account' | 'credit_card')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="account">Conta/Carteira</TabsTrigger>
                        <TabsTrigger value="credit_card" className="gap-2">
                          <CreditCard className="h-3 w-3" /> Cartão
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {paymentMethod === 'account' && (
                    <div className="space-y-2">
                      <Label>Conta</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma conta" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#6366f1' }} />
                                {acc.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {paymentMethod === 'credit_card' && (
                    <div className="space-y-2">
                      <Label>Cartão de Crédito</Label>
                      <Select value={creditCardId} onValueChange={setCreditCardId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cartão" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {creditCards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color || '#ec4899' }} />
                                {card.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Account for income */}
              {type === 'income' && (
                <div className="space-y-2">
                  <Label>Conta de destino</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#6366f1' }} />
                            {acc.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createRecurrence.isPending || updateRecurrence.isPending}
              >
                {createRecurrence.isPending || updateRecurrence.isPending 
                  ? 'Salvando...' 
                  : editingRecurrence ? 'Atualizar' : 'Criar Recorrência'
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : recurrences.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <RefreshCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Nenhuma recorrência cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Crie recorrências para automatizar seus lançamentos mensais
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Expense Recurrences */}
          {expenseRecurrences.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-400" />
                Despesas Recorrentes ({expenseRecurrences.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {expenseRecurrences.map(renderRecurrenceCard)}
              </div>
            </div>
          )}

          {/* Income Recurrences */}
          {incomeRecurrences.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Receitas Recorrentes ({incomeRecurrences.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {incomeRecurrences.map(renderRecurrenceCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
