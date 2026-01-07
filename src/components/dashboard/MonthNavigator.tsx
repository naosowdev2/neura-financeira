import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function MonthNavigator({ selectedDate, onDateChange }: Props) {
  const handlePrevMonth = () => {
    onDateChange(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(selectedDate, 1));
  };

  const monthYearLabel = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-semibold capitalize min-w-[200px] text-center">
        {monthYearLabel}
      </h2>
      <Button variant="ghost" size="icon" onClick={handleNextMonth}>
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
