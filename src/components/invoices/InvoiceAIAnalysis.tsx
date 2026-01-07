import { useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CategorySummary {
  category_id: string | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
}

interface InvoiceAIAnalysisProps {
  cardName: string;
  invoiceTotal: number;
  categories: CategorySummary[];
  transactionCount: number;
  referenceMonth?: string;
}

interface AnalysisResult {
  summary: string;
  insights: string[];
  alerts: string[];
  suggestions: string[];
  categoryHighlights: {
    category: string;
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

export function InvoiceAIAnalysis({
  cardName,
  invoiceTotal,
  categories,
  transactionCount,
  referenceMonth,
}: InvoiceAIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-invoice-analyzer', {
        body: {
          cardName,
          invoiceTotal,
          categories,
          transactionCount,
          referenceMonth,
        },
      });

      if (error) throw error;
      setAnalysis(data);
    } catch (error: any) {
      console.error('Error analyzing invoice:', error);
      toast.error('Erro ao analisar fatura: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!analysis) {
    return (
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-violet-500/20">
              <Sparkles className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <h3 className="font-semibold">Análise Inteligente</h3>
              <p className="text-sm text-muted-foreground">
                A Neura pode analisar esta fatura e fornecer insights personalizados
              </p>
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analisar com Neura
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-violet-500" />
          Análise da Neura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm">{analysis.summary}</p>

        {/* Category breakdown */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Distribuição por categoria</p>
            {categories.slice(0, 5).map((cat) => (
              <div key={cat.category_id || 'none'} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{cat.category_name}</span>
                  <span className="font-medium">{formatCurrency(cat.total)}</span>
                </div>
                <Progress 
                  value={cat.percentage} 
                  className="h-1.5"
                  style={{ 
                    '--progress-color': cat.category_color 
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {analysis.alerts && analysis.alerts.length > 0 && (
          <div className="space-y-2">
            {analysis.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs">{alert}</p>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {analysis.insights && analysis.insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Insights</p>
            {analysis.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs">{insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Sugestões</p>
            {analysis.suggestions.map((suggestion, i) => (
              <Badge key={i} variant="secondary" className="text-xs mr-1 mb-1">
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
          className="w-full text-xs"
        >
          {isAnalyzing ? 'Analisando...' : 'Atualizar análise'}
        </Button>
      </CardContent>
    </Card>
  );
}
