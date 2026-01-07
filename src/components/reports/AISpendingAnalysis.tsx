import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCcw, AlertCircle, Brain } from 'lucide-react';
import { useSpendingAnalysis } from '@/hooks/useSpendingAnalysis';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Props {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: Array<{ name: string; value: number }>;
  incomeByCategory: Array<{ name: string; value: number }>;
  transactions: any[];
  month: string;
  year: string;
}

export function AISpendingAnalysis({
  totalIncome,
  totalExpenses,
  balance,
  expensesByCategory,
  incomeByCategory,
  transactions,
  month,
  year,
}: Props) {
  const { analysis, isLoading, error, analyzeSpending, clearAnalysis } = useSpendingAnalysis();

  const handleAnalyze = () => {
    analyzeSpending({
      totalIncome,
      totalExpenses,
      balance,
      expensesByCategory: expensesByCategory.map(c => ({ name: c.name, value: c.value })),
      incomeByCategory: incomeByCategory.map(c => ({ name: c.name, value: c.value })),
      transactions: transactions.map(t => ({
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category?.name,
        date: t.date,
      })),
      month,
      year,
    });
  };

  // Clear analysis when month/year changes
  useEffect(() => {
    clearAnalysis();
  }, [month, year, clearAnalysis]);

  return (
    <Card className="glass border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise Inteligente
          </CardTitle>
          {analysis && (
            <Button variant="ghost" size="sm" onClick={handleAnalyze} disabled={isLoading}>
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!analysis && !isLoading && !error && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Insights com IA</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clique para obter uma análise personalizada dos seus gastos deste mês
            </p>
            <Button onClick={handleAnalyze} disabled={transactions.length === 0}>
              <Sparkles className="h-4 w-4 mr-2" />
              Analisar Gastos
            </Button>
            {transactions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Adicione transações para habilitar a análise
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              Analisando seus gastos...
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[75%]" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={handleAnalyze}>
              Tentar novamente
            </Button>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-ul:text-foreground/90 prose-li:text-foreground/90">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1 text-foreground">{children}</h3>,
                p: ({ children }) => <p className="text-sm leading-relaxed mb-2 text-foreground/90">{children}</p>,
                ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="text-sm list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
