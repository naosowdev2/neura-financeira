import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowLeftRight, Edit2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionEditDialog } from "@/components/forms/TransactionEditDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category?: { name: string; color: string } | null;
  account?: { name: string } | null;
  category_id?: string;
  account_id?: string;
  credit_card_id?: string;
  notes?: string;
  ai_notes?: string | null;
}

interface Props {
  transactions: Transaction[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'income':
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    case 'expense':
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    case 'transfer':
      return <ArrowLeftRight className="h-4 w-4 text-blue-400" />;
    default:
      return null;
  }
};

export function RecentTransactions({ transactions }: Props) {
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditOpen(true);
  };

  if (transactions.length === 0) {
    return (
      <Card className="animate-fade-in" style={{ animationDelay: '600ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/40 text-center py-8">
            Nenhuma transação registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in" style={{ animationDelay: '600ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipProvider>
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-start justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group gap-2"
              >
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                  <div className="p-2 rounded-xl bg-white/[0.05] mt-0.5 shrink-0">
                    <TypeIcon type={transaction.type} />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate text-foreground text-sm sm:text-base">{transaction.description}</p>
                      {transaction.ai_notes && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-shrink-0 p-1 rounded-full bg-purple-500/20 cursor-help">
                              <Sparkles className="h-3 w-3 text-purple-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs bg-black/90 backdrop-blur-xl border-white/10">
                            <p className="text-sm">{transaction.ai_notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-white/40 flex-wrap">
                      {transaction.category && (
                        <>
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: transaction.category.color }}
                          />
                          <span className="truncate max-w-[80px] sm:max-w-none">{transaction.category.name}</span>
                          <span className="hidden sm:inline">•</span>
                        </>
                      )}
                      <span className="flex-shrink-0">
                        {format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    </div>
                    {transaction.ai_notes && (
                      <p className="text-xs text-purple-400/70 mt-1 line-clamp-1 hidden sm:block">
                        {transaction.ai_notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className={`font-mono font-semibold text-sm sm:text-base ${
                    transaction.type === 'income' ? 'text-green-400' : 
                    transaction.type === 'expense' ? 'text-red-400' : 'text-foreground'
                  }`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {formatCurrency(transaction.amount)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.1]"
                    onClick={() => handleEdit(transaction)}
                  >
                    <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TooltipProvider>
        </CardContent>
      </Card>

      {editingTransaction && (
        <TransactionEditDialog
          transaction={editingTransaction}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingTransaction(null);
          }}
        />
      )}
    </>
  );
}