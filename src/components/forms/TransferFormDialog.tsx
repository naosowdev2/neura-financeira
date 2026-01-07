import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyField } from "./CurrencyField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, ArrowRight, PiggyBank, Wallet } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface Props {
  trigger?: React.ReactNode;
}

export function TransferFormDialog({ trigger }: Props) {
  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { savingsGoals, contribute, withdraw } = useSavingsGoals();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Source state
  const [sourceType, setSourceType] = useState<'account' | 'savings_goal'>('account');
  const [sourceId, setSourceId] = useState<string>('');
  
  // Destination state
  const [destinationType, setDestinationType] = useState<'account' | 'savings_goal'>('account');
  const [destinationId, setDestinationId] = useState<string>('');
  
  const [notes, setNotes] = useState('');

  // Filter active savings goals
  const activeSavingsGoals = savingsGoals?.filter(goal => !goal.is_completed) || [];

  // Combined source value for select
  const sourceSelectValue = sourceType === 'savings_goal' ? `goal_${sourceId}` : sourceId;
  
  // Combined destination value for select
  const destinationSelectValue = destinationType === 'savings_goal' ? `goal_${destinationId}` : destinationId;

  const handleSourceChange = (value: string) => {
    if (value.startsWith('goal_')) {
      setSourceType('savings_goal');
      setSourceId(value.replace('goal_', ''));
    } else {
      setSourceType('account');
      setSourceId(value);
    }
  };

  const handleDestinationChange = (value: string) => {
    if (value.startsWith('goal_')) {
      setDestinationType('savings_goal');
      setDestinationId(value.replace('goal_', ''));
    } else {
      setDestinationType('account');
      setDestinationId(value);
    }
  };

  // Filter valid sources (exclude selected destination)
  const validSourceAccounts = useMemo(() => {
    return accounts.filter(acc => 
      !(destinationType === 'account' && acc.id === destinationId)
    );
  }, [accounts, destinationType, destinationId]);

  const validSourceGoals = useMemo(() => {
    return activeSavingsGoals.filter(goal =>
      !(destinationType === 'savings_goal' && goal.id === destinationId)
    );
  }, [activeSavingsGoals, destinationType, destinationId]);

  // Filter valid destinations (exclude selected source)
  const validDestAccounts = useMemo(() => {
    return accounts.filter(acc => 
      !(sourceType === 'account' && acc.id === sourceId)
    );
  }, [accounts, sourceType, sourceId]);

  const validDestGoals = useMemo(() => {
    return activeSavingsGoals.filter(goal =>
      !(sourceType === 'savings_goal' && goal.id === sourceId)
    );
  }, [activeSavingsGoals, sourceType, sourceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (sourceType === 'savings_goal' && destinationType === 'savings_goal') {
      // Savings Goal → Savings Goal (internal transfer between goals)
      await withdraw.mutateAsync({
        id: sourceId,
        amount: amount,
        accountId: undefined,
      });
      await contribute.mutateAsync({
        id: destinationId,
        amount: amount,
        accountId: undefined,
      });
    } else if (sourceType === 'savings_goal') {
      // Savings Goal → Account (withdrawal/resgate)
      await withdraw.mutateAsync({
        id: sourceId,
        amount: amount,
        accountId: destinationId,
      });
    } else if (destinationType === 'savings_goal') {
      // Account → Savings Goal (deposit)
      await createTransaction.mutateAsync({
        description,
        amount: amount,
        type: 'transfer',
        date,
        category_id: null,
        notes: notes || null,
        status: 'confirmed',
        is_recurring: false,
        recurrence_rule: null,
        account_id: sourceId || null,
        destination_account_id: null,
        savings_goal_id: destinationId,
        credit_card_id: null,
      } as any);

      await contribute.mutateAsync({
        id: destinationId,
        amount: amount,
      });
    } else {
      // Account → Account (regular transfer)
      await createTransaction.mutateAsync({
        description,
        amount: amount,
        type: 'transfer',
        date,
        category_id: null,
        notes: notes || null,
        status: 'confirmed',
        is_recurring: false,
        recurrence_rule: null,
        account_id: sourceId || null,
        destination_account_id: destinationId || null,
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
    setSourceType('account');
    setSourceId('');
    setDestinationType('account');
    setDestinationId('');
    setNotes('');
  };

  // Get display objects
  const sourceAccount = sourceType === 'account' ? accounts.find(acc => acc.id === sourceId) : null;
  const sourceSavingsGoal = sourceType === 'savings_goal' ? savingsGoals?.find(goal => goal.id === sourceId) : null;
  const destAccount = destinationType === 'account' ? accounts.find(acc => acc.id === destinationId) : null;
  const destSavingsGoal = destinationType === 'savings_goal' ? savingsGoals?.find(goal => goal.id === destinationId) : null;

  const isLoading = createTransaction.isPending || contribute.isPending || withdraw.isPending;

  // Validation for insufficient balance when source is a savings goal
  const insufficientBalance = useMemo(() => {
    if (sourceType === 'savings_goal' && sourceSavingsGoal) {
      return amount > sourceSavingsGoal.current_amount;
    }
    return false;
  }, [sourceType, sourceSavingsGoal, amount]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <ArrowLeftRight className="h-4 w-4 mr-2" /> Nova Transferência
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" /> Nova Transferência
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Transferência para poupança..."
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
                placeholder="R$ 0,00"
              />
              {insufficientBalance && (
                <p className="text-xs text-destructive">
                  Saldo insuficiente. Disponível: {formatCurrency(sourceSavingsGoal?.current_amount || 0)}
                </p>
              )}
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

          <div className="space-y-2">
            <Label>Conta de Origem</Label>
            <Select value={sourceSelectValue} onValueChange={handleSourceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {validSourceAccounts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Contas
                    </SelectLabel>
                    {validSourceAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#6366f1' }} />
                          {acc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {validSourceGoals.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" /> Cofrinhos
                    </SelectLabel>
                    {validSourceGoals.map((goal) => (
                      <SelectItem key={goal.id} value={`goal_${goal.id}`}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.color || '#10b981' }} />
                            <span>{goal.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatCurrency(goal.current_amount)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Visual indicator */}
          {sourceId && destinationId && (
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                {sourceType === 'savings_goal' ? (
                  <>
                    <PiggyBank className="h-4 w-4 text-emerald-500" />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sourceSavingsGoal?.color || '#10b981' }} />
                    <span className="text-sm font-medium">{sourceSavingsGoal?.name}</span>
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sourceAccount?.color || '#6366f1' }} />
                    <span className="text-sm font-medium">{sourceAccount?.name}</span>
                  </>
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                {destinationType === 'savings_goal' ? (
                  <>
                    <PiggyBank className="h-4 w-4 text-emerald-500" />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: destSavingsGoal?.color || '#10b981' }} />
                    <span className="text-sm font-medium">{destSavingsGoal?.name}</span>
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: destAccount?.color || '#6366f1' }} />
                    <span className="text-sm font-medium">{destAccount?.name}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Conta de Destino</Label>
            <Select value={destinationSelectValue} onValueChange={handleDestinationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {validDestAccounts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Contas
                    </SelectLabel>
                    {validDestAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#6366f1' }} />
                          {acc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {validDestGoals.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" /> Cofrinhos
                    </SelectLabel>
                    {validDestGoals.map((goal) => (
                      <SelectItem key={goal.id} value={`goal_${goal.id}`}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.color || '#10b981' }} />
                            <span>{goal.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatCurrency(goal.current_amount)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
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

          <Button type="submit" className="w-full" disabled={isLoading || insufficientBalance || !sourceId || !destinationId || amount <= 0}>
            {isLoading ? 'Salvando...' : 'Realizar Transferência'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
