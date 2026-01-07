import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import { PendingExpensesDetails } from "./PendingExpensesDetails";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  is_recurring?: boolean;
  recurrence_id?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  category?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}

interface Props {
  pendingExpenses: Transaction[];
  totalPending: number;
  monthLabel?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function PendingExpensesCard({ pendingExpenses, totalPending, monthLabel }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (pendingExpenses.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="glass-hover animate-fade-in card-interactive border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/60">Despesas Pendentes</CardTitle>
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Clock className="h-4 w-4 text-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {formatCurrency(totalPending)}
              </div>
              <p className="text-xs text-white/40 mt-1">
                {pendingExpenses.length} despesa{pendingExpenses.length !== 1 ? 's' : ''} pendente{pendingExpenses.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
              onClick={() => setDetailsOpen(true)}
            >
              Ver detalhes <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <PendingExpensesDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        pendingExpenses={pendingExpenses}
        totalPending={totalPending}
        monthLabel={monthLabel}
      />
    </>
  );
}
