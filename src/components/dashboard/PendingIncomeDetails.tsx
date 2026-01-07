import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Pencil, Trash2, RefreshCcw, Calendar, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionEditDialog } from "@/components/forms/TransactionEditDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  is_recurring?: boolean;
  recurrence_id?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  category?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingIncome: Transaction[];
  totalPending: number;
  monthLabel?: string;
}

type FilterType = 'all' | 'recurring' | 'single';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function PendingIncomeDetails({ open, onOpenChange, pendingIncome, totalPending, monthLabel }: Props) {
  const isMobile = useIsMobile();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const { updateTransaction, deleteTransaction } = useTransactions();

  const handleConfirm = async (transaction: Transaction) => {
    await updateTransaction.mutateAsync({
      id: transaction.id,
      status: 'confirmed',
    });
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction.mutateAsync(id);
  };

  // Filter income
  const filteredIncome = useMemo(() => {
    if (filter === 'all') return pendingIncome;
    if (filter === 'recurring') return pendingIncome.filter(e => e.recurrence_id || e.is_recurring);
    if (filter === 'single') return pendingIncome.filter(e => !e.recurrence_id && !e.is_recurring);
    return pendingIncome;
  }, [pendingIncome, filter]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredIncome.forEach(income => {
      const dateKey = income.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(income);
    });
    
    // Sort dates
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  }, [filteredIncome]);

  const filteredTotal = filteredIncome.reduce((sum, e) => sum + Number(e.amount), 0);

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'recurring', label: 'Recorrentes' },
    { key: 'single', label: 'Avulsas' },
  ];

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary */}
      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total pendente {monthLabel ? `em ${monthLabel}` : ''}</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPending)}</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
            {pendingIncome.length} {pendingIncome.length === 1 ? 'receita' : 'receitas'}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground self-center" />
        {filterButtons.map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
            className={cn(
              "text-xs h-7",
              filter === key ? "bg-primary" : "bg-transparent"
            )}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Filtered total if different */}
      {filter !== 'all' && (
        <p className="text-sm text-muted-foreground mb-3">
          Mostrando {filteredIncome.length} {filteredIncome.length === 1 ? 'receita' : 'receitas'} • {formatCurrency(filteredTotal)}
        </p>
      )}

      {/* List grouped by date */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <div className="space-y-4 pb-6">
          {groupedByDate.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma receita pendente</p>
          ) : (
            groupedByDate.map(({ date, items }) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-card py-1 z-10">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {format(parseISO(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                
                {/* Items for this date */}
                <div className="space-y-2">
                  {items.map(income => (
                    <div
                      key={income.id}
                      className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{income.description}</p>
                            {(income.is_recurring || income.recurrence_id) && (
                              <Badge variant="outline" className="text-xs gap-1 border-blue-500/50 text-blue-400 shrink-0">
                                <RefreshCcw className="h-3 w-3" /> Recorrente
                              </Badge>
                            )}
                          </div>
                          {income.category && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: income.category.color || '#6366f1' }}
                              />
                              <span className="text-xs text-muted-foreground">{income.category.name}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-emerald-400 shrink-0">
                          {formatCurrency(income.amount)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-w-[100px] border-success/50 bg-success/10 text-success hover:bg-success/20 hover:border-success/70 backdrop-blur-sm"
                          onClick={() => handleConfirm(income)}
                          disabled={updateTransaction.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Efetivar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTransaction(income)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A receita "{income.description}" será permanentemente removida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(income.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingTransaction && (
        <TransactionEditDialog
          transaction={editingTransaction as any}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
        />
      )}
    </div>
  );

  // Use Drawer for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85dvh] max-h-[85dvh] overflow-hidden flex flex-col">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Calendar className="h-4 w-4 text-emerald-400" />
              </div>
              Receitas Pendentes
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 flex flex-col flex-1 min-h-0 overflow-hidden">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] overflow-hidden !flex !flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Calendar className="h-4 w-4 text-emerald-400" />
            </div>
            Receitas Pendentes
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
