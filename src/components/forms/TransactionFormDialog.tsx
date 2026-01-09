import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useInstallments } from "@/hooks/useInstallments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, TrendingDown, TrendingUp, ArrowLeftRight, RefreshCcw, CreditCard, Layers } from "lucide-react";
import { CurrencyField } from "./CurrencyField";
import { format } from "date-fns";
import { CategoryFormDialog } from "./CategoryFormDialog";

interface Props {
  trigger?: React.ReactNode;
  defaultType?: 'expense' | 'income' | 'transfer';
}

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

export function TransactionFormDialog({ trigger, defaultType = 'expense' }: Props) {
  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { creditCards } = useCreditCards();
  const { createInstallment } = useInstallments();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(defaultType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [creditCardId, setCreditCardId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('monthly');
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('2');

  const filteredCategories = categories.filter(c => c.type === type || type === 'transfer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalAmount = amount;
    const installmentsCount = parseInt(totalInstallments) || 2;
    
    // Handle installments
    if (isInstallment && type === 'expense' && installmentsCount >= 2) {
      await createInstallment.mutateAsync({
        description,
        amount: totalAmount,
        amount_type: 'total',
        total_installments: installmentsCount,
        starting_installment: 1,
        frequency: 'monthly',
        first_installment_date: date,
        category_id: categoryId || undefined,
        account_id: paymentMethod === 'account' ? (accountId || undefined) : undefined,
        credit_card_id: paymentMethod === 'credit_card' ? (creditCardId || undefined) : undefined,
      });
      
      setOpen(false);
      resetForm();
      return;
    }
    
    const baseTransaction = {
      description,
      amount: totalAmount,
      type,
      due_date: date,
      competency_date: format(new Date(), 'yyyy-MM-dd'),
      category_id: type !== 'transfer' && categoryId ? categoryId : null,
      notes: notes || null,
      status: 'confirmed',
      is_recurring: isRecurring,
      recurrence_rule: isRecurring ? recurrenceRule : null,
    };

    if (type === 'transfer') {
      await createTransaction.mutateAsync({
        ...baseTransaction,
        account_id: accountId || null,
        destination_account_id: destinationAccountId || null,
        credit_card_id: null,
      } as any);
    } else if (type === 'expense' && paymentMethod === 'credit_card') {
      await createTransaction.mutateAsync({
        ...baseTransaction,
        account_id: null,
        credit_card_id: creditCardId || null,
      } as any);
    } else {
      await createTransaction.mutateAsync({
        ...baseTransaction,
        account_id: accountId || null,
        credit_card_id: null,
      } as any);
    }
    
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDescription('');
    setAmount(0);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setAccountId('');
    setDestinationAccountId('');
    setCreditCardId('');
    setNotes('');
    setPaymentMethod('account');
    setIsRecurring(false);
    setRecurrenceRule('monthly');
    setIsInstallment(false);
    setTotalInstallments('2');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Nova Transação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        
        <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expense" className="gap-2">
              <TrendingDown className="h-4 w-4" /> Despesa
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-2">
              <TrendingUp className="h-4 w-4" /> Receita
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Transferência
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Supermercado, Salário..."
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

            {type !== 'transfer' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Categoria</Label>
                  <CategoryFormDialog 
                    defaultType={type as 'expense' | 'income'}
                    trigger={<Button type="button" variant="ghost" size="sm"><Plus className="h-3 w-3 mr-1" /> Nova</Button>}
                  />
                </div>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#8b5cf6' }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'expense' && (
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
            )}

            {/* Transfer: Source Account */}
            {type === 'transfer' && (
              <>
                <div className="space-y-2">
                  <Label>Conta de Origem</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta de origem" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {accounts.filter(acc => acc.id !== destinationAccountId).map((acc) => (
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
                <div className="space-y-2">
                  <Label>Conta de Destino</Label>
                  <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta de destino" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {accounts.filter(acc => acc.id !== accountId).map((acc) => (
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
              </>
            )}

            {/* Regular account selection for income or expense with account */}
            {(type === 'income' || (type === 'expense' && paymentMethod === 'account')) && (
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

            {/* Credit card selection for expense */}
            {type === 'expense' && paymentMethod === 'credit_card' && (
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

            {/* Installments - only for expenses */}
            {type === 'expense' && (
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
                  <div className="space-y-2">
                    <Label>Número de parcelas</Label>
                    <Select value={totalInstallments} onValueChange={setTotalInstallments}>
                      <SelectTrigger>
                        <SelectValue placeholder="Parcelas" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n}x de R$ {((amount / 100) / n).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Recurring - disable if installment is active */}
            <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="recurring">Transação recorrente</Label>
                </div>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => {
                    setIsRecurring(checked);
                    if (checked) setIsInstallment(false);
                  }}
                  disabled={isInstallment}
                />
              </div>
              
              {isRecurring && (
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

            <Button type="submit" className="w-full" disabled={createTransaction.isPending || createInstallment.isPending}>
              {(createTransaction.isPending || createInstallment.isPending) ? 'Salvando...' : 
                isInstallment ? `Criar ${totalInstallments} Parcelas` : 'Salvar Transação'}
            </Button>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
