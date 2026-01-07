import { useState } from 'react';
import { Wallet, AlertCircle, Check, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { CurrencyField } from '@/components/forms/CurrencyField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCardInvoices } from '@/hooks/useCreditCardInvoices';
import { InstitutionLogo } from '@/components/ui/InstitutionLogo';
import type { CreditCardInvoice, CreditCard } from '@/types/financial';

interface PayInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: CreditCardInvoice | null;
  card: CreditCard | null;
  invoiceTotal: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function PayInvoiceDialog({ 
  open, 
  onOpenChange, 
  invoice, 
  card,
  invoiceTotal 
}: PayInvoiceDialogProps) {
  const { accounts } = useAccounts();
  const { payInvoice } = useCreditCardInvoices();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    card?.payment_account_id || ''
  );
  const [customAmount, setCustomAmount] = useState(false);
  const [amount, setAmount] = useState(invoiceTotal);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const hasInsufficientBalance = selectedAccount && (selectedAccount.current_balance || 0) < amount;
  
  const handlePay = async () => {
    if (!invoice || !selectedAccountId) return;
    
    setIsSubmitting(true);
    try {
      await payInvoice.mutateAsync({
        invoiceId: invoice.id,
        accountId: selectedAccountId,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Pagar Fatura
          </DialogTitle>
          <DialogDescription>
            {card?.name} - Fatura de {invoice?.reference_month ? 
              new Date(invoice.reference_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
              : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Valor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Valor a pagar</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="custom-amount"
                  checked={customAmount}
                  onCheckedChange={setCustomAmount}
                />
                <Label htmlFor="custom-amount" className="text-xs text-muted-foreground">
                  Valor diferente
                </Label>
              </div>
            </div>
            
            {customAmount ? (
              <CurrencyField
                value={amount}
                onChange={setAmount}
                className="text-lg font-bold"
              />
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-2xl font-bold">{formatCurrency(invoiceTotal)}</span>
              </div>
            )}
          </div>
          
          {/* Conta de origem */}
          <div className="space-y-2">
            <Label>Pagar com</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <div className="flex items-center gap-2">
                        <InstitutionLogo institutionId={account.icon} size="sm" />
                        <span>{account.name}</span>
                      </div>
                      <span className={`text-sm ${(account.current_balance || 0) >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                        {formatCurrency(account.current_balance || 0)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Alerta de saldo insuficiente */}
          {hasInsufficientBalance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Saldo insuficiente. A conta tem apenas {formatCurrency(selectedAccount?.current_balance || 0)}.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Data do pagamento */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data do pagamento
            </Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          
          {/* Resumo */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">Você irá pagar</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(customAmount ? amount : invoiceTotal)}
            </p>
            {selectedAccount && (
              <p className="text-sm text-muted-foreground">
                da conta <span className="font-medium">{selectedAccount.name}</span>
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePay} 
            disabled={!selectedAccountId || isSubmitting}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? 'Pagando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
