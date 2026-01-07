import { useState, useEffect } from "react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyField } from "./CurrencyField";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreditCard, Trash2 } from "lucide-react";
import { InstitutionSelector } from "./InstitutionSelector";
import { FinancialInstitution, getInstitutionById, getInstitutionInitials } from "@/constants/financial-institutions";

interface Props {
  card: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditCardEditDialog({ card, open, onOpenChange }: Props) {
  const { updateCreditCard, deleteCreditCard } = useCreditCards();
  const { accounts } = useAccounts();
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [name, setName] = useState('');
  const [creditLimit, setCreditLimit] = useState(0);
  const [closingDay, setClosingDay] = useState('1');
  const [dueDay, setDueDay] = useState('10');
  const [color, setColor] = useState('#ec4899');
  const [paymentAccountId, setPaymentAccountId] = useState<string>('none');

  // Filter only checking accounts for payment
  const checkingAccounts = accounts.filter(acc => acc.type === 'checking');

  useEffect(() => {
    if (card) {
      setName(card.name || '');
      setCreditLimit(card.credit_limit || 0);
      setClosingDay(card.closing_day?.toString() || '1');
      setDueDay(card.due_day?.toString() || '10');
      setColor(card.color || '#ec4899');
      setPaymentAccountId(card.payment_account_id || 'none');
      
      // Try to find institution by icon field
      const institution = getInstitutionById(card.icon || '');
      if (institution) {
        setInstitutionId(institution.id);
        if (institution.id === 'outro') {
          setCustomName(card.name || '');
        }
      } else {
        setInstitutionId(null);
      }
    }
  }, [card]);

  const handleInstitutionChange = (institution: FinancialInstitution | null) => {
    if (institution) {
      setInstitutionId(institution.id);
      setColor(institution.color);
      if (institution.id !== 'outro') {
        setName(institution.name);
      }
    } else {
      setInstitutionId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = institutionId === 'outro' ? customName : name;
    await updateCreditCard.mutateAsync({
      id: card.id,
      name: finalName,
      credit_limit: creditLimit,
      closing_day: parseInt(closingDay) || 1,
      due_day: parseInt(dueDay) || 10,
      color,
      icon: institutionId || 'credit-card',
      payment_account_id: paymentAccountId === 'none' ? null : paymentAccountId,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteCreditCard.mutateAsync(card.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Editar Cartão
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InstitutionSelector
            value={institutionId}
            onChange={handleInstitutionChange}
            customName={customName}
            onCustomNameChange={setCustomName}
          />

          {institutionId && institutionId !== 'outro' && (
            <div className="space-y-2">
              <Label htmlFor="edit-card-name">Nome do cartão</Label>
              <Input
                id="edit-card-name"
                placeholder="Ex: Nubank Platinum"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-limit">Limite de crédito</Label>
            <CurrencyField
              id="edit-limit"
              value={creditLimit}
              onChange={setCreditLimit}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-closing">Dia de fechamento</Label>
              <Input
                id="edit-closing"
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due">Dia de vencimento</Label>
              <Input
                id="edit-due"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conta para pagamento da fatura</Label>
            <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">Nenhuma</SelectItem>
                {checkingAccounts.map((acc) => {
                  const institution = getInstitutionById(acc.icon || '');
                  return (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                          style={{ backgroundColor: acc.color }}
                        >
                          {institution ? getInstitutionInitials(institution.name) : acc.name.substring(0, 2).toUpperCase()}
                        </div>
                        {acc.name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={updateCreditCard.isPending}>
              {updateCreditCard.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>Arquivar cartão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O cartão será arquivado e não aparecerá mais na lista.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Arquivar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
