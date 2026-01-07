import { useState, useEffect, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useInstallments } from "@/hooks/useInstallments";
import { useCategories } from "@/hooks/useCategories";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useAICategorize } from "@/hooks/useAI";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, RefreshCcw, CreditCard, Layers, Sparkles, Loader2, Calculator, CheckCircle, Clock } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

function addIntervalByFrequency(date: Date, frequency: FrequencyType, intervals: number): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, intervals);
    case 'weekly':
      return addWeeks(date, intervals);
    case 'biweekly':
      return addWeeks(date, intervals * 2);
    case 'monthly':
      return addMonths(date, intervals);
    case 'yearly':
      return addYears(date, intervals);
    default:
      return addMonths(date, intervals);
  }
}

export function ExpenseFormDialog({ trigger }: Props) {
  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { createInstallment } = useInstallments();
  const { categories } = useCategories();
  const { createRecurrence } = useRecurrences();
  const { suggestCategory, isLoading: isAISuggesting } = useAICategorize();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [creditCardId, setCreditCardId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('monthly');
  const [isInstallment, setIsInstallment] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [status, setStatus] = useState<'confirmed' | 'pending'>('confirmed');

  // Installment fields
  const [startingInstallment, setStartingInstallment] = useState('1');
  const [totalInstallments, setTotalInstallments] = useState('2');
  const [installmentFrequency, setInstallmentFrequency] = useState<FrequencyType>('monthly');
  const [amountType, setAmountType] = useState<'total' | 'per_installment'>('total');

  const expenseCategories = useMemo(() => 
    categories.filter(c => c.type === 'expense'),
    [categories]
  );

  // Calculate installment values
  const installmentCalculation = useMemo(() => {
    const inputAmount = amount || 0;
    const totalOfPurchase = parseInt(totalInstallments) || 2;  // Total de parcelas DA COMPRA
    const startNum = parseInt(startingInstallment) || 1;
    
    // Quantas parcelas vamos CRIAR (da startNum até totalOfPurchase)
    const installmentsToCreate = Math.max(1, totalOfPurchase - startNum + 1);
    
    let totalAmount: number;
    let installmentAmount: number;
    
    if (amountType === 'total') {
      totalAmount = inputAmount;
      installmentAmount = inputAmount / installmentsToCreate;
    } else {
      installmentAmount = inputAmount;
      totalAmount = inputAmount * installmentsToCreate;
    }
    
    const firstDate = new Date(date);
    const lastDate = addIntervalByFrequency(firstDate, installmentFrequency, installmentsToCreate - 1);
    
    return {
      totalAmount,
      installmentAmount,
      installmentsToCreate,      // Parcelas que serão criadas
      totalOfPurchase,           // Total da compra original
      startNum,
      endNum: totalOfPurchase,   // Última parcela = total da compra
      firstDate,
      lastDate,
    };
  }, [amount, totalInstallments, startingInstallment, amountType, date, installmentFrequency]);

  // Calculate which invoice this purchase will fall into (for credit card)
  const invoiceInfo = useMemo(() => {
    if (paymentMethod !== 'credit_card' || !creditCardId) return null;
    
    const selectedCard = creditCards.find(c => c.id === creditCardId);
    if (!selectedCard) return null;
    
    const purchaseDate = new Date(date + 'T12:00:00');
    const closingDay = selectedCard.closing_day || 1;
    const dueDay = selectedCard.due_day || 10;
    
    // Calculate which month this purchase will be billed to
    let billingMonth = purchaseDate.getMonth();
    let billingYear = purchaseDate.getFullYear();
    
    // If purchase is after closing date, it goes to next month's invoice
    if (purchaseDate.getDate() > closingDay) {
      billingMonth++;
      if (billingMonth > 11) {
        billingMonth = 0;
        billingYear++;
      }
    }
    
    const invoiceDate = new Date(billingYear, billingMonth, 1);
    const dueDate = new Date(billingYear, billingMonth, dueDay);
    
    // If due day is before closing day, due date is in the next month
    if (dueDay < closingDay) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    return {
      invoiceDate,
      dueDate,
      closingDay,
      dueDay,
      cardName: selectedCard.name,
    };
  }, [paymentMethod, creditCardId, creditCards, date]);

  // Auto-categorization with AI
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (description.length >= 3 && !categoryId && !aiSuggested && expenseCategories.length > 0) {
        const suggested = await suggestCategory(
          description,
          expenseCategories.map(c => ({ id: c.id, name: c.name })),
          'expense'
        );
        if (suggested) {
          setCategoryId(suggested);
          setAiSuggested(true);
        }
      }
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [description, categoryId, aiSuggested, expenseCategories, suggestCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine the correct status: future dates should be pending
    const transactionDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    transactionDate.setHours(0, 0, 0, 0);
    
    const isFutureDate = transactionDate > today;
    const finalStatus = isFutureDate ? 'pending' : status;
    
    if (isInstallment) {
      await createInstallment.mutateAsync({
        description,
        amount: amount || 0,
        amount_type: amountType,
        total_installments: parseInt(totalInstallments) || 2,
        starting_installment: parseInt(startingInstallment) || 1,
        frequency: installmentFrequency,
        first_installment_date: date,
        category_id: categoryId || undefined,
        account_id: paymentMethod === 'account' ? (accountId || undefined) : undefined,
        credit_card_id: paymentMethod === 'credit_card' ? (creditCardId || undefined) : undefined,
      });
      
      setOpen(false);
      resetForm();
      return;
    }

    // If recurring, create recurrence and generate future transactions
    if (isRecurring) {
      await createRecurrence.mutateAsync({
        description,
        amount: amount || 0,
        type: 'expense',
        frequency: recurrenceRule as FrequencyType,
        start_date: date,
        category_id: categoryId || undefined,
        account_id: paymentMethod === 'account' ? (accountId || undefined) : undefined,
        credit_card_id: paymentMethod === 'credit_card' ? (creditCardId || undefined) : undefined,
      });
      
      setOpen(false);
      resetForm();
      return;
    }
    
    await createTransaction.mutateAsync({
      description,
      amount: amount || 0,
      type: 'expense',
      date,
      category_id: categoryId || null,
      notes: notes || null,
      status: finalStatus,
      is_recurring: false,
      recurrence_rule: null,
      account_id: paymentMethod === 'account' ? (accountId || null) : null,
      credit_card_id: paymentMethod === 'credit_card' ? (creditCardId || null) : null,
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
    setCreditCardId('');
    setNotes('');
    setPaymentMethod('account');
    setIsRecurring(false);
    setRecurrenceRule('monthly');
    setIsInstallment(false);
    setStartingInstallment('1');
    setTotalInstallments('2');
    setInstallmentFrequency('monthly');
    setAmountType('total');
    setAiSuggested(false);
    setStatus('confirmed');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <TrendingDown className="h-4 w-4 mr-2" /> Nova Despesa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" /> Nova Despesa
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado, Conta de luz..."
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
              type="expense"
              placeholder="Selecione uma categoria"
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'account' | 'credit_card')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Conta/Carteira</TabsTrigger>
                <TabsTrigger value="credit_card" className="gap-2">
                  <CreditCard className="h-3 w-3" /> Cartão de Crédito
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
              
              {/* Invoice Info Indicator */}
              {invoiceInfo && (
                <Card className="bg-pink-500/10 border-pink-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-pink-400" />
                      <span className="text-sm font-medium text-pink-400">Fatura de Referência</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Esta compra será lançada na fatura de{' '}
                      <strong className="text-foreground">
                        {format(invoiceInfo.invoiceDate, "MMMM/yyyy", { locale: ptBR })}
                      </strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {format(invoiceInfo.dueDate, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Installment Section - For both account and credit card payments */}
          {(paymentMethod === 'account' || paymentMethod === 'credit_card') && (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="installment">Parcelar compra</Label>
                </div>
                <Switch
                  id="installment"
                  checked={isInstallment}
                  onCheckedChange={(checked) => {
                    setIsInstallment(checked);
                    if (checked) setIsRecurring(false);
                  }}
                />
              </div>
              
              {isInstallment && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Parcela Inicial */}
                    <div className="space-y-2">
                      <Label className="text-xs">Parcela Inicial</Label>
                      <Select value={startingInstallment} onValueChange={setStartingInstallment}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}ª
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Total de Parcelas da Compra */}
                    <div className="space-y-2">
                      <Label className="text-xs">Total Compra</Label>
                      <Select value={totalInstallments} onValueChange={setTotalInstallments}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover max-h-60">
                          {Array.from({ length: 47 }, (_, i) => i + 2).map((n) => (
                            <SelectItem key={n} value={n.toString()} disabled={n < parseInt(startingInstallment)}>
                              {n}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Periodicidade */}
                    <div className="space-y-2">
                      <Label className="text-xs">Periodicidade</Label>
                      <Select value={installmentFrequency} onValueChange={(v) => setInstallmentFrequency(v as FrequencyType)}>
                        <SelectTrigger className="h-9">
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
                  
                  {/* Tipo de Valor */}
                  <div className="space-y-2">
                    <Label className="text-xs">O valor R$ {amount || '0,00'} informado é:</Label>
                    <Tabs value={amountType} onValueChange={(v) => setAmountType(v as 'total' | 'per_installment')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="total">Valor Total</TabsTrigger>
                        <TabsTrigger value="per_installment">Valor da Parcela</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {/* Resumo Visual */}
                  {amount > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Resumo do Parcelamento</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-foreground">
                            <span className="font-semibold">{installmentCalculation.installmentsToCreate}x</span> de{' '}
                            <span className="font-semibold text-primary">
                              R$ {installmentCalculation.installmentAmount.toFixed(2)}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Valor total: R$ {installmentCalculation.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-muted-foreground">
                            Da {installmentCalculation.startNum}ª à {installmentCalculation.endNum}ª parcela
                            {' '}(de {installmentCalculation.totalOfPurchase} no total)
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {format(installmentCalculation.firstDate, "dd/MM/yyyy", { locale: ptBR })} até{' '}
                            {format(installmentCalculation.lastDate, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recurring Section */}
          {!isInstallment && (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="recurring">Despesa recorrente</Label>
                </div>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
              
              {isRecurring && (
                <div className="space-y-3">
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
                  
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Sobre a Data Selecionada</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        A data <strong>{format(new Date(date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</strong> será o <strong>primeiro lançamento</strong> desta despesa recorrente.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Próximos lançamentos:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[1, 2, 3].map((i) => {
                          const nextDate = addIntervalByFrequency(new Date(date + 'T12:00:00'), recurrenceRule as FrequencyType, i);
                          return (
                            <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded">
                              {format(nextDate, "dd/MM/yy", { locale: ptBR })}
                            </span>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <p className="text-xs text-muted-foreground">
                    Será criada uma despesa recorrente que gera transações pendentes automaticamente.
                  </p>
                </div>
              )}
            </div>
          )}

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
            disabled={createTransaction.isPending || createInstallment.isPending || createRecurrence.isPending}
          >
            {(createTransaction.isPending || createInstallment.isPending || createRecurrence.isPending) 
              ? 'Salvando...' 
              : isInstallment 
                ? `Criar ${installmentCalculation.installmentsToCreate} Parcelas`
                : isRecurring 
                  ? 'Criar Despesa Recorrente'
                  : 'Salvar Despesa'
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}