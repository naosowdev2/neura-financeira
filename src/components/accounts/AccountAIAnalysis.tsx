import { useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroupedTransactions {
  date: string;
  dateLabel: string;
  transactions: any[];
}

interface AccountAIAnalysisProps {
  accountName: string;
  accountColor: string;
  currentBalance: number;
  periodIncome: number;
  periodExpense: number;
  transactions: GroupedTransactions[];
  referenceMonth: string;
}

interface AnalysisResult {
  summary: string;
  insights: string[];
  alerts: string[];
  suggestions: string[];
  patterns: {
    observation: string;
    type: 'warning' | 'info' | 'success';
  }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function AccountAIAnalysis({
  accountName,
  accountColor,
  currentBalance,
  periodIncome,
  periodExpense,
  transactions,
  referenceMonth,
}: AccountAIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Flatten transactions for analysis
      const allTransactions = transactions.flatMap(g => 
        g.transactions.map(t => ({
          description: t.description,
          amount: t.amount,
          type: t.type,
          isIncoming: t.isIncoming,
          date: t.date,
          category: (t as any).categories?.name || 'Sem categoria',
        }))
      );

      const { data, error } = await supabase.functions.invoke('ai-observation-generator', {
        body: {
          type: 'account_analysis',
          context: {
            accountName,
            currentBalance,
            periodIncome,
            periodExpense,
            periodBalance: periodIncome - periodExpense,
            transactionCount: allTransactions.length,
            transactions: allTransactions.slice(0, 20), // Limit for API
            referenceMonth,
          },
        },
      });

      if (error) throw error;
      
      // Parse the response if it's a string
      const analysisData = typeof data === 'string' ? JSON.parse(data) : data;
      setAnalysis({
        summary: analysisData.observation || analysisData.summary || 'Análise concluída.',
        insights: analysisData.insights || [],
        alerts: analysisData.alerts || [],
        suggestions: analysisData.suggestions || [],
        patterns: analysisData.patterns || [],
      });
    } catch (error: any) {
      console.error('Error analyzing account:', error);
      toast.error('Erro ao analisar movimentação');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const transactionCount = transactions.reduce((sum, g) => sum + g.transactions.length, 0);

  if (!analysis) {
    return (
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-full bg-violet-500/20 shrink-0">
              <Sparkles className="h-5 w-5 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Análise da Neura</h3>
              <p className="text-xs text-muted-foreground truncate">
                Analise a movimentação desta conta
              </p>
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || transactionCount === 0}
              size="sm"
              className="gap-1.5 bg-violet-600 hover:bg-violet-700 shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Analisando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Analisar</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-violet-500" />
          Análise da Neura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Summary */}
        <p className="text-sm leading-relaxed">{analysis.summary}</p>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-sm font-semibold text-emerald-600">{formatCurrency(periodIncome)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-sm font-semibold text-destructive">{formatCurrency(periodExpense)}</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {analysis.alerts && analysis.alerts.length > 0 && (
          <div className="space-y-1.5">
            {analysis.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs">{alert}</p>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {analysis.insights && analysis.insights.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Insights</p>
            {analysis.insights.slice(0, 3).map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs">{insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {analysis.suggestions.slice(0, 4).map((suggestion, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {suggestion}
              </Badge>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full text-xs h-8"
        >
          {isAnalyzing ? 'Analisando...' : 'Atualizar análise'}
        </Button>
      </CardContent>
    </Card>
  );
}
