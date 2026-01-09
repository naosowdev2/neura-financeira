import { useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Landmark } from "lucide-react";
import { InstitutionSelector } from "./InstitutionSelector";
import { FinancialInstitution } from "@/constants/financial-institutions";
import { CurrencyField } from "./CurrencyField";

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'investment', label: 'Investimentos' },
];

interface Props {
  trigger?: React.ReactNode;
}

export function AccountFormDialog({ trigger }: Props) {
  const { createAccount } = useAccounts();
  const [open, setOpen] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [initialBalance, setInitialBalance] = useState(0);
  const [color, setColor] = useState('#6366f1');
  const [includeInTotal, setIncludeInTotal] = useState(true);

  const handleInstitutionChange = (institution: FinancialInstitution | null, custom?: string) => {
    if (institution) {
      setInstitutionId(institution.id);
      setColor(institution.color);
      if (institution.id !== 'outro') {
        setName(institution.name);
        setCustomLogoUrl(null);
      }
    } else {
      setInstitutionId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = institutionId === 'outro' ? customName : name;
    
    // Store custom logo URL in icon field with special prefix
    const iconValue = customLogoUrl 
      ? `custom:${customLogoUrl}` 
      : (institutionId || 'wallet');
    
    await createAccount.mutateAsync({
      name: finalName,
      type,
      initial_balance: initialBalance,
      current_balance: initialBalance,
      color,
      icon: iconValue,
      include_in_total: includeInTotal,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setInstitutionId(null);
    setCustomName('');
    setCustomLogoUrl(null);
    setName('');
    setType('checking');
    setInitialBalance(0);
    setColor('#6366f1');
    setIncludeInTotal(true);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Conta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" /> Nova Conta
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InstitutionSelector
            value={institutionId}
            onChange={handleInstitutionChange}
            customName={customName}
            onCustomNameChange={setCustomName}
            customLogoUrl={customLogoUrl}
            onCustomLogoUrlChange={setCustomLogoUrl}
          />

          {institutionId && institutionId !== 'outro' && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome da conta</Label>
              <Input
                id="name"
                placeholder="Ex: Nubank Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo inicial</Label>
            <CurrencyField
              id="balance"
              value={initialBalance}
              onChange={setInitialBalance}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include">Incluir no saldo total</Label>
            <Switch
              id="include"
              checked={includeInTotal}
              onCheckedChange={setIncludeInTotal}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createAccount.isPending || (!institutionId)}
          >
            {createAccount.isPending ? 'Salvando...' : 'Criar Conta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
