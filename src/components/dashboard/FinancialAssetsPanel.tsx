import { useState } from "react";
import { Wallet, CreditCard, PiggyBank, Plus, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { InstitutionLogo } from "@/components/ui/InstitutionLogo";
import { AccountFormDialog } from "@/components/forms/AccountFormDialog";
import { AccountEditDialog } from "@/components/forms/AccountEditDialog";
import { CreditCardFormDialog } from "@/components/forms/CreditCardFormDialog";
import { CreditCardEditDialog } from "@/components/forms/CreditCardEditDialog";
import { SavingsGoal } from "@/hooks/useSavingsGoals";

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  color?: string | null;
  icon?: string | null;
}

interface CreditCardData {
  id: string;
  name: string;
  credit_limit: number;
  current_invoice: number;
  available_limit: number;
  color?: string | null;
  due_day: number;
  icon?: string | null;
}

interface FinancialAssetsPanelProps {
  accounts: Account[];
  creditCards: CreditCardData[];
  savingsGoals: SavingsGoal[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function FinancialAssetsPanel({ 
  accounts, 
  creditCards, 
  savingsGoals 
}: FinancialAssetsPanelProps) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountEditOpen, setAccountEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardData | null>(null);
  const [cardEditOpen, setCardEditOpen] = useState(false);

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const totalCreditUsed = creditCards.reduce((sum, card) => sum + Number(card.current_invoice), 0);
  const activeGoals = savingsGoals.filter(g => !g.is_completed);
  const totalSaved = activeGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountEditOpen(true);
  };

  const handleEditCard = (card: CreditCardData) => {
    setEditingCard(card);
    setCardEditOpen(true);
  };

  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b bg-muted/30">
          <TabsTrigger value="accounts" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Contas</span>
          </TabsTrigger>
          <TabsTrigger value="cards" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cartões</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <PiggyBank className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Metas</span>
          </TabsTrigger>
        </TabsList>

        <CardContent className="p-3">
          {/* Accounts Tab */}
          <TabsContent value="accounts" className="mt-0 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Total em contas</span>
              <span className={`text-sm font-semibold ${totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
            <div className="space-y-1 max-h-[180px] overflow-y-auto">
              {accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma conta cadastrada
                </p>
              ) : (
                accounts.map((account) => (
                  <motion.div
                    key={account.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group cursor-pointer"
                    onClick={() => handleEditAccount(account)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <InstitutionLogo institutionId={account.icon} institutionName={account.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{account.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{account.type}</p>
                    </div>
                    <span className={`text-xs font-medium ${Number(account.current_balance) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(account.current_balance)}
                    </span>
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </motion.div>
                ))
              )}
            </div>
            <AccountFormDialog
              trigger={
                <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2">
                  <Plus className="h-3.5 w-3.5" /> Nova Conta
                </Button>
              }
            />
          </TabsContent>

          {/* Credit Cards Tab */}
          <TabsContent value="cards" className="mt-0 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Fatura atual</span>
              <span className="text-sm font-semibold text-red-500">
                {formatCurrency(totalCreditUsed)}
              </span>
            </div>
            <div className="space-y-1 max-h-[180px] overflow-y-auto">
              {creditCards.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum cartão cadastrado
                </p>
              ) : (
                creditCards.map((card) => {
                  const usagePercent = card.credit_limit > 0 
                    ? (card.current_invoice / card.credit_limit) * 100 
                    : 0;
                  return (
                    <motion.div
                      key={card.id}
                      className="p-2 rounded-lg hover:bg-muted/50 group cursor-pointer"
                      onClick={() => handleEditCard(card)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <InstitutionLogo institutionId={card.icon} institutionName={card.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{card.name}</p>
                          <p className="text-[10px] text-muted-foreground">Vence dia {card.due_day}</p>
                        </div>
                        <span className="text-xs font-medium text-red-500">
                          {formatCurrency(card.current_invoice)}
                        </span>
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </div>
                      <Progress 
                        value={Math.min(usagePercent, 100)} 
                        className="h-1"
                      />
                    </motion.div>
                  );
                })
              )}
            </div>
            <CreditCardFormDialog
              trigger={
                <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2">
                  <Plus className="h-3.5 w-3.5" /> Novo Cartão
                </Button>
              }
            />
          </TabsContent>

          {/* Savings Goals Tab */}
          <TabsContent value="goals" className="mt-0 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Total guardado</span>
              <span className="text-sm font-semibold text-emerald-500">
                {formatCurrency(totalSaved)}
              </span>
            </div>
            <div className="space-y-1 max-h-[180px] overflow-y-auto">
              {activeGoals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma meta ativa
                </p>
              ) : (
                activeGoals.map((goal) => {
                  const progress = goal.target_amount 
                    ? (goal.current_amount / goal.target_amount) * 100 
                    : 0;
                  return (
                    <div
                      key={goal.id}
                      className="p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: goal.color || '#6366f1' }}
                        >
                          <PiggyBank className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{goal.name}</p>
                          {goal.target_amount && (
                            <p className="text-[10px] text-muted-foreground">
                              {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-emerald-500">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-1" />
                    </div>
                  );
                })
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-1.5 mt-2"
              onClick={() => window.location.href = '/planning?tab=savings'}
            >
              <Plus className="h-3.5 w-3.5" /> Nova Meta
            </Button>
          </TabsContent>
        </CardContent>
      </Tabs>

      {/* Edit Dialogs */}
      <AccountEditDialog
        open={accountEditOpen}
        onOpenChange={setAccountEditOpen}
        account={editingAccount}
      />
      <CreditCardEditDialog
        open={cardEditOpen}
        onOpenChange={setCardEditOpen}
        card={editingCard}
      />
    </Card>
  );
}
