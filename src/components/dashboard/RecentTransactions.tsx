import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowLeftRight, Edit2, Sparkles, ArrowRight } from "lucide-react";
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/reports">
              Ver mais <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma transação registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in" style={{ animationDelay: '600ms' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/reports">
              Ver mais <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <TooltipProvider>
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto_auto] gap-3 md:gap-4 items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group"
              >
                {/* Col 1: Ícone + Descrição */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-white/[0.05] shrink-0">
                    <TypeIcon type={transaction.type} />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate text-foreground text-sm">
                      {transaction.description}
                    </span>
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
                </div>

                {/* Col 2: Categoria (hidden mobile) */}
                {transaction.category && (
                  <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: transaction.category.color }}
                    />
                    <span className="truncate max-w-[120px]">{transaction.category.name}</span>
                  </div>
                )}
                {!transaction.category && <div className="hidden md:block" />}

                {/* Col 3: Data (hidden mobile) */}
                <span className="hidden md:block text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(transaction.date), "dd MMM", { locale: ptBR })}
                </span>

                {/* Col 4: Valor + Botão Editar */}
                <div className="flex items-center gap-2 justify-end">
                  <span className={`font-mono font-semibold text-sm whitespace-nowrap ${
                    transaction.type === 'income' ? 'text-green-400' : 
                    transaction.type === 'expense' ? 'text-red-400' : 'text-foreground'
                  }`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.1]"
                    onClick={() => handleEdit(transaction)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
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
