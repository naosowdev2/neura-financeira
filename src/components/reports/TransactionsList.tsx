import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from "@/components/ui/pagination";
import { List, TrendingUp, TrendingDown, ArrowLeftRight, Clock, Edit2, RefreshCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionEditDialog } from "@/components/forms/TransactionEditDialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: string;
  amount: number;
  status: string;
  category?: {
    name: string;
    color: string;
  } | null;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  notes?: string | null;
  is_recurring?: boolean;
  recurrence_id?: string | null;
}

interface TransactionsListProps {
  transactions: Transaction[];
}

const ITEMS_PER_PAGE = 20;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function TransactionsList({ transactions }: TransactionsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Sort by date descending
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
  
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTransactions, currentPage]);

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income': return 'Receita';
      case 'expense': return 'Despesa';
      case 'transfer': return 'Transferência';
      default: return type;
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('ellipsis');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }
    
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (transactions.length === 0) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <List className="h-5 w-5" />
            Transações do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transação encontrada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="h-5 w-5" />
              Transações do Mês
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mobile: Card Layout */}
          {isMobile ? (
            <div className="space-y-2">
              {paginatedTransactions.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg bg-muted/30 border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleEditClick(t)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="mt-0.5">{getTypeIcon(t.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">{t.description}</span>
                          {(t.is_recurring || t.recurrence_id) && (
                            <RefreshCcw className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{format(parseISO(t.date), 'dd/MM', { locale: ptBR })}</span>
                          {t.category && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <div 
                                  className="w-2 h-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: t.category.color }} 
                                />
                                <span className="truncate max-w-[80px]">{t.category.name}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`font-mono font-medium text-sm ${
                        t.type === 'income' ? 'text-success' : 
                        t.type === 'expense' ? 'text-destructive' : ''
                      }`}>
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                        {formatCurrency(t.amount)}
                      </span>
                      {t.status === 'pending' && (
                        <Badge variant="outline" className="text-xs py-0 px-1.5 gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="hidden xs:inline">Pendente</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: Table Layout */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px]">Categoria</TableHead>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="text-right w-[120px]">Valor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((t) => (
                    <TableRow 
                      key={t.id} 
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => handleEditClick(t)}
                    >
                      <TableCell className="font-mono text-sm">
                        {format(parseISO(t.date), 'dd/MM', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={t.description}>
                            {t.description}
                          </span>
                          {(t.is_recurring || t.recurrence_id) && (
                            <RefreshCcw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.category ? (
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: t.category.color }} 
                            />
                            <span className="text-sm truncate max-w-[90px]" title={t.category.name}>
                              {t.category.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getTypeIcon(t.type)}
                          <span className="text-sm">{getTypeLabel(t.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.status === 'pending' ? (
                          <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Pendente
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Efetivada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-medium ${
                        t.type === 'income' ? 'text-success' : 
                        t.type === 'expense' ? 'text-destructive' : ''
                      }`}>
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>
                        <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((page, idx) => (
                    <PaginationItem key={idx}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionEditDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}
