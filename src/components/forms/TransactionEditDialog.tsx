import { useState, useEffect } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCards } from "@/hooks/useCreditCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Receipt, RefreshCcw } from "lucide-react";
import { CurrencyField } from "./CurrencyField";
import { RecurrenceEditChoice } from "./RecurrenceEditChoice";

interface Props {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransactionEditDialog({ transaction, open, onOpenChange, onSuccess }: Props) {
  const { 
    updateTransaction, 
    deleteTransaction, 
    updateRecurringTransaction, 
    deleteRecurringTransaction,
    updateInstallmentTransaction,
    deleteInstallmentTransaction
  } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { creditCards } = useCreditCards();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [competencyDate, setCompetencyDate] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [creditCardId, setCreditCardId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Recurrence choice dialog states
  const [showEditChoice, setShowEditChoice] = useState(false);
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);
  const [pendingAction, setPendingAction] = useState<'edit' | 'delete' | null>(null);

  const isRecurring = transaction?.is_recurring || transaction?.recurrence_id;
  const isInstallment = transaction?.installment_group_id != null;
  const needsChoiceDialog = isRecurring || isInstallment;

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description || '');
      setAmount(transaction.amount || 0);
      // Suporte para ambos os formatos (date ou due_date)
      setDueDate(transaction.due_date || transaction.date || '');
      setCompetencyDate(transaction.competency_date || transaction.due_date || transaction.date || '');
      setCategoryId(transaction.category_id || '');
      setAccountId(transaction.account_id || '');
      setCreditCardId(transaction.credit_card_id || '');
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  const filteredCategories = categories.filter(c => c.type === transaction?.type || transaction?.type === 'transfer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (needsChoiceDialog) {
      setPendingAction('edit');
      setShowEditChoice(true);
      return;
    }

    await performUpdate();
  };

  const performUpdate = async (scope?: 'this_only' | 'this_and_future') => {
    const updates = {
      description,
      amount: amount || 0,
      due_date: dueDate,
      competency_date: competencyDate,
      category_id: categoryId || null,
      account_id: accountId || null,
      credit_card_id: creditCardId || null,
      notes: notes || null,
    };

    if (scope && isInstallment) {
      await updateInstallmentTransaction.mutateAsync({
        id: transaction.id,
        scope,
        updates,
        installmentGroupId: transaction.installment_group_id,
        installmentNumber: transaction.installment_number,
        totalInstallments: transaction.total_installments,
      });
    } else if (scope && isRecurring) {
      await updateRecurringTransaction.mutateAsync({
        id: transaction.id,
        scope,
        updates,
        recurrenceId: transaction.recurrence_id,
        transactionDate: transaction.due_date || transaction.date,
      });
    } else {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        ...updates,
      });
    }
    
    onOpenChange(false);
    onSuccess?.();
  };

  const handleDeleteClick = () => {
    if (needsChoiceDialog) {
      setPendingAction('delete');
      setShowDeleteChoice(true);
      return;
    }
    
    performDelete();
  };

  const performDelete = async (scope?: 'this_only' | 'this_and_future') => {
    if (scope && isInstallment) {
      await deleteInstallmentTransaction.mutateAsync({
        id: transaction.id,
        scope,
        installmentGroupId: transaction.installment_group_id,
        installmentNumber: transaction.installment_number,
      });
    } else if (scope && isRecurring) {
      await deleteRecurringTransaction.mutateAsync({
        id: transaction.id,
        scope,
        recurrenceId: transaction.recurrence_id,
        transactionDate: transaction.due_date || transaction.date,
      });
    } else {
      await deleteTransaction.mutateAsync(transaction.id);
    }
    
    onOpenChange(false);
  };

  const handleEditChoice = (choice: 'this_only' | 'this_and_future') => {
    setShowEditChoice(false);
    performUpdate(choice);
  };

  const handleDeleteChoice = (choice: 'this_only' | 'this_and_future') => {
    setShowDeleteChoice(false);
    performDelete(choice);
  };

  const isLoading = updateTransaction.isPending || 
    deleteTransaction.isPending || 
    updateRecurringTransaction.isPending || 
    deleteRecurringTransaction.isPending ||
    updateInstallmentTransaction.isPending ||
    deleteInstallmentTransaction.isPending;

  // Determine transaction type for choice dialog
  const transactionType = isInstallment ? 'installment' : 'recurring';
  const installmentInfo = isInstallment ? {
    currentNumber: transaction?.installment_number ?? 1,
    totalInstallments: transaction?.total_installments ?? 1,
  } : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> 
              Editar Transação
              {(isRecurring || isInstallment) && (
                <Badge variant="secondary" className="ml-2 gap-1">
                  <RefreshCcw className="h-3 w-3" />
                  {isInstallment 
                    ? `${transaction?.installment_number}/${transaction?.total_installments}`
                    : 'Recorrente'
                  }
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                placeholder="Ex: Supermercado, Salário..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Valor</Label>
                <CurrencyField
                  id="edit-amount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-due-date">Data de Vencimento</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Quando impacta o saldo</p>
              </div>
            </div>

            {transaction?.type !== 'transfer' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {transaction?.account_id && (
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color }} />
                          {acc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {transaction?.credit_card_id && (
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                          {card.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                placeholder="Adicione uma nota..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                size="icon"
                onClick={handleDeleteClick}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit choice dialog for recurring/installment transactions */}
      {(transaction?.due_date || transaction?.date) && (
        <RecurrenceEditChoice
          open={showEditChoice}
          onOpenChange={setShowEditChoice}
          onChoice={handleEditChoice}
          action="edit"
          transactionDate={transaction.due_date || transaction.date}
          isLoading={isLoading}
          transactionType={transactionType}
          installmentInfo={installmentInfo}
        />
      )}

      {/* Delete choice dialog for recurring/installment transactions */}
      {(transaction?.due_date || transaction?.date) && (
        <RecurrenceEditChoice
          open={showDeleteChoice}
          onOpenChange={setShowDeleteChoice}
          onChoice={handleDeleteChoice}
          action="delete"
          transactionDate={transaction.due_date || transaction.date}
          isLoading={isLoading}
          transactionType={transactionType}
          installmentInfo={installmentInfo}
        />
      )}
    </>
  );
}
