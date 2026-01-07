import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, CloudOff, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineSync, SyncStatus } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

const statusConfig: Record<SyncStatus, { icon: typeof Wifi; color: string; text: string }> = {
  idle: { icon: Wifi, color: 'text-muted-foreground', text: '' },
  syncing: { icon: RefreshCw, color: 'text-primary', text: 'Sincronizando...' },
  success: { icon: Check, color: 'text-success', text: 'Sincronizado!' },
  error: { icon: AlertCircle, color: 'text-destructive', text: 'Erro ao sincronizar' },
};

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncStatus, forceSync } = useOfflineSync();

  const showBanner = !isOnline || pendingCount > 0 || syncStatus !== 'idle';
  const StatusIcon = statusConfig[syncStatus].icon;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50 px-4 py-2",
            !isOnline 
              ? "bg-warning/90 text-warning-foreground" 
              : "bg-card/90 backdrop-blur-sm border-b border-border"
          )}
        >
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {!isOnline ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Modo offline - alterações serão salvas localmente
                  </span>
                </>
              ) : (
                <>
                  <StatusIcon 
                    className={cn(
                      "h-4 w-4",
                      statusConfig[syncStatus].color,
                      syncStatus === 'syncing' && "animate-spin"
                    )} 
                  />
                  <span className="text-sm">
                    {statusConfig[syncStatus].text || (
                      pendingCount > 0 
                        ? `${pendingCount} alteração(ões) pendente(s)` 
                        : ''
                    )}
                  </span>
                </>
              )}
            </div>

            {isOnline && pendingCount > 0 && syncStatus !== 'syncing' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={forceSync}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sincronizar
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact version for mobile nav or header
export function OfflineIndicatorCompact() {
  const { isOnline, pendingCount, syncStatus } = useOfflineSync();

  if (isOnline && pendingCount === 0 && syncStatus === 'idle') {
    return null;
  }

  return (
    <div className="relative">
      {!isOnline ? (
        <WifiOff className="h-4 w-4 text-warning" />
      ) : syncStatus === 'syncing' ? (
        <RefreshCw className="h-4 w-4 text-primary animate-spin" />
      ) : pendingCount > 0 ? (
        <>
          <CloudOff className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-warning rounded-full text-[8px] flex items-center justify-center text-warning-foreground font-bold">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        </>
      ) : null}
    </div>
  );
}
