import { useState } from 'react';
import { Brain, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SmartTransactionInput } from './SmartTransactionInput';
import { SmartTransactionPreview } from './SmartTransactionPreview';
import { ImpactAnalysisCard } from './ImpactAnalysisCard';
import { useSmartTransaction } from '@/hooks/useSmartTransaction';

interface SmartTransactionDialogProps {
  trigger?: React.ReactNode;
}

const stepVariants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }
  },
  exit: { 
    opacity: 0, 
    x: -20, 
    scale: 0.98,
    transition: { duration: 0.2 }
  },
};

const successVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring" as const,
      stiffness: 200,
      damping: 15
    }
  },
};

export function SmartTransactionDialog({ trigger }: SmartTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    step,
    inputText,
    classification,
    impactAnalysis,
    isClassifying,
    isAnalyzingImpact,
    isCreating,
    classifyText,
    updateClassification,
    confirmPreview,
    goBackToPreview,
    goBackToInput,
    createTransaction,
    reset,
  } = useSmartTransaction();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      reset();
    }
  };

  const handleSuccess = () => {
    setTimeout(() => {
      handleOpenChange(false);
    }, 2000);
  };

  if (step === 'success' && open) {
    handleSuccess();
  }

  const stepTitles = {
    input: 'Novo Lançamento',
    preview: 'Confirme os Dados',
    impact: 'Análise de Impacto',
    success: 'Lançamento Criado!',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            Lançamento Inteligente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.div
              key={step}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              <Brain className="h-5 w-5 text-primary" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.span
                key={step}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {stepTitles[step]}
              </motion.span>
            </AnimatePresence>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <SmartTransactionInput
                value={inputText}
                onChange={(text) => classifyText(text)}
                onSubmit={classifyText}
                isLoading={isClassifying}
              />
            </motion.div>
          )}

          {step === 'preview' && classification && (
            <motion.div
              key="preview"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <SmartTransactionPreview
                classification={classification}
                onUpdate={updateClassification}
                onConfirm={confirmPreview}
                onBack={goBackToInput}
              />
            </motion.div>
          )}

          {step === 'impact' && classification && (
            <motion.div
              key="impact"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4"
            >
              <ImpactAnalysisCard
                analysis={impactAnalysis}
                isLoading={isAnalyzingImpact}
                transactionType={classification.type}
                transactionAmount={classification.amount || 0}
              />

              {!isAnalyzingImpact && (
                <motion.div 
                  className="flex gap-3 pt-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBackToPreview}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    Ajustar
                  </Button>
                  <Button
                    type="button"
                    onClick={createTransaction}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? 'Criando...' : 'Confirmar Lançamento'}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              variants={successVariants}
              initial="initial"
              animate="animate"
              className="py-8 text-center space-y-4"
            >
              <motion.div 
                className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 12,
                  delay: 0.1
                }}
              >
                <PartyPopper className="h-8 w-8 text-emerald-500" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-lg font-semibold">Lançamento criado!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua transação foi registrada com sucesso.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
