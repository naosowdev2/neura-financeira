import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertTriangle, PartyPopper, RefreshCw, Lightbulb, X } from 'lucide-react';
import { AIFeedback } from '@/hooks/useSavingsGoalAI';
import { cn } from '@/lib/utils';

interface SavingsGoalAIFeedbackProps {
  feedback: AIFeedback | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onClose?: () => void;
  goalColor?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function SavingsGoalAIFeedback({
  feedback,
  isLoading,
  error,
  onRefresh,
  onClose,
  goalColor = '#10b981',
}: SavingsGoalAIFeedbackProps) {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typing animation effect
  useEffect(() => {
    if (!feedback?.message) {
      setDisplayedMessage('');
      return;
    }

    setIsTyping(true);
    setDisplayedMessage('');
    
    const message = feedback.message;
    let index = 0;
    
    const typeInterval = setInterval(() => {
      if (index < message.length) {
        setDisplayedMessage(prev => prev + message[index]);
        index++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 15); // Speed of typing

    return () => clearInterval(typeInterval);
  }, [feedback?.message]);

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
              {onRefresh && (
                <Button variant="ghost" size="sm" onClick={onRefresh} className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: goalColor + '30' }}
            >
              <Sparkles className="h-5 w-5" style={{ color: goalColor }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Analisando suas finanças...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!feedback) return null;

  const alertStyles = {
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    info: 'border-primary/30 bg-primary/5',
  };

  const AlertIcon = feedback.alertLevel === 'success' ? PartyPopper : 
                    feedback.alertLevel === 'warning' ? AlertTriangle : 
                    TrendingUp;

  return (
    <Card className={cn(
      "relative transition-all duration-300",
      alertStyles[feedback.alertLevel || 'info']
    )}>
      <CardContent className="py-4">
        {onClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <div className="flex items-start gap-3">
          {/* AI Avatar */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: goalColor + '30' }}
          >
            <Sparkles className="h-5 w-5" style={{ color: goalColor }} />
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            {/* Celebration banner */}
            {feedback.celebration && (
              <div className="flex items-center gap-2 text-success font-medium text-sm">
                <PartyPopper className="h-4 w-4" />
                {feedback.celebration}
              </div>
            )}
            
            {/* Main message with typing effect */}
            <p className="text-sm leading-relaxed">
              {displayedMessage}
              {isTyping && <span className="inline-block w-1 h-4 bg-foreground ml-0.5 animate-pulse" />}
            </p>
            
            {/* Projection card */}
            {feedback.projection && !isTyping && (
              <div 
                className="p-3 rounded-lg space-y-2"
                style={{ backgroundColor: goalColor + '10' }}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertIcon className="h-4 w-4" style={{ color: goalColor }} />
                  <span>Projeção</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Tempo estimado</p>
                    <p className="font-semibold">{feedback.projection.monthsToGoal} meses</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sugestão mensal</p>
                    <p className="font-semibold">{formatCurrency(feedback.projection.suggestedMonthly)}</p>
                  </div>
                </div>
                <p className={cn(
                  "text-xs font-medium",
                  feedback.projection.onTrack ? "text-success" : "text-warning"
                )}>
                  {feedback.projection.onTrack 
                    ? "✓ Você está no caminho certo!" 
                    : "⚠ Considere aumentar suas contribuições"}
                </p>
              </div>
            )}
            
            {/* Tips */}
            {feedback.tips && feedback.tips.length > 0 && !isTyping && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  Dicas
                </div>
                <ul className="space-y-1">
                  {feedback.tips.map((tip, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Refresh button */}
            {onRefresh && !isTyping && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRefresh}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Nova análise
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
