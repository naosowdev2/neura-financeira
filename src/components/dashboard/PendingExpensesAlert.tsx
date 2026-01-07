import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PendingExpensesDetails } from "./PendingExpensesDetails";

interface PendingTransaction {
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
  pendingExpenses: PendingTransaction[];
  totalPending: number;
  selectedDate?: Date;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function PendingExpensesAlert({ 
  pendingExpenses, 
  totalPending, 
  selectedDate = new Date()
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Only show current month's pending expenses
  if (pendingExpenses.length === 0) return null;

  const monthLabel = format(selectedDate, "MMMM", { locale: ptBR });

  return (
    <>
      <Alert className="border-warning bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Despesas Pendentes</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {pendingExpenses.length} despesa{pendingExpenses.length !== 1 ? 's' : ''} em {monthLabel}: <strong>{formatCurrency(totalPending)}</strong>
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4 shrink-0"
            onClick={() => setDetailsOpen(true)}
          >
            Verificar
          </Button>
        </AlertDescription>
      </Alert>

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
