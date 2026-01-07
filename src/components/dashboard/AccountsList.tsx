import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, PiggyBank } from "lucide-react";
import { AccountFormDialog } from "@/components/forms/AccountFormDialog";
import { AccountEditDialog } from "@/components/forms/AccountEditDialog";
import { InstitutionLogo } from "@/components/ui/InstitutionLogo";
import { SavingsGoal } from "@/hooks/useSavingsGoals";

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  color: string;
  icon?: string;
}

interface Props {
  accounts: Account[];
  savingsGoals?: SavingsGoal[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function AccountsList({ accounts, savingsGoals = [] }: Props) {
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setEditOpen(true);
  };

  // Group savings goals by parent_account_id
  const getLinkedGoals = (accountId: string) => {
    return savingsGoals.filter(g => g.parent_account_id === accountId && !g.is_completed);
  };

  // Calculate reserved amount in savings goals
  const getReservedAmount = (accountId: string) => {
    return getLinkedGoals(accountId).reduce((sum, g) => sum + g.current_amount, 0);
  };

  return (
    <>
      <Card className="animate-fade-in card-interactive card-hover-blue" style={{ animationDelay: '400ms' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Minhas Contas</CardTitle>
          <AccountFormDialog />
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma conta cadastrada.
            </p>
          ) : (
            accounts.map((account) => {
              const linkedGoals = getLinkedGoals(account.id);
              const reservedAmount = getReservedAmount(account.id);
              const availableBalance = account.current_balance - reservedAmount;
              const hasLinkedGoals = linkedGoals.length > 0;

              return (
                <div key={account.id} className="space-y-1">
                  <div
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 hover:border-border transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <InstitutionLogo
                        institutionId={account.icon}
                        institutionName={account.name}
                        color={account.color}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-foreground">{account.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`font-mono font-semibold ${account.current_balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                          {formatCurrency(account.current_balance)}
                        </div>
                        {hasLinkedGoals && (
                          <div className="text-xs text-muted-foreground">
                            Disponível: <span className={availableBalance >= 0 ? 'text-primary' : 'text-destructive'}>{formatCurrency(availableBalance)}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/50"
                        onClick={() => handleEdit(account)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Linked Savings Goals as sub-items */}
                  {hasLinkedGoals && (
                    <div className="ml-4 pl-4 border-l-2 border-border/30 space-y-1">
                      {linkedGoals.map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/30 hover:bg-card/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center"
                              style={{ backgroundColor: (goal.color || '#10b981') + '20' }}
                            >
                              <PiggyBank className="h-3 w-3" style={{ color: goal.color || '#10b981' }} />
                            </div>
                            <span className="text-sm text-muted-foreground">{goal.name}</span>
                          </div>
                          <span className="text-sm font-mono" style={{ color: goal.color || '#10b981' }}>
                            {formatCurrency(goal.current_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AccountEditDialog
        account={editingAccount}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}