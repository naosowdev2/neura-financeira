import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WeeklySummaryBanner() {
  const { unreadSummary, markAsRead, isLoading } = useWeeklySummary();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isLoading || !unreadSummary || isDismissed) {
    return null;
  }

  const summary = unreadSummary.summary_data;
  const weekStart = format(parseISO(unreadSummary.week_start), "dd/MM", { locale: ptBR });
  const weekEnd = format(parseISO(unreadSummary.week_end), "dd/MM", { locale: ptBR });

  const handleDismiss = () => {
    markAsRead(unreadSummary.id);
    setIsDismissed(true);
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'attention':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-cyan-400" />;
      default:
        return null;
    }
  };

  const balanceColor = summary.summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400';
  const BalanceIcon = summary.summary.balance >= 0 ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-background to-cyan-500/5 overflow-hidden relative">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                <BarChart3 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Resumo Semanal
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                    {weekStart} - {weekEnd}
                  </Badge>
                </CardTitle>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Receitas</p>
              <p className="text-lg font-semibold text-emerald-400">
                R$ {summary.summary.totalIncome.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Despesas</p>
              <p className="text-lg font-semibold text-red-400">
                R$ {summary.summary.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Saldo</p>
              <div className="flex items-center justify-center gap-1">
                <BalanceIcon className={`h-4 w-4 ${balanceColor}`} />
                <p className={`text-lg font-semibold ${balanceColor}`}>
                  R$ {Math.abs(summary.summary.balance).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Badge */}
          {summary.summary.comparedToLastWeek && (
            <div className="flex justify-center">
              <Badge 
                className={`${
                  summary.summary.comparedToLastWeek.startsWith('-') 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {summary.summary.comparedToLastWeek.startsWith('-') ? '↓' : '↑'} {summary.summary.comparedToLastWeek} vs semana anterior
              </Badge>
            </div>
          )}

          {/* Highlights */}
          <div className="space-y-2">
            {summary.highlights.slice(0, isExpanded ? undefined : 3).map((highlight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                {getHighlightIcon(highlight.type)}
                <span className="text-muted-foreground">{highlight.message}</span>
              </motion.div>
            ))}
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2"
              >
                {/* Top Categories */}
                {summary.topCategories.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Top Categorias</p>
                    <div className="space-y-2">
                      {summary.topCategories.slice(0, 3).map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-muted-foreground">{cat.name}</span>
                          </div>
                          <span className="font-medium">R$ {cat.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {unreadSummary.ai_analysis && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium">Análise da Neura</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {unreadSummary.ai_analysis}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver análise completa
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
