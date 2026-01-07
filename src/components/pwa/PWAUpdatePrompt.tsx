import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function PWAUpdatePrompt() {
  const { needRefresh, offlineReady, updateServiceWorker } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  const showPrompt = (needRefresh || offlineReady) && !dismissed;

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
      >
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground">
                {needRefresh ? "Nova versão disponível" : "Pronto para offline"}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {needRefresh
                  ? "Atualize para obter as últimas melhorias."
                  : "O app está pronto para funcionar offline."}
              </p>
              {needRefresh && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => updateServiceWorker()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar agora
                </Button>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
