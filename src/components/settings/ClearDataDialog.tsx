import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertTriangle, Loader2, Info, CheckCircle2, XCircle, Circle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useClearData, DataType, DEPENDENCIES, TABLE_LABELS, DeletionProgress } from '@/hooks/useClearData';

interface DataOption {
  id: DataType;
  label: string;
  description: string;
}

const DATA_OPTIONS: DataOption[] = [
  { id: 'transactions', label: 'Transações', description: 'Todas as receitas, despesas e transferências' },
  { id: 'credit_card_invoices', label: 'Faturas de Cartão', description: 'Histórico de faturas dos cartões' },
  { id: 'credit_cards', label: 'Cartões de Crédito', description: 'Todos os cartões cadastrados' },
  { id: 'accounts', label: 'Contas Bancárias', description: 'Todas as contas e seus saldos' },
  { id: 'categories', label: 'Categorias', description: 'Categorias de receitas e despesas' },
  { id: 'recurrences', label: 'Recorrências', description: 'Transações programadas' },
  { id: 'budgets', label: 'Orçamentos', description: 'Limites de gastos por categoria' },
  { id: 'balance_audit', label: 'Histórico de Auditoria', description: 'Log de alterações de saldo' },
  { id: 'installment_groups', label: 'Parcelamentos', description: 'Grupos de compras parceladas' },
  { id: 'savings_goals', label: 'Metas de Economia', description: 'Objetivos financeiros' },
];

const DEPENDENCY_LABELS: Record<DataType, string> = {
  transactions: 'transações',
  credit_card_invoices: 'faturas',
  credit_cards: 'cartões',
  accounts: 'contas',
  categories: 'categorias',
  recurrences: 'recorrências',
  budgets: 'orçamentos',
  balance_audit: 'auditoria',
  installment_groups: 'parcelamentos',
  savings_goals: 'metas',
};

export function ClearDataDialog() {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<DataType>>(new Set());
  const [progress, setProgress] = useState<DeletionProgress | null>(null);
  const { clearData, isClearing } = useClearData();

  const isConfirmed = confirmText === 'CONFIRMAR';
  const hasSelection = selectedTypes.size > 0;

  const toggleType = (type: DataType) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const selectAll = () => {
    setSelectedTypes(new Set(DATA_OPTIONS.map(o => o.id)));
  };

  const deselectAll = () => {
    setSelectedTypes(new Set());
  };

  // Calcula avisos de dependências
  const dependencyWarnings = useMemo(() => {
    const warnings: string[] = [];
    
    selectedTypes.forEach(type => {
      const deps = DEPENDENCIES[type];
      const missingDeps = deps.filter(dep => !selectedTypes.has(dep));
      
      if (missingDeps.length > 0) {
        const depLabels = missingDeps.map(d => DEPENDENCY_LABELS[d]).join(', ');
        warnings.push(`"${DEPENDENCY_LABELS[type]}" pode ter ${depLabels} vinculadas que serão desvinculadas.`);
      }
    });

    if (selectedTypes.has('accounts') && !selectedTypes.has('transactions')) {
      warnings.push('Excluir contas vai desvincular as transações dessas contas.');
    }
    if (selectedTypes.has('credit_cards') && !selectedTypes.has('credit_card_invoices')) {
      warnings.push('Excluir cartões vai também excluir suas faturas automaticamente.');
    }
    if (selectedTypes.has('categories') && !selectedTypes.has('transactions')) {
      warnings.push('Transações perderão suas categorias mas serão mantidas.');
    }

    return [...new Set(warnings)];
  }, [selectedTypes]);

  const handleClear = async () => {
    setProgress(null);
    
    await clearData.mutateAsync({
      dataTypes: Array.from(selectedTypes),
      onProgress: setProgress,
    });
    
    await queryClient.invalidateQueries();
    
    setConfirmText('');
    setSelectedTypes(new Set());
    setOpen(false);
    setProgress(null);
    
    window.location.reload();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isClearing) {
      setOpen(newOpen);
      if (!newOpen) {
        setConfirmText('');
        setSelectedTypes(new Set());
        setProgress(null);
      }
    }
  };

  const getTableIcon = (table: DataType) => {
    if (!progress) return <Circle className="h-4 w-4 text-muted-foreground" />;
    if (progress.completedTables.includes(table)) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (progress.errorTables.includes(table)) return <XCircle className="h-4 w-4 text-destructive" />;
    if (progress.currentTable === table && progress.status === 'deleting') {
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const progressPercent = progress 
    ? Math.round(((progress.completedTables.length + progress.errorTables.length) / progress.totalTables) * 100)
    : 0;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Limpar Dados
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Limpar Dados Seletivamente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {!isClearing ? (
                <>
                  <p>Selecione os tipos de dados que deseja excluir:</p>
                  
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                      Selecionar Tudo
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                      Desmarcar Tudo
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {DATA_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedTypes.has(option.id)}
                          onCheckedChange={() => toggleType(option.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm text-foreground">
                            {option.label}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {dependencyWarnings.length > 0 && (
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-md space-y-1">
                      <div className="flex items-center gap-2 text-warning">
                        <Info className="h-4 w-4" />
                        <span className="text-sm font-medium">Avisos:</span>
                      </div>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                        {dependencyWarnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasSelection && (
                    <>
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm font-medium text-destructive">
                          ⚠️ ESTA AÇÃO NÃO PODE SER DESFEITA!
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          Digite <strong>CONFIRMAR</strong> para prosseguir:
                        </p>
                        <Input
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder="Digite CONFIRMAR"
                          className="font-mono"
                        />
                      </div>
                    </>
                  )}

                  {!hasSelection && (
                    <p className="text-sm text-muted-foreground italic">
                      Selecione pelo menos um tipo de dado para continuar.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Excluindo dados...</p>
                  
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {progressPercent}% concluído
                  </p>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {Array.from(selectedTypes).map((type) => (
                      <div
                        key={type}
                        className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                      >
                        {getTableIcon(type)}
                        <span className={`text-sm ${
                          progress?.completedTables.includes(type) 
                            ? 'text-green-500' 
                            : progress?.errorTables.includes(type)
                              ? 'text-destructive'
                              : progress?.currentTable === type
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground'
                        }`}>
                          {TABLE_LABELS[type]}
                        </span>
                        {progress?.currentTable === type && progress.status === 'deleting' && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            Excluindo...
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {progress && progress.errorTables.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-xs text-destructive">
                        {progress.errorTables.length} tabela(s) com erro
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isClearing}
            onClick={() => {
              setConfirmText('');
              setSelectedTypes(new Set());
              setProgress(null);
            }}
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleClear}
            disabled={!isConfirmed || !hasSelection || isClearing}
          >
            {isClearing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Selecionados ({selectedTypes.size})
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
