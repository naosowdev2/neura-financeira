import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";
import { useSavingsGoalHistory } from "@/hooks/useSavingsGoalHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface SavingsGoalHistoryProps {
  goalId: string;
  goalColor: string;
}

export function SavingsGoalHistory({ goalId, goalColor }: SavingsGoalHistoryProps) {
  const { history, isLoading } = useSavingsGoalHistory(goalId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="pt-2 border-t border-border/50">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  const displayedHistory = showAll ? history : history.slice(0, 5);

  return (
    <div className="pt-2 border-t border-border/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico ({history.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pl-1">
              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div 
                  className="absolute left-[5px] top-2 bottom-2 w-[2px] rounded-full"
                  style={{ backgroundColor: goalColor + '30' }}
                />

                {/* Timeline items */}
                <div className="space-y-3">
                  {displayedHistory.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      {/* Circle indicator */}
                      <div 
                        className="relative z-10 w-3 h-3 rounded-full mt-1 ring-2 ring-background"
                        style={{ 
                          backgroundColor: item.type === 'deposit' ? '#22c55e' : '#ef4444'
                        }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {item.type === 'deposit' ? (
                              <ArrowDownCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : (
                              <ArrowUpCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                            <span className="text-xs font-medium">
                              {item.type === 'deposit' ? 'Depósito' : 'Resgate'}
                            </span>
                          </div>
                          <span 
                            className="text-xs font-semibold"
                            style={{ color: item.type === 'deposit' ? '#22c55e' : '#ef4444' }}
                          >
                            {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                          <span>
                            {format(new Date(item.date), "dd MMM", { locale: ptBR })}
                          </span>
                          {item.accountName && (
                            <span className="truncate max-w-[100px]">
                              {item.accountName}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Show more button */}
              {history.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll(!showAll);
                  }}
                >
                  {showAll ? 'Ver menos' : `Ver mais ${history.length - 5} movimentações`}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
