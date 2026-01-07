import { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight, Check, Search, Scale } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAccountTransactions } from '@/hooks/useAccountTransactions';
import { TransactionEditDialog } from '@/components/forms/TransactionEditDialog';
import { AccountAIAnalysis } from './AccountAIAnalysis';

interface Account {
  id: string;
  name: string;
  calculated_balance?: number | null;
  current_balance?: number | null;
  color?: string | null;
}

interface Props {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function AccountHistorySheet({ account, open, onOpenChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const { groupedTransactions, totals, isLoading } = useAccountTransactions(
    account?.id ?? null,
    currentMonth
  );

  // Filtrar transações por tipo e busca
  const filteredGroupedTransactions = useMemo(() => {
    return groupedTransactions.map(group => ({
      ...group,
      transactions: group.transactions.filter(t => {
        const matchesSearch = searchTerm === '' || 
          t.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || 
          (typeFilter === 'income' && t.isIncoming) ||
          (typeFilter === 'expense' && !t.isIncoming);
        return matchesSearch && matchesType;
      })
    })).filter(group => group.transactions.length > 0);
  }, [groupedTransactions, searchTerm, typeFilter]);

  const handlePreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleTransactionClick = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    if (editingTransaction?.id) {
      setSavedTransactionId(editingTransaction.id);
      setTimeout(() => setSavedTransactionId(null), 2000);
    }
  };

  const balance = account?.calculated_balance ?? account?.current_balance ?? 0;
  const periodBalance = totals.income - totals.expense;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="space-y-4">
          <SheetTitle className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: account?.color || '#6366f1' }}
            />
            {account?.name}
          </SheetTitle>
          
          {/* Saldo Atual */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatCurrency(balance)}
            </p>
          </div>

          {/* Navegação de Mês */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
            <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Resumo do Período */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-500/10 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-sm font-semibold text-emerald-600">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="bg-destructive/10 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-sm font-semibold text-destructive">
                {formatCurrency(totals.expense)}
              </p>
            </div>
            <div className={`rounded-lg p-2 ${periodBalance >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={`text-sm font-semibold ${periodBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(periodBalance)}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <ToggleGroup 
              type="single" 
              value={typeFilter} 
              onValueChange={(value) => value && setTypeFilter(value)}
              className="justify-start"
            >
              <ToggleGroupItem value="all" size="sm" className="text-xs">
                Todas
              </ToggleGroupItem>
              <ToggleGroupItem value="income" size="sm" className="text-xs text-emerald-600">
                Entradas
              </ToggleGroupItem>
              <ToggleGroupItem value="expense" size="sm" className="text-xs text-destructive">
                Saídas
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </SheetHeader>

        {/* Conteúdo Rolável */}
        <ScrollArea className="h-[calc(100vh-480px)] mt-4 pr-4">
          {/* AI Analysis */}
          <div className="mb-4">
            <AccountAIAnalysis
              accountName={account?.name || ''}
              accountColor={account?.color || '#6366f1'}
              currentBalance={balance}
              periodIncome={totals.income}
              periodExpense={totals.expense}
              transactions={groupedTransactions}
              referenceMonth={format(currentMonth, 'yyyy-MM')}
            />
          </div>

          {/* Lista de Transações */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando transações...
            </div>
          ) : filteredGroupedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || typeFilter !== 'all' 
                ? 'Nenhuma transação encontrada com os filtros aplicados'
                : 'Nenhuma transação neste período'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroupedTransactions.map((group) => (
                <div key={group.date}>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    {group.dateLabel}
                  </p>
                  <div className="space-y-2">
                    {group.transactions.map((t) => {
                      const isAdjustment = t.type === 'adjustment';
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleTransactionClick(t)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                            savedTransactionId === t.id 
                              ? 'bg-emerald-500/20 ring-2 ring-emerald-500' 
                              : 'bg-muted/30 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full transition-all duration-300 ${
                              savedTransactionId === t.id
                                ? 'bg-emerald-500 text-white'
                                : isAdjustment
                                  ? 'bg-blue-500/20 text-blue-600'
                                  : t.isIncoming 
                                    ? 'bg-emerald-500/20 text-emerald-600' 
                                    : 'bg-destructive/20 text-destructive'
                            }`}>
                              {savedTransactionId === t.id ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : isAdjustment ? (
                                <Scale className="h-3.5 w-3.5" />
                              ) : t.isIncoming ? (
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t.description}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {t.type === 'transfer' ? 'Transferência' : 
                                 t.type === 'income' ? 'Receita' : 
                                 t.type === 'adjustment' ? 'Ajuste' : 'Despesa'}
                                {(t as any).adjustment_reason && ` • ${(t as any).adjustment_reason}`}
                                {(t as any).categories?.name && !isAdjustment && ` • ${(t as any).categories.name}`}
                              </p>
                            </div>
                          </div>
                          <p className={`font-semibold ${
                            isAdjustment 
                              ? 'text-blue-600'
                              : t.isIncoming ? 'text-emerald-600' : 'text-destructive'
                          }`}>
                            {t.isIncoming ? '+' : '-'}{formatCurrency(Math.abs(Number(t.amount)))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <TransactionEditDialog
          transaction={editingTransaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleEditSuccess}
        />
      </SheetContent>
    </Sheet>
  );
}
