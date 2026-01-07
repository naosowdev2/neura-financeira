import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, Check, Clock, CheckCircle2, Edit2, CreditCard, CheckSquare, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InstallmentGroup } from "@/types/financial";

interface InstallmentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: InstallmentGroup | null;
  onEdit: () => void;
  onConfirmInstallment: (transactionId: string) => void;
  onConfirmBatch?: (transactionIds: string[]) => void;
  isConfirming?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface InstallmentItem {
  number: number;
  status: 'paid_before' | 'confirmed' | 'pending';
  transactionId?: string;
  date?: string;
  amount: number;
}

export function InstallmentDetailSheet({
  open,
  onOpenChange,
  group,
  onEdit,
  onConfirmInstallment,
  onConfirmBatch,
  isConfirming,
}: InstallmentDetailSheetProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!group) return null;

  // Build the list of all installments
  const transactions = (group.transactions as any[] || []);
  
  // Find min installment number from transactions
  const installmentNumbers = transactions
    .filter((t: any) => t.installment_number !== null)
    .map((t: any) => t.installment_number as number);
  
  const minInstallment = installmentNumbers.length > 0 
    ? Math.min(...installmentNumbers) 
    : 1;

  // Build installment items
  const installments: InstallmentItem[] = [];
  
  for (let i = 1; i <= group.total_installments; i++) {
    if (i < minInstallment) {
      // Paid before registration
      installments.push({
        number: i,
        status: 'paid_before',
        amount: group.installment_amount,
      });
    } else {
      // Find the transaction for this installment
      const tx = transactions.find((t: any) => t.installment_number === i);
      if (tx) {
        installments.push({
          number: i,
          status: tx.status === 'confirmed' ? 'confirmed' : 'pending',
          transactionId: tx.id,
          date: tx.date,
          amount: tx.amount || group.installment_amount,
        });
      } else {
        // Transaction not found, assume pending
        installments.push({
          number: i,
          status: 'pending',
          amount: group.installment_amount,
        });
      }
    }
  }

  const pendingInstallments = installments.filter(i => i.status === 'pending' && i.transactionId);
  const paidCount = installments.filter(i => i.status !== 'pending').length;
  const progress = (paidCount / group.total_installments) * 100;
  const remainingAmount = installments
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount, 0);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAllPending = () => {
    const pendingIds = pendingInstallments.map(i => i.transactionId!);
    setSelectedIds(new Set(pendingIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleConfirmBatch = () => {
    if (onConfirmBatch && selectedIds.size > 0) {
      onConfirmBatch(Array.from(selectedIds));
      clearSelection();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) clearSelection(); }}>
      <SheetContent className="w-full sm:max-w-lg bg-card">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <SheetTitle className="text-lg">{group.description}</SheetTitle>
          </div>
          
          {/* Progress Overview */}
          <div className="space-y-2 p-3 rounded-lg bg-secondary/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{paidCount} pagas</span>
              <span className="text-muted-foreground">{group.total_installments - paidCount} restantes</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Valor restante:</span>
              <span className="font-semibold text-destructive">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Payment method */}
          <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-secondary/20">
            {group.credit_card ? (
              <>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{group.credit_card.name}</span>
              </>
            ) : group.account ? (
              <>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: group.account.color || 'hsl(var(--primary))' }} 
                />
                <span>{group.account.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Sem conta definida</span>
            )}
            {group.category && (
              <Badge variant="secondary" className="ml-auto text-xs gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: group.category.color || 'hsl(var(--primary))' }} 
                />
                {group.category.name}
              </Badge>
            )}
          </div>

          {/* Batch Selection Controls */}
          {pendingInstallments.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectionMode ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAllPending}
                    className="text-xs"
                  >
                    Selecionar todas ({pendingInstallments.length})
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleConfirmBatch}
                    disabled={selectedIds.size === 0 || isConfirming}
                    className="text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Confirmar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearSelection}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectionMode(true)}
                  className="text-xs"
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Confirmar múltiplas
                </Button>
              )}
            </div>
          )}

          {/* Installments List */}
          <div>
            <h4 className="text-sm font-medium mb-2">Parcelas</h4>
            <ScrollArea className="h-[calc(100vh-440px)]">
              <div className="space-y-2 pr-4">
                {installments.map((item) => (
                  <div 
                    key={item.number}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.status === 'pending' 
                        ? 'border-border bg-background' 
                        : 'border-border/50 bg-secondary/20'
                    } ${selectionMode && item.status === 'pending' && item.transactionId ? 'cursor-pointer hover:border-primary/50' : ''}`}
                    onClick={() => {
                      if (selectionMode && item.status === 'pending' && item.transactionId) {
                        toggleSelection(item.transactionId);
                      }
                    }}
                  >
                    {/* Selection Checkbox */}
                    {selectionMode && item.status === 'pending' && item.transactionId && (
                      <Checkbox
                        checked={selectedIds.has(item.transactionId)}
                        onCheckedChange={() => toggleSelection(item.transactionId!)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    {/* Status Icon */}
                    {!selectionMode && (
                      <div className={`shrink-0 ${
                        item.status === 'paid_before' 
                          ? 'text-muted-foreground' 
                          : item.status === 'confirmed'
                            ? 'text-green-500'
                            : 'text-yellow-500'
                      }`}>
                        {item.status === 'pending' ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </div>
                    )}

                    {/* Installment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Parcela {item.number}/{group.total_installments}
                        </span>
                        {item.status === 'paid_before' && (
                          <Badge variant="outline" className="text-xs">
                            Paga antes
                          </Badge>
                        )}
                      </div>
                      {item.date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.date + 'T12:00:00'), "dd 'de' MMM yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <span className="text-sm font-medium shrink-0">
                      {formatCurrency(item.amount)}
                    </span>

                    {/* Confirm Button (only when not in selection mode) */}
                    {!selectionMode && item.status === 'pending' && item.transactionId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-green-500"
                        onClick={() => onConfirmInstallment(item.transactionId!)}
                        disabled={isConfirming}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
              Editar Parcelamento
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}