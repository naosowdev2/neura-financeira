import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "neura-install-banner-dismissed";
const SHOW_AFTER_VISITS = 3;
const VISIT_COUNT_KEY = "neura-visit-count";

export function InstallBanner() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already dismissed
    const wasDismissed = localStorage.getItem(DISMISS_KEY);
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Count visits
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, visitCount.toString());

    // Show banner after a few visits
    if (visitCount >= SHOW_AFTER_VISITS) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  const handleInstall = async () => {
    if (isIOS) {
      navigate("/install");
      return;
    }

    setIsLoading(true);
    try {
      await promptInstall();
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if already installed or running as standalone
  if (isInstalled || isStandalone) return null;

  // Don't show if not installable (except for iOS which needs manual instructions)
  if (!isInstallable && !isIOS) return null;

  // Don't show if dismissed
  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-2 px-4"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Smartphone className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium truncate">
              Instale a Neura no seu dispositivo
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstall}
              disabled={isLoading}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              {isIOS ? "Como instalar" : "Instalar"}
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-primary-foreground/10 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
