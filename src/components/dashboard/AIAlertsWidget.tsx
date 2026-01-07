import { AlertTriangle, TrendingDown, PiggyBank, Sparkles, ChevronRight, Bell, RefreshCw, CreditCard, Wallet, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAlerts, Alert } from '@/hooks/useAIAlerts';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const alertIcons = {
  budget: TrendingDown,
  balance: Wallet,
  pattern: Sparkles,
  insight: Sparkles,
  invoice: CreditCard,
  savings: Target,
};

const severityStyles = {
  critical: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    icon: 'text-destructive',
    badge: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-500',
    badge: 'bg-orange-500 text-white',
  },
  info: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    icon: 'text-primary',
    badge: 'bg-primary text-primary-foreground',
  },
};

function AlertItem({ alert, onAction }: { alert: Alert; onAction: (alert: Alert) => void }) {
  const Icon = alertIcons[alert.type as keyof typeof alertIcons] || AlertTriangle;
  const styles = severityStyles[alert.severity];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        styles.bg,
        styles.border,
        alert.actionType && 'cursor-pointer hover:opacity-80'
      )}
      onClick={() => alert.actionType && onAction(alert)}
    >
      <div className={cn('mt-0.5', styles.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{alert.title}</span>
          <Badge className={cn('text-xs px-1.5 py-0', styles.badge)}>
            {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Atenção' : 'Info'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {alert.message}
        </p>
        {alert.actionLabel && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 mt-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onAction(alert);
            }}
          >
            {alert.actionLabel}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-white/[0.05] bg-white/[0.02]">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AIAlertsWidget() {
  const { alerts, isLoading, refetch } = useAIAlerts();
  const navigate = useNavigate();

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  const handleAlertAction = (alert: Alert) => {
    switch (alert.actionType) {
      case 'review_budget':
        navigate('/planning');
        break;
      case 'reduce_spending':
        navigate('/categories');
        break;
      case 'add_income':
        // Could open income dialog, for now navigate to dashboard
        break;
      case 'view_details':
        // Navigate based on alert type
        if (alert.type === 'budget') {
          navigate('/planning');
        } else if (alert.type === 'invoice') {
          navigate('/dashboard');
        } else if (alert.type === 'savings') {
          navigate('/planning');
        }
        break;
      default:
        break;
    }
  };

  return (
    <Card className="card-interactive card-hover-purple">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Alertas Inteligentes</CardTitle>
          {(criticalCount > 0 || warningCount > 0) && (
            <div className="flex gap-1">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="text-xs bg-orange-500 text-white">
                  {warningCount}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AlertsSkeleton />
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-10 w-10 text-primary/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Tudo certo! Nenhum alerta no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <AlertItem key={alert.id} alert={alert} onAction={handleAlertAction} />
            ))}
            {alerts.length > 5 && (
              <Button variant="ghost" className="w-full text-sm">
                Ver todos os {alerts.length} alertas
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
