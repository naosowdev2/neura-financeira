import { useState, useEffect } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyField } from "./CurrencyField";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Wallet, Trash2 } from "lucide-react";
import { InstitutionSelector } from "./InstitutionSelector";
import { FinancialInstitution, getInstitutionById } from "@/constants/financial-institutions";

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'investment', label: 'Investimentos' },
];

interface Props {
  account: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountEditDialog({ account, open, onOpenChange }: Props) {
  const { updateAccount, deleteAccount } = useAccounts();
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [color, setColor] = useState('#6366f1');
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const [initialBalance, setInitialBalance] = useState(0);

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setType(account.type || 'checking');
      setColor(account.color || '#6366f1');
      setIncludeInTotal(account.include_in_total ?? true);
      setInitialBalance(account.initial_balance || 0);
      
      // Try to find institution by icon field
      const institution = getInstitutionById(account.icon || '');
      if (institution) {
        setInstitutionId(institution.id);
        if (institution.id === 'outro') {
          setCustomName(account.name || '');
        }
      } else {
        // Check if name matches an institution
        setInstitutionId(null);
      }
    }
  }, [account]);

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
    await updateAccount.mutateAsync({
      id: account.id,
      name: finalName,
      type,
      color,
      icon: institutionId || 'wallet',
      include_in_total: includeInTotal,
      initial_balance: initialBalance,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteAccount.mutateAsync(account.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Editar Conta
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
              <Label htmlFor="edit-name">Nome da conta</Label>
              <Input
                id="edit-name"
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
            <Label htmlFor="edit-balance">Saldo inicial</Label>
            <CurrencyField
              id="edit-balance"
              value={initialBalance}
              onChange={setInitialBalance}
              placeholder="R$ 0,00"
            />
            <p className="text-xs text-muted-foreground">
              Saldo atual: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account?.calculated_balance ?? account?.current_balance ?? 0)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="edit-include">Incluir no saldo total</Label>
            <Switch
              id="edit-include"
              checked={includeInTotal}
              onCheckedChange={setIncludeInTotal}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={updateAccount.isPending}>
              {updateAccount.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>Arquivar conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A conta será arquivada e não aparecerá mais na lista.
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
