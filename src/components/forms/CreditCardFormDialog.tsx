import { useState } from "react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyField } from "./CurrencyField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard } from "lucide-react";
import { InstitutionSelector } from "./InstitutionSelector";
import { FinancialInstitution, getInstitutionById, getInstitutionInitials } from "@/constants/financial-institutions";

interface Props {
  trigger?: React.ReactNode;
}

export function CreditCardFormDialog({ trigger }: Props) {
  const { createCreditCard } = useCreditCards();
  const { accounts } = useAccounts();
  const [open, setOpen] = useState(false);
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
    await createCreditCard.mutateAsync({
      name: finalName,
      credit_limit: creditLimit,
      closing_day: parseInt(closingDay) || 1,
      due_day: parseInt(dueDay) || 10,
      color,
      icon: institutionId || 'credit-card',
      payment_account_id: paymentAccountId === 'none' ? null : paymentAccountId,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setInstitutionId(null);
    setCustomName('');
    setName('');
    setCreditLimit(0);
    setClosingDay('1');
    setDueDay('10');
    setColor('#ec4899');
    setPaymentAccountId('none');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <CreditCard className="h-4 w-4 mr-2" /> Adicionar Cartão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Novo Cartão de Crédito
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
              <Label htmlFor="card-name">Nome do cartão</Label>
              <Input
                id="card-name"
                placeholder="Ex: Nubank Platinum"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="limit">Limite de crédito</Label>
            <CurrencyField
              id="limit"
              value={creditLimit}
              onChange={setCreditLimit}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closing">Dia de fechamento</Label>
              <Input
                id="closing"
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Dia de vencimento</Label>
              <Input
                id="due"
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
            <p className="text-xs text-muted-foreground">
              Associe uma conta corrente para facilitar o pagamento da fatura
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createCreditCard.isPending || (!institutionId)}
          >
            {createCreditCard.isPending ? 'Salvando...' : 'Criar Cartão'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
