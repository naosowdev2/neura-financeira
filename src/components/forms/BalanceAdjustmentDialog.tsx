import { useState, useEffect } from 'react';
import { Scale, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CurrencyField } from './CurrencyField';

interface Account {
  id: string;
  name: string;
  calculated_balance?: number | null;
  current_balance?: number | null;
  color?: string | null;
}

interface Props {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADJUSTMENT_REASONS = [
  { value: 'bank_statement', label: 'Conferência com extrato bancário' },
  { value: 'correction', label: 'Correção de lançamento anterior' },
  { value: 'initial_balance', label: 'Saldo inicial incorreto' },
  { value: 'fee', label: 'Tarifa/taxa não registrada' },
  { value: 'yield', label: 'Rendimento não registrado' },
  { value: 'other', label: 'Outro motivo' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function BalanceAdjustmentDialog({ account, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const currentBalance = account?.calculated_balance ?? account?.current_balance ?? 0;
  
  const [newBalance, setNewBalance] = useState(currentBalance);
  const [adjustmentDate, setAdjustmentDate] = useState<Date>(new Date());
  const [reasonType, setReasonType] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [registerAudit, setRegisterAudit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNewBalance(currentBalance);
      setAdjustmentDate(new Date());
      setReasonType('');
      setCustomReason('');
      setRegisterAudit(true);
    }
  }, [open, currentBalance]);

  const difference = newBalance - currentBalance;
  const hasChanges = difference !== 0;
  const reason = reasonType === 'other' ? customReason : ADJUSTMENT_REASONS.find(r => r.value === reasonType)?.label || '';
  const isValid = hasChanges && reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!user || !isValid) return;

    setIsSubmitting(true);
    try {
      // Create adjustment transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: account.id,
          type: 'adjustment',
          amount: difference,
          description: 'Ajuste de saldo',
          adjustment_reason: reason,
          date: format(adjustmentDate, 'yyyy-MM-dd'),
          status: 'confirmed',
        } as any);

      if (transactionError) throw transactionError;

      // Optionally register in audit log
      if (registerAudit) {
        await (supabase.rpc as any)('log_balance_audit', {
          p_account_id: account.id,
          p_new_balance: newBalance,
          p_previous_balance: currentBalance,
          p_reason: reason,
          p_user_id: user.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      toast.success('Saldo ajustado com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao ajustar saldo: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Ajustar Saldo
          </DialogTitle>
          <DialogDescription>
            {account?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Balance */}
          <div className="bg-muted/50 rounded-lg p-3">
            <Label className="text-xs text-muted-foreground">Saldo Atual</Label>
            <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatCurrency(currentBalance)}
            </p>
          </div>

          {/* New Balance Input */}
          <div className="space-y-2">
            <Label htmlFor="newBalance">Novo Saldo</Label>
            <CurrencyField
              value={newBalance}
              onChange={setNewBalance}
            />
            <p className="text-xs text-muted-foreground">
              Para valores negativos, digite o valor e ajuste manualmente
            </p>
          </div>

          {/* Difference Display */}
          {hasChanges && (
            <div className={cn(
              "rounded-lg p-3 flex items-center gap-3",
              difference > 0 ? "bg-emerald-500/10" : "bg-destructive/10"
            )}>
              <div className={cn(
                "p-2 rounded-full",
                difference > 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-destructive/20 text-destructive"
              )}>
                {difference > 0 ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferença</p>
                <p className={`font-semibold ${difference > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </p>
              </div>
            </div>
          )}

          {/* Adjustment Date */}
          <div className="space-y-2">
            <Label>Data do Ajuste</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !adjustmentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {adjustmentDate ? (
                    format(adjustmentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={adjustmentDate}
                  onSelect={(date) => date && setAdjustmentDate(date)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Adjustment Reason */}
          <div className="space-y-2">
            <Label>Motivo do Ajuste *</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason Input */}
          {reasonType === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Especifique o motivo *</Label>
              <Input
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo do ajuste..."
              />
            </div>
          )}

          {/* Audit Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="audit"
              checked={registerAudit}
              onCheckedChange={(checked) => setRegisterAudit(checked as boolean)}
            />
            <Label htmlFor="audit" className="text-sm font-normal cursor-pointer">
              Registrar no histórico de auditoria
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Ajustando...' : 'Confirmar Ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
