import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { getBillingMonth, parseDateOnly } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { Wallet, CreditCard, Plus, Pencil, History, Scale, BanknoteIcon } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCreditCardInvoices } from '@/hooks/useCreditCardInvoices';
import { useTransactions } from '@/hooks/useTransactions';
import { AccountFormDialog } from '@/components/forms/AccountFormDialog';
import { AccountEditDialog } from '@/components/forms/AccountEditDialog';
import { CreditCardFormDialog } from '@/components/forms/CreditCardFormDialog';
import { CreditCardEditDialog } from '@/components/forms/CreditCardEditDialog';
import { InstitutionLogo } from '@/components/ui/InstitutionLogo';
import { InvoiceDetailSheet } from '@/components/invoices/InvoiceDetailSheet';
import { PayInvoiceDialog } from '@/components/invoices/PayInvoiceDialog';
import { AccountHistorySheet } from '@/components/accounts/AccountHistorySheet';
import { BalanceAdjustmentDialog } from '@/components/forms/BalanceAdjustmentDialog';
import { MonthNavigator } from '@/components/dashboard/MonthNavigator';
import type { CreditCard as CreditCardType } from '@/types/financial';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  investment: 'Investimento',
};

export default function Accounts() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'cards' ? 'cards' : 'accounts';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<any>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [adjustmentAccount, setAdjustmentAccount] = useState<any>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [payInvoiceOpen, setPayInvoiceOpen] = useState(false);
  const [payingCard, setPayingCard] = useState<CreditCardType | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<any>(null);

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  const { invoices } = useCreditCardInvoices();
  const { transactions } = useTransactions();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'cards') {
      setActiveTab('cards');
    }
  }, [searchParams]);

  const totalAccounts = accounts.reduce((sum, acc) => sum + (acc.calculated_balance ?? acc.current_balance ?? 0), 0);
  const activeAccountsCount = accounts.length;

  // Get invoice amount for a card in the selected month
  const getCardCurrentInvoice = useMemo(() => {
    return (cardId: string) => {
      const selectedMonth = format(selectedDate, 'yyyy-MM');
      
      // Find the card to get its closing_day
      const card = creditCards.find(c => c.id === cardId);
      const closingDay = card?.closing_day || 1;
      
      // Get invoice totals for the selected month
      const cardInvoices = invoices.filter(inv => {
        const invoiceMonth = format(parseDateOnly(inv.reference_month), 'yyyy-MM');
        return inv.credit_card_id === cardId && 
               inv.status === 'open' && 
               invoiceMonth === selectedMonth;
      });
      const fromInvoices = cardInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
      // Also include orphan transactions that BELONG to this billing month (respecting closing_day)
      const orphanTxns = transactions.filter(t => {
        if (t.credit_card_id !== cardId || t.invoice_id || t.type !== 'expense' || t.status !== 'confirmed') {
          return false;
        }
        // Calculate which billing month this transaction belongs to
        const txnDate = parseDateOnly(t.date);
        const billingMonth = getBillingMonth(txnDate, closingDay);
        const billingMonthStr = format(billingMonth, 'yyyy-MM');
        return billingMonthStr === selectedMonth;
      });
      const orphanTotal = orphanTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      return fromInvoices + orphanTotal;
    };
  }, [invoices, transactions, selectedDate, creditCards]);

  // Calculate totals based on selected month
  const totalInvoices = useMemo(() => {
    return creditCards.reduce((sum, card) => sum + getCardCurrentInvoice(card.id), 0);
  }, [creditCards, getCardCurrentInvoice]);
  
  const totalLimit = creditCards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  const availableLimit = totalLimit - totalInvoices;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="container mx-auto py-6 px-4 max-w-6xl">
      <PageHeader
        title="Contas e Cartões"
        description="Gerencie suas contas bancárias e cartões de crédito"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Contas
          </TabsTrigger>
          <TabsTrigger value="cards" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cartões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6 space-y-6">
          {/* Resumo de Contas */}
          <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total em Contas</p>
                  <p className={`text-xl sm:text-2xl font-bold ${totalAccounts >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(totalAccounts)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-muted-foreground">{activeAccountsCount} conta{activeAccountsCount !== 1 ? 's' : ''} ativa{activeAccountsCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid de Contas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Carregando contas...
              </div>
            ) : accounts.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhuma conta cadastrada
              </div>
            ) : (
              accounts.map((account) => (
                <Card 
                  key={account.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderLeftColor: account.color || '#6366f1', borderLeftWidth: '4px' }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <InstitutionLogo institutionId={account.icon} size="md" />
                        <div>
                          <CardTitle className="text-base">{account.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-xl font-bold ${(account.calculated_balance ?? account.current_balance ?? 0) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(account.calculated_balance ?? account.current_balance ?? 0)}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAccount(account);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAdjustmentAccount(account);
                          setAdjustmentDialogOpen(true);
                        }}
                      >
                        <Scale className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryAccount(account);
                          setHistorySheetOpen(true);
                        }}
                      >
                        <History className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Botão Nova Conta */}
          <div className="flex justify-center">
            <AccountFormDialog
              trigger={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Conta
                </Button>
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="cards" className="mt-6 space-y-6">
          {/* Month Navigator */}
          <MonthNavigator 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />

          {/* Resumo de Cartões */}
          <Card className="bg-gradient-to-r from-pink-500/10 to-pink-600/5 border-pink-500/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Faturas de {format(selectedDate, "MMMM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(totalInvoices)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Limite Disponível</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(availableLimit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid de Cartões */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cardsLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Carregando cartões...
              </div>
            ) : creditCards.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhum cartão cadastrado
              </div>
            ) : (
              creditCards.map((card) => {
                const currentInvoice = getCardCurrentInvoice(card.id);
                const usagePercent = card.credit_limit > 0 
                  ? Math.min((currentInvoice / card.credit_limit) * 100, 100) 
                  : 0;
                const cardAvailableLimit = (card.credit_limit || 0) - currentInvoice;

                // Get invoice status for this card and month
                const selectedMonth = format(selectedDate, 'yyyy-MM');
                const cardInvoice = invoices.find(inv => {
                  const invoiceMonth = format(parseDateOnly(inv.reference_month), 'yyyy-MM');
                  return inv.credit_card_id === card.id && invoiceMonth === selectedMonth;
                });
                
                const getInvoiceStatus = () => {
                  if (!cardInvoice) {
                    return currentInvoice > 0 
                      ? { label: 'Aberta', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
                      : { label: 'Sem fatura', color: 'bg-muted text-muted-foreground border-muted' };
                  }
                  if (cardInvoice.status === 'paid') {
                    return { label: 'Paga', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
                  }
                  if (cardInvoice.status === 'closed') {
                    return { label: 'Fechada', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
                  }
                  return { label: 'Aberta', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
                };
                
                const invoiceStatus = getInvoiceStatus();

                return (
                  <Card 
                    key={card.id} 
                    className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                    style={{ borderLeftColor: card.color || '#ec4899', borderLeftWidth: '4px' }}
                    onClick={() => {
                      setSelectedCard(card as CreditCardType);
                      setInvoiceSheetOpen(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <InstitutionLogo institutionId={card.icon} size="md" />
                          <div>
                            <CardTitle className="text-base">{card.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Vencimento: dia {card.due_day} • Fecha: dia {card.closing_day}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs text-muted-foreground">
                              Fatura {format(selectedDate, "MMM/yy", { locale: ptBR })}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 h-4 ${invoiceStatus.color}`}
                            >
                              {invoiceStatus.label}
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-destructive">
                            {formatCurrency(currentInvoice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Disponível</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatCurrency(cardAvailableLimit)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Uso do Limite</span>
                          <span>{usagePercent.toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={usagePercent} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          Limite: {formatCurrency(card.credit_limit || 0)}
                        </p>
                      </div>

                      <div className="flex gap-2 mt-4">
                        {/* Pay Invoice Button - only show when invoice is closed */}
                        {cardInvoice?.status === 'closed' && currentInvoice > 0 && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPayingCard(card as CreditCardType);
                              setPayingInvoice(cardInvoice);
                              setPayInvoiceOpen(true);
                            }}
                          >
                            <BanknoteIcon className="h-3 w-3 mr-1" />
                            Pagar Fatura
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cardInvoice?.status === 'closed' && currentInvoice > 0 ? "" : "flex-1"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCard(card);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Botão Novo Cartão */}
          <div className="flex justify-center">
            <CreditCardFormDialog
              trigger={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Cartão
                </Button>
              }
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs de Edição */}
      {editingAccount && (
        <AccountEditDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
        />
      )}

      {editingCard && (
        <CreditCardEditDialog
          card={editingCard}
          open={!!editingCard}
          onOpenChange={(open) => !open && setEditingCard(null)}
        />
      )}

      {/* Invoice Detail Sheet */}
      <InvoiceDetailSheet
        card={selectedCard}
        open={invoiceSheetOpen}
        onOpenChange={setInvoiceSheetOpen}
      />

      {/* Account History Sheet */}
      <AccountHistorySheet
        account={historyAccount}
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
      />

      {/* Balance Adjustment Dialog */}
      {adjustmentAccount && (
        <BalanceAdjustmentDialog
          account={adjustmentAccount}
          open={adjustmentDialogOpen}
          onOpenChange={(open) => {
            setAdjustmentDialogOpen(open);
            if (!open) setAdjustmentAccount(null);
          }}
        />
      )}

      {/* Pay Invoice Dialog */}
      <PayInvoiceDialog
        open={payInvoiceOpen}
        onOpenChange={(open) => {
          setPayInvoiceOpen(open);
          if (!open) {
            setPayingCard(null);
            setPayingInvoice(null);
          }
        }}
        invoice={payingInvoice}
        card={payingCard}
        invoiceTotal={payingInvoice?.total_amount || 0}
      />
      </div>
    </div>
  );
}
