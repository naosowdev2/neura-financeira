import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Calendar, CalendarRange } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoice: (choice: 'this_only' | 'this_and_future') => void;
  action: 'edit' | 'delete';
  transactionDate?: string | null;
  isLoading?: boolean;
  transactionType?: 'recurring' | 'installment';
  installmentInfo?: {
    currentNumber: number;
    totalInstallments: number;
  };
}

export function RecurrenceEditChoice({ 
  open, 
  onOpenChange, 
  onChoice, 
  action, 
  transactionDate,
  isLoading,
  transactionType = 'recurring',
  installmentInfo
}: Props) {
  // Early return if not open - avoid computing invalid dates
  if (!open) return null;

  const isInstallment = transactionType === 'installment';

  // Safely parse and format date
  let capitalizedMonth = "mês selecionado";
  if (transactionDate) {
    const parsedDate = parseISO(transactionDate);
    if (isValid(parsedDate)) {
      const monthName = format(parsedDate, 'MMMM', { locale: ptBR });
      capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }
  }

  // Dynamic content based on transaction type
  let title: string;
  let description: string;
  let thisOnlyLabel: string;
  let thisOnlyDescription: string;
  let futureLabel: string;
  let futureDescription: string;

  if (isInstallment) {
    const currentNum = installmentInfo?.currentNumber ?? 1;
    const totalNum = installmentInfo?.totalInstallments ?? 1;
    
    title = action === 'edit' 
      ? 'Despesa Parcelada' 
      : 'Excluir Parcela';
    
    description = action === 'edit'
      ? 'Essa transação está parcelada. Você pode atualizar o valor para as parcelas futuras ou apenas o valor desta parcela.'
      : `Essa transação está parcelada (${currentNum}/${totalNum}). Você pode excluir apenas esta parcela ou esta e todas as futuras.`;

    thisOnlyLabel = action === 'edit' 
      ? 'Atualizar apenas esta parcela' 
      : 'Apenas esta parcela';
    
    thisOnlyDescription = action === 'edit'
      ? 'As outras parcelas continuarão com o valor original'
      : 'As outras parcelas continuarão existindo';

    futureLabel = action === 'edit' 
      ? 'Atualizar esta e as próximas' 
      : 'Esta e todas as próximas';
    
    futureDescription = action === 'edit'
      ? `Atualiza da parcela ${currentNum}/${totalNum} até ${totalNum}/${totalNum}`
      : `Exclui da parcela ${currentNum}/${totalNum} até ${totalNum}/${totalNum}`;
  } else {
    title = action === 'edit' 
      ? 'Como deseja aplicar essas alterações?' 
      : 'Como deseja excluir?';

    description = action === 'edit'
      ? `Essa é uma transação fixa e você pode escolher entre aplicar as alterações apenas para o mês selecionado (${capitalizedMonth}) ou dele em diante.`
      : `Essa é uma transação fixa e você pode escolher entre excluir apenas do mês selecionado (${capitalizedMonth}) ou dele em diante.`;

    thisOnlyLabel = action === 'edit' 
      ? 'Apenas no mês selecionado' 
      : 'Apenas esta';
    
    thisOnlyDescription = action === 'edit'
      ? 'As outras ocorrências continuarão iguais'
      : 'A recorrência continuará nos próximos meses';

    futureLabel = action === 'edit' 
      ? 'Mês selecionado em diante' 
      : 'Esta e futuras';
    
    futureDescription = action === 'edit'
      ? 'Atualiza a recorrência e todas as futuras'
      : 'Encerra a recorrência a partir deste mês';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <RefreshCcw className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3 px-4"
            onClick={() => onChoice('this_only')}
            disabled={isLoading}
          >
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">{thisOnlyLabel}</div>
              <div className="text-xs text-muted-foreground">
                {thisOnlyDescription}
              </div>
            </div>
          </Button>

          <Button
            variant={action === 'delete' ? 'destructive' : 'default'}
            className="justify-start gap-3 h-auto py-3 px-4"
            onClick={() => onChoice('this_and_future')}
            disabled={isLoading}
          >
            <CalendarRange className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">{futureLabel}</div>
              <div className="text-xs opacity-80">
                {futureDescription}
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
