import { useState, useMemo } from "react";
import { useInstallments } from "@/hooks/useInstallments";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CategorySelector } from "@/components/forms/CategorySelector";
import { CurrencyField } from "@/components/forms/CurrencyField";
import { InstallmentDetailSheet } from "./InstallmentDetailSheet";
import { InstallmentProjectionChart } from "./InstallmentProjectionChart";
import { Layers, Trash2, Edit2, Calendar, CreditCard, Eye, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InstallmentGroup } from "@/types/financial";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function InstallmentsTab() {
  const { installmentGroups, isLoading, updateInstallmentGroup, deleteInstallmentGroup, confirmInstallment, confirmBatchInstallments } = useInstallments();
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { categories } = useCategories();
  
  // Detail sheet state
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<InstallmentGroup | null>(null);
  
  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<InstallmentGroup | null>(null);
  
  // Form state
  const [description, setDescription] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [updateFutureTransactions, setUpdateFutureTransactions] = useState(true);
  const [startingInstallment, setStartingInstallment] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [originalStarting, setOriginalStarting] = useState(1);
  const [originalTotal, setOriginalTotal] = useState(1);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [creditCardFilter, setCreditCardFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const resetForm = () => {
    setDescription('');
    setInstallmentAmount(0);
    setCategoryId('');
    setAccountId('');
    setCreditCardId('');
    setUpdateFutureTransactions(true);
    setStartingInstallment(1);
    setTotalInstallments(1);
    setOriginalStarting(1);
    setOriginalTotal(1);
    setEditingGroup(null);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setCreditCardFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || creditCardFilter !== 'all' || categoryFilter !== 'all';

  // Get unique categories used in installments
  const usedCategories = useMemo(() => {
    const categoryIds = new Set(installmentGroups.map(g => g.category_id).filter(Boolean));
    return categories.filter(c => categoryIds.has(c.id));
  }, [installmentGroups, categories]);

  // Get unique credit cards used in installments
  const usedCreditCards = useMemo(() => {
    const cardIds = new Set(installmentGroups.map(g => g.credit_card_id).filter(Boolean));
    return creditCards.filter(c => cardIds.has(c.id));
  }, [installmentGroups, creditCards]);

  // Calculate paid count for a group
  const calculatePaidCount = (group: InstallmentGroup) => {
    const installmentNumbers = (group.transactions as any[] || [])
      .filter((t: any) => t.installment_number !== null)
      .map((t: any) => t.installment_number as number);
    
    const minInstallment = installmentNumbers.length > 0 
      ? Math.min(...installmentNumbers) 
      : 1;

    const paidBeforeStart = minInstallment - 1;
    const paidFromGroup = (group.transactions as any[] || [])
      .filter((t: any) => t.status === 'confirmed').length;

    return paidBeforeStart + paidFromGroup;
  };

  // Filter installment groups
  const filteredGroups = useMemo(() => {
    return installmentGroups.filter(group => {
      // Status filter
      if (statusFilter !== 'all') {
        const paidCount = calculatePaidCount(group);
        const isCompleted = paidCount >= group.total_installments;
        
        if (statusFilter === 'active' && isCompleted) return false;
        if (statusFilter === 'completed' && !isCompleted) return false;
      }
      
      // Credit card filter
      if (creditCardFilter !== 'all' && group.credit_card_id !== creditCardFilter) {
        return false;
      }
      
      // Category filter
      if (categoryFilter !== 'all' && group.category_id !== categoryFilter) {
        return false;
      }
      
      return true;
    });
  }, [installmentGroups, statusFilter, creditCardFilter, categoryFilter]);

  const handleOpenDetail = (group: InstallmentGroup) => {
    setViewingGroup(group);
    setDetailOpen(true);
  };

  const handleOpenEdit = (group: InstallmentGroup) => {
    // Calculate starting installment from transactions
    const installmentNumbers = (group.transactions as any[] || [])
      .filter((t: any) => t.installment_number !== null)
      .map((t: any) => t.installment_number as number);
    
    const minInstallment = installmentNumbers.length > 0 
      ? Math.min(...installmentNumbers) 
      : 1;

    setEditingGroup(group);
    setDescription(group.description);
    setInstallmentAmount(group.installment_amount);
    setCategoryId(group.category_id || '');
    setAccountId(group.account_id || '');
    setCreditCardId(group.credit_card_id || '');
    setUpdateFutureTransactions(true);
    setStartingInstallment(minInstallment);
    setTotalInstallments(group.total_installments);
    setOriginalStarting(minInstallment);
    setOriginalTotal(group.total_installments);
    setDetailOpen(false);
    setEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    const hasInstallmentChanges = startingInstallment !== originalStarting || totalInstallments !== originalTotal;

    await updateInstallmentGroup.mutateAsync({
      id: editingGroup.id,
      description: description !== editingGroup.description ? description : undefined,
      installment_amount: installmentAmount !== editingGroup.installment_amount ? installmentAmount : undefined,
      category_id: categoryId !== editingGroup.category_id ? (categoryId || null) : undefined,
      account_id: accountId !== editingGroup.account_id ? (accountId || null) : undefined,
      credit_card_id: creditCardId !== editingGroup.credit_card_id ? (creditCardId || null) : undefined,
      update_future_transactions: updateFutureTransactions,
      ...(hasInstallmentChanges && {
        starting_installment: startingInstallment,
        total_installments: totalInstallments,
      }),
    });

    setEditOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteInstallmentGroup.mutateAsync(id);
  };

  const handleConfirmInstallment = async (transactionId: string) => {
    await confirmInstallment.mutateAsync(transactionId);
  };

  const handleConfirmBatch = async (transactionIds: string[]) => {
    await confirmBatchInstallments.mutateAsync(transactionIds);
  };

  const renderInstallmentCard = (group: InstallmentGroup) => {
    const paidInstallments = calculatePaidCount(group);
    const totalInstallmentsCount = group.total_installments;
    const progress = (paidInstallments / totalInstallmentsCount) * 100;
    
    const remainingInstallments = totalInstallmentsCount - paidInstallments;
    const remainingAmount = remainingInstallments * group.installment_amount;

    return (
      <Card 
        key={group.id} 
        className="glass cursor-pointer transition-all hover:border-primary/50"
        onClick={() => handleOpenDetail(group)}
      >
        <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-2 pb-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">{group.description}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {paidInstallments}/{totalInstallmentsCount} parcelas
                </Badge>
                {group.category && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: group.category.color || '#6366f1' }} 
                    />
                    <span className="truncate max-w-[80px]">{group.category.name}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-primary shrink-0">
            {formatCurrency(group.installment_amount)}/mês
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{paidInstallments} pagas</span>
              <span className="text-muted-foreground">{remainingInstallments} restantes</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Payment method */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {group.credit_card ? (
              <>
                <CreditCard className="h-4 w-4" />
                <span>{group.credit_card.name}</span>
              </>
            ) : group.account ? (
              <>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.account.color || '#6366f1' }} />
                <span>{group.account.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground/50">Sem conta definida</span>
            )}
          </div>

          {/* Dates and amounts */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Início
              </p>
              <p className="font-medium">
                {format(new Date(group.first_installment_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor restante</p>
              <p className="font-medium text-destructive">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="pt-2 border-t border-border/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor total:</span>
              <span className="font-semibold">{formatCurrency(group.total_amount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end pt-2 border-t border-border/30 gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={(e) => { e.stopPropagation(); handleOpenDetail(group); }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={(e) => { e.stopPropagation(); handleOpenEdit(group); }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir parcelamento?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Esta ação não pode ser desfeita. O parcelamento "{group.description}" será permanentemente removido.
                      </p>
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Parcelas a excluir:</span>
                          <span className="font-semibold text-destructive">
                            {(group.transactions as any[] || []).length} parcelas
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor total afetado:</span>
                          <span className="font-semibold text-destructive">
                            {formatCurrency(
                              (group.transactions as any[] || [])
                                .reduce((sum, t: any) => sum + (t.amount || 0), 0)
                            )}
                          </span>
                        </div>
                        {group.credit_card && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cartão:</span>
                            <span className="font-medium flex items-center gap-1.5">
                              <CreditCard className="h-3 w-3" />
                              {group.credit_card.name}
                            </span>
                          </div>
                        )}
                        {group.account && !group.credit_card && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Conta:</span>
                            <span className="font-medium flex items-center gap-1.5">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: group.account.color || '#6366f1' }} 
                              />
                              {group.account.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDelete(group.id)} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir {(group.transactions as any[] || []).length} parcelas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Preview for installment changes
  const hasInstallmentChanges = startingInstallment !== originalStarting || totalInstallments !== originalTotal;
  const previewInstallmentsNeeded = totalInstallments - startingInstallment + 1;
  const previewTotalAmount = installmentAmount * previewInstallmentsNeeded;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Parcelamentos</h2>
          <p className="text-muted-foreground">Acompanhe suas compras parceladas</p>
        </div>
      </div>

      {/* Projection Chart */}
      {installmentGroups.length > 0 && (
        <InstallmentProjectionChart 
          installmentGroups={installmentGroups} 
          creditCards={creditCards}
        />
      )}

      {/* Filters */}
      {installmentGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="completed">Finalizados</SelectItem>
            </SelectContent>
          </Select>

          {/* Credit Card Filter */}
          {usedCreditCards.length > 0 && (
            <Select value={creditCardFilter} onValueChange={setCreditCardFilter}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue placeholder="Cartão" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos os cartões</SelectItem>
                {usedCreditCards.map(card => (
                  <SelectItem key={card.id} value={card.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color || '#ec4899' }} />
                      {card.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Category Filter */}
          {usedCategories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas categorias</SelectItem>
                {usedCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}

          {/* Results Counter */}
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredGroups.length} de {installmentGroups.length}
            </span>
          )}
        </div>
      )}

      {/* Detail Sheet */}
      <InstallmentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        group={viewingGroup}
        onEdit={() => viewingGroup && handleOpenEdit(viewingGroup)}
        onConfirmInstallment={handleConfirmInstallment}
        onConfirmBatch={handleConfirmBatch}
        isConfirming={confirmInstallment.isPending || confirmBatchInstallments.isPending}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Editar Parcelamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Installment Amount */}
            <div className="space-y-2">
              <Label>Valor da Parcela</Label>
              <CurrencyField
                value={installmentAmount}
                onChange={setInstallmentAmount}
                required
              />
            </div>

            {/* Installment Numbers - Editable */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starting">Parcela Inicial</Label>
                <Input
                  id="starting"
                  type="number"
                  min={1}
                  max={totalInstallments}
                  value={startingInstallment}
                  onChange={(e) => setStartingInstallment(Math.max(1, Math.min(parseInt(e.target.value) || 1, totalInstallments)))}
                />
                <p className="text-xs text-muted-foreground">
                  Anteriores = pagas antes do cadastro
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="total">Total de Parcelas</Label>
                <Input
                  id="total"
                  type="number"
                  min={startingInstallment}
                  max={99}
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(Math.max(startingInstallment, parseInt(e.target.value) || startingInstallment))}
                />
              </div>
            </div>

            {/* Preview of changes */}
            {hasInstallmentChanges && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm font-medium text-amber-500 mb-2">Preview das alterações:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Parcelas já pagas: <span className="font-medium">{startingInstallment - 1}</span></li>
                  <li>• Parcelas restantes: <span className="font-medium">{previewInstallmentsNeeded}</span></li>
                  <li>• Novo valor total: <span className="font-medium">{formatCurrency(previewTotalAmount)}</span></li>
                </ul>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <CategorySelector
                value={categoryId}
                onChange={setCategoryId}
                type="expense"
                placeholder="Selecione uma categoria"
              />
            </div>

            {/* Payment Method */}
            {editingGroup?.credit_card_id ? (
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color || '#ec4899' }} />
                          {card.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#6366f1' }} />
                          {acc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Update future transactions toggle */}
            {!hasInstallmentChanges && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div>
                  <Label>Atualizar parcelas futuras</Label>
                  <p className="text-xs text-muted-foreground">
                    Aplica as alterações às parcelas pendentes
                  </p>
                </div>
                <Switch
                  checked={updateFutureTransactions}
                  onCheckedChange={setUpdateFutureTransactions}
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updateInstallmentGroup.isPending}
            >
              {updateInstallmentGroup.isPending ? 'Salvando...' : 'Atualizar Parcelamento'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : installmentGroups.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Nenhum parcelamento cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie um parcelamento ao adicionar uma nova despesa
            </p>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Nenhum resultado</h3>
            <p className="text-muted-foreground mb-4">
              Nenhum parcelamento corresponde aos filtros selecionados
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredGroups.map(renderInstallmentCard)}
        </div>
      )}
    </div>
  );
}