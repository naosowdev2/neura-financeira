import { AlertTriangle, Bell, TrendingUp, Wallet, CreditCard, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/hooks/useAIAlerts';
import { cn } from '@/lib/utils';

interface NeuraProactiveAlertsProps {
  alerts: Alert[];
  onAlertClick: (prompt: string) => void;
  maxAlerts?: number;
}

const severityStyles = {
  critical: {
    container: 'bg-destructive/10 border-destructive/30',
    icon: 'text-destructive',
    badge: 'bg-destructive text-destructive-foreground'
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/30',
    icon: 'text-amber-500',
    badge: 'bg-amber-500 text-white'
  },
  info: {
    container: 'bg-primary/10 border-primary/30',
    icon: 'text-primary',
    badge: 'bg-primary text-primary-foreground'
  }
};

const typeIcons = {
  budget: TrendingUp,
  balance: Wallet,
  pattern: Sparkles,
  insight: Target,
  invoice: CreditCard,
  savings: Target
};

export function NeuraProactiveAlerts({ alerts, onAlertClick, maxAlerts = 3 }: NeuraProactiveAlertsProps) {
  // Filter to show only critical and warning alerts first, then info
  const prioritizedAlerts = [...alerts]
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, maxAlerts);

  if (prioritizedAlerts.length === 0) return null;

  const hasCriticalOrWarning = prioritizedAlerts.some(
    a => a.severity === 'critical' || a.severity === 'warning'
  );

  const getPromptForAlert = (alert: Alert): string => {
    switch (alert.type) {
      case 'invoice':
        return `Me ajude com a fatura que está vencendo: ${alert.title}. ${alert.message}`;
      case 'budget':
        return `Me ajude a controlar o orçamento: ${alert.title}. ${alert.message}`;
      case 'balance':
        return `Preciso de ajuda com meu saldo: ${alert.title}. ${alert.message}`;
      case 'savings':
        return `Como posso completar minha meta: ${alert.title}? ${alert.message}`;
      case 'pattern':
        return `Analise esse padrão de gastos: ${alert.message}`;
      default:
        return `Me explique melhor: ${alert.message}`;
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Bell className="h-4 w-4" />
        <span>
          {hasCriticalOrWarning 
            ? 'Neura precisa da sua atenção:' 
            : 'Atualizações da Neura:'}
        </span>
      </div>

      <div className="space-y-2">
        {prioritizedAlerts.map((alert) => {
          const styles = severityStyles[alert.severity];
          const IconComponent = typeIcons[alert.type] || AlertTriangle;

          return (
            <div
              key={alert.id}
              className={cn(
                'p-3 rounded-lg border transition-all hover:shadow-sm',
                styles.container
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('shrink-0 mt-0.5', styles.icon)}>
                  <IconComponent className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {alert.title}
                    </span>
                    {alert.severity === 'critical' && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', styles.badge)}>
                        Urgente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {alert.message}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-xs h-7"
                  onClick={() => onAlertClick(getPromptForAlert(alert))}
                >
                  {alert.actionLabel || 'Saber mais'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > maxAlerts && (
        <p className="text-xs text-center text-muted-foreground">
          +{alerts.length - maxAlerts} outros alertas
        </p>
      )}
    </div>
  );
}
