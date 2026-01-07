import { Bell, BellOff, Send, AlertTriangle, CheckCircle2, Info, ExternalLink, RefreshCw, Zap, BarChart3, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const notificationTypes = [
  {
    id: 'budget',
    icon: AlertTriangle,
    title: 'Orçamento',
    description: 'Alertas quando o orçamento está próximo do limite ou ultrapassado',
    color: 'text-amber-400',
  },
  {
    id: 'invoice',
    icon: AlertTriangle,
    title: 'Faturas',
    description: 'Lembretes de faturas de cartão próximas do vencimento',
    color: 'text-red-400',
  },
  {
    id: 'pending',
    icon: Info,
    title: 'Transações Pendentes',
    description: 'Notificações sobre transações que precisam de confirmação',
    color: 'text-purple-400',
  },
  {
    id: 'balance',
    icon: AlertTriangle,
    title: 'Saldo Baixo',
    description: 'Alertas quando o saldo da conta está baixo',
    color: 'text-orange-400',
  },
  {
    id: 'weekly',
    icon: BarChart3,
    title: 'Resumo Semanal',
    description: 'Receba toda segunda-feira um resumo da sua semana financeira',
    color: 'text-emerald-400',
  },
  {
    id: 'savings',
    icon: Target,
    title: 'Metas de Cofrinho',
    description: 'Notificações sobre progresso e conquistas das suas metas',
    color: 'text-cyan-400',
  },
];

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    hasBrowserSubscription,
    hasDbSubscription,
    isLoading,
    isInIframe,
    diagnostics,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push. Tente usar o Chrome, Firefox ou Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const getStatusBadge = () => {
    if (permission === 'denied') {
      return (
        <Badge variant="destructive" className="text-xs">
          Bloqueado no navegador
        </Badge>
      );
    }
    if (isSubscribed) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    if (hasBrowserSubscription && !hasDbSubscription) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
          Sincronizando...
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-400" />
              Notificações Push
            </CardTitle>
            <CardDescription>
              Receba alertas importantes sobre suas finanças diretamente no navegador
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading || permission === 'denied' || isInIframe}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Iframe warning */}
        {isInIframe && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-300 font-medium">
                  Preview incorporado detectado
                </p>
                <p className="text-xs text-amber-400/80 mt-1">
                  As notificações podem não funcionar corretamente em iframes. Abra o app em uma nova aba para ativar.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="mt-2 gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Permission denied warning */}
        {permission === 'denied' && !isInIframe && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              Você bloqueou as notificações no navegador. Para receber alertas:
            </p>
            <ol className="mt-2 text-xs text-red-400/80 list-decimal list-inside space-y-1">
              <li>Clique no ícone de cadeado/info na barra de endereço</li>
              <li>Encontre "Notificações" e mude para "Permitir"</li>
              <li>Recarregue a página</li>
            </ol>
          </div>
        )}

        {/* Subscribed state */}
        {isSubscribed && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-medium">
                Tipos de notificação:
              </p>
              {notificationTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <type.icon className={`h-5 w-5 mt-0.5 ${type.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{type.title}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendTestNotification('local')}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Teste local
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendTestNotification('push')}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Teste push
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              💡 <strong>Dica:</strong> No iOS, instale o app na tela inicial para receber push. 
              No Windows, verifique se as notificações estão ativadas nas Configurações do sistema.
            </p>
          </>
        )}

        {/* Not subscribed state */}
        {!isSubscribed && permission !== 'denied' && !isInIframe && (
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-purple-300">
              Ative as notificações para receber alertas quando:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Seu orçamento estiver próximo do limite</li>
              <li>• Uma fatura de cartão estiver vencendo</li>
              <li>• Você tiver transações pendentes</li>
              <li>• Seu saldo estiver baixo</li>
            </ul>
          </div>
        )}

        {/* Diagnostics (collapsible, for debugging) */}
        {diagnostics && (
          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Diagnóstico técnico
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-muted/20 border border-border/30 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span>Permissão:</span>
                <span className={permission === 'granted' ? 'text-emerald-400' : permission === 'denied' ? 'text-red-400' : 'text-amber-400'}>
                  {permission}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Service Worker:</span>
                <span className={diagnostics.hasServiceWorker ? 'text-emerald-400' : 'text-red-400'}>
                  {diagnostics.hasServiceWorker ? 'OK' : 'Não encontrado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SW controlando:</span>
                <span className={diagnostics.swControlling ? 'text-emerald-400' : 'text-amber-400'}>
                  {diagnostics.swControlling ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subscription (browser):</span>
                <span className={diagnostics.hasBrowserSubscription ? 'text-emerald-400' : 'text-muted-foreground'}>
                  {diagnostics.hasBrowserSubscription ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subscription (DB):</span>
                <span className={diagnostics.hasDbSubscription ? 'text-emerald-400' : 'text-muted-foreground'}>
                  {diagnostics.hasDbSubscription ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VAPID key:</span>
                <span className={diagnostics.vapidKeyLoaded ? 'text-emerald-400' : 'text-red-400'}>
                  {diagnostics.vapidKeyLoaded ? 'Carregada' : 'Não carregada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Em iframe:</span>
                <span className={diagnostics.isInIframe ? 'text-amber-400' : 'text-emerald-400'}>
                  {diagnostics.isInIframe ? 'Sim' : 'Não'}
                </span>
              </div>
            </div>
            {!diagnostics.swControlling && diagnostics.hasServiceWorker && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-2 gap-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Recarregar página
              </Button>
            )}
          </details>
        )}
      </CardContent>
    </Card>
  );
}
