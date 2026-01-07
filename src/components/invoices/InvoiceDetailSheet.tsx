import { useState, useMemo } from 'react';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Calendar, 
  Wallet,
  Receipt,
  Pencil,
  Tag
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { InstitutionLogo } from '@/components/ui/InstitutionLogo';
import { PayInvoiceDialog } from './PayInvoiceDialog';
import { InvoiceAIAnalysis } from './InvoiceAIAnalysis';
import { TransactionEditDialog } from '@/components/forms/TransactionEditDialog';
import { useInvoiceTransactions } from '@/hooks/useInvoiceTransactions';
import { useCreditCardInvoices } from '@/hooks/useCreditCardInvoices';
import type { CreditCard as CreditCardType, CreditCardInvoice, Transaction } from '@/types/financial';

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCardType | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getStatusBadge = (status: string, dueDate: string) => {
  const today = new Date();
  const due = parseISO(dueDate);
  const isOverdue = status === 'open' && today > due;
  
  if (status === 'paid') {
    return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Paga</Badge>;
  }
  if (isOverdue) {
    return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Vencida</Badge>;
  }
  if (status === 'closed') {
    return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Fechada</Badge>;
  }
  return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Aberta</Badge>;
};

export function InvoiceDetailSheet({ open, onOpenChange, card }: InvoiceDetailSheetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const { invoices } = useCreditCardInvoices(card?.id);
  
  // Find invoice for current month
  const currentInvoice = useMemo(() => {
    if (!invoices.length) return null;
    const monthStr = format(currentMonth, 'yyyy-MM-01');
    return invoices.find(inv => inv.reference_month?.startsWith(monthStr.slice(0, 7))) || null;
  }, [invoices, currentMonth]);
  
  const { grouped, categories, total, isLoading } = useInvoiceTransactions(
    currentInvoice?.id,
    card?.id,
    format(currentMonth, 'yyyy-MM')
  );
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };
  
  if (!card) return null;
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="p-4 pb-0">
            <div className="flex items-center gap-3">
              <InstitutionLogo institutionId={card.icon} size="lg" />
              <div className="flex-1">
                <SheetTitle className="text-left">{card.name}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Fecha dia {card.closing_day} • Vence dia {card.due_day}
                </p>
              </div>
            </div>
          </SheetHeader>
          
          {/* Month Navigator */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium capitalize">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Invoice Summary */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor da Fatura</p>
                      <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                    </div>
                    {currentInvoice && getStatusBadge(currentInvoice.status, currentInvoice.due_date)}
                  </div>
                  
                  {currentInvoice && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Fecha: {format(parseISO(currentInvoice.closing_date), 'dd/MM')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        <span>Vence: {format(parseISO(currentInvoice.due_date), 'dd/MM')}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      size="sm"
                      onClick={() => setPayDialogOpen(true)}
                      disabled={!currentInvoice || currentInvoice.status === 'paid'}
                    >
                      <Wallet className="h-4 w-4 mr-1" />
                      Pagar Fatura
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* AI Analysis */}
              <InvoiceAIAnalysis
                cardName={card.name}
                invoiceTotal={total}
                categories={categories}
                transactionCount={grouped.reduce((sum, g) => sum + g.transactions.length, 0)}
                referenceMonth={format(currentMonth, 'yyyy-MM')}
              />
              
              {/* Transactions List */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">Transações</h3>
                  <Badge variant="secondary" className="text-xs">
                    {grouped.reduce((sum, g) => sum + g.transactions.length, 0)}
                  </Badge>
                </div>
                
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Carregando transações...
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Nenhuma transação neste período
                  </div>
                ) : (
                  grouped.map((group) => (
                    <div key={group.date} className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="capitalize">{group.dateLabel}</span>
                        <span className="font-medium">{formatCurrency(group.total)}</span>
                      </div>
                      
                      {group.transactions.map((transaction) => {
                        const category = (transaction as any).category;
                        return (
                          <div 
                            key={transaction.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                            onClick={() => setEditingTransaction(transaction)}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div 
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${category?.color || '#8b5cf6'}20` }}
                              >
                                <Tag 
                                  className="h-3 w-3 sm:h-4 sm:w-4" 
                                  style={{ color: category?.color || '#8b5cf6' }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-none">
                                  {transaction.description}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {category?.name || 'Sem categoria'}
                                  {transaction.installment_number && transaction.total_installments && (
                                    <span className="ml-1">
                                      • {transaction.installment_number}/{transaction.total_installments}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                              <span className="font-medium text-destructive text-sm">
                                {formatCurrency(Number(transaction.amount))}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTransaction(transaction);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Pay Dialog */}
      <PayInvoiceDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        invoice={currentInvoice}
        card={card}
        invoiceTotal={total}
      />
      
      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <TransactionEditDialog
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
        />
      )}
    </>
  );
}
