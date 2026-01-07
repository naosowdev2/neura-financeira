import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniImpactPreviewProps {
  currentBalance: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  isVisible: boolean;
}

export function MiniImpactPreview({ 
  currentBalance, 
  amount, 
  type,
  isVisible 
}: MiniImpactPreviewProps) {
  if (!amount || amount <= 0 || type === 'transfer') return null;

  const impact = type === 'income' ? amount : -amount;
  const newBalance = currentBalance + impact;
  const isPositive = impact >= 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "p-3 rounded-lg border-2",
            isPositive 
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : "bg-rose-500/5 border-rose-500/20"
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Impacto estimado:</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                key={newBalance}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "text-sm font-semibold",
                  newBalance < 0 
                    ? "text-rose-500" 
                    : isPositive 
                      ? "text-emerald-600" 
                      : "text-foreground"
                )}
              >
                {formatCurrency(newBalance)}
              </motion.span>
              <div className={cn(
                "flex items-center gap-0.5 text-xs",
                isPositive ? "text-emerald-500" : "text-rose-500"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <motion.span
                  key={amount}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {isPositive ? '+' : ''}{formatCurrency(impact)}
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
