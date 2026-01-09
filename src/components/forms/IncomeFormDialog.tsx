import { useState, useEffect, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useAICategorize } from "@/hooks/useAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, RefreshCcw, Sparkles, Loader2, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { CategorySelector } from "./CategorySelector";
import { CurrencyField } from "./CurrencyField";
import type { FrequencyType } from "@/types/financial";

interface Props {
  trigger?: React.ReactNode;
}

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

export function IncomeFormDialog({ trigger }: Props) {
  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { createRecurrence } = useRecurrences();
  const { suggestCategory, isLoading: isAISuggesting } = useAICategorize();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('monthly');
  const [aiSuggested, setAiSuggested] = useState(false);
  const [status, setStatus] = useState<'confirmed' | 'pending'>('confirmed');

  const incomeCategories = useMemo(() => 
    categories.filter(c => c.type === 'income'),
    [categories]
  );

  // Auto-categorization with AI
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (description.length >= 3 && !categoryId && !aiSuggested && incomeCategories.length > 0) {
        const suggested = await suggestCategory(
          description,
          incomeCategories.map(c => ({ id: c.id, name: c.name })),
          'income'
        );
        if (suggested) {
          setCategoryId(suggested);
          setAiSuggested(true);
        }
      }
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [description, categoryId, aiSuggested, incomeCategories, suggestCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If recurring, create recurrence
    if (isRecurring) {
      await createRecurrence.mutateAsync({
        description,
        amount: amount || 0,
        type: 'income',
        frequency: recurrenceRule as FrequencyType,
        start_date: date,
        category_id: categoryId || undefined,
        account_id: accountId || undefined,
      });
      
      setOpen(false);
      resetForm();
      return;
    }
    
    await createTransaction.mutateAsync({
      description,
      amount: amount || 0,
      type: 'income',
      due_date: date,
      competency_date: format(new Date(), 'yyyy-MM-dd'),
      category_id: categoryId || null,
      notes: notes || null,
      status,
      is_recurring: false,
      recurrence_rule: null,
      account_id: accountId || null,
      credit_card_id: null,
    } as any);
    
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDescription('');
    setAmount(0);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setAccountId('');
    setNotes('');
    setIsRecurring(false);
    setRecurrenceRule('monthly');
    setAiSuggested(false);
    setStatus('confirmed');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" /> Nova Receita
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" /> Nova Receita
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Salário, Freelance..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <CurrencyField
                id="amount"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Status Selector */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Tabs value={status} onValueChange={(v) => setStatus(v as 'confirmed' | 'pending')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="confirmed" className="gap-2">
                  <CheckCircle className="h-3 w-3" /> Efetivada
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-3 w-3" /> Pendente
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Categoria</Label>
              {isAISuggesting && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Sugerindo...
                </span>
              )}
              {aiSuggested && categoryId && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Sparkles className="h-3 w-3" /> Sugerido por IA
                </span>
              )}
            </div>
            <CategorySelector
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v);
                setAiSuggested(false);
              }}
              type="income"
              placeholder="Selecione uma categoria"
            />
          </div>

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

          <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="recurring">Receita recorrente</Label>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
            
            {isRecurring && (
              <div className="space-y-2">
                <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Frequência" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Será criada uma receita recorrente que gera transações pendentes automaticamente para os próximos meses.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione uma nota..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createTransaction.isPending || createRecurrence.isPending}
          >
            {(createTransaction.isPending || createRecurrence.isPending) 
              ? 'Salvando...' 
              : isRecurring 
                ? 'Criar Receita Recorrente'
                : 'Salvar Receita'
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}