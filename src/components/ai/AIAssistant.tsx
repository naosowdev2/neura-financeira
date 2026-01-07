import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Send, X, MessageCircle, Trash2, PartyPopper, Loader2, Sparkles, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAssistant } from '@/hooks/useAI';
import { useDashboard } from '@/hooks/useDashboard';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useRecurrences } from '@/hooks/useRecurrences';
import { useInstallments } from '@/hooks/useInstallments';
import { useSmartTransaction } from '@/hooks/useSmartTransaction';
import { useTransactionDetector } from '@/hooks/useTransactionDetector';
import { useAIAlerts } from '@/hooks/useAIAlerts';
import { SmartTransactionInput } from '@/components/forms/SmartTransactionInput';
import { SmartTransactionPreview } from '@/components/forms/SmartTransactionPreview';
import { ImpactAnalysisCard } from '@/components/forms/ImpactAnalysisCard';
import { AIDebugPanel } from '@/components/ai/AIDebugPanel';
import { NeuraProactiveAlerts } from '@/components/ai/NeuraProactiveAlerts';
import { cn } from '@/lib/utils';
import neuraIcon from '@/assets/neura-icon.png';

const PORTAL_ID = 'neura-floating-root';

function getPortalRoot() {
  let root = document.getElementById(PORTAL_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = PORTAL_ID;
    document.body.appendChild(root);
  }
  return root;
}

type TabType = 'chat' | 'transaction';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const { 
    messages, 
    sendMessage, 
    clearMessages, 
    isLoading,
    debugMode,
    setDebugMode,
    debugInfo,
    clarificationQuestion
  } = useAIAssistant();
  const { data: dashboardData } = useDashboard();
  const { savingsGoals } = useSavingsGoals();
  const { recurrences } = useRecurrences();
  const { installmentGroups } = useInstallments();
  const { alerts } = useAIAlerts();
  const smartTransaction = useSmartTransaction();
  const [transactionInput, setTransactionInput] = useState('');
  const transactionDetection = useTransactionDetector(input);

  useEffect(() => {
    setPortalRoot(getPortalRoot());
  }, []);

  // Show suggestion when transaction is detected with medium+ confidence
  useEffect(() => {
    if (transactionDetection.isTransaction && 
        (transactionDetection.confidence === 'high' || transactionDetection.confidence === 'medium')) {
      setShowSuggestion(true);
    } else {
      setShowSuggestion(false);
    }
  }, [transactionDetection]);

  // Auto-close after success
  useEffect(() => {
    if (smartTransaction.step === 'success') {
      const timer = setTimeout(() => {
        smartTransaction.reset();
        setActiveTab('chat');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [smartTransaction.step]);

  const handleSwitchToTransaction = () => {
    const text = input;
    setInput('');
    setShowSuggestion(false);
    setActiveTab('transaction');
    smartTransaction.classifyText(text);
  };

  const getFinancialContext = () => {
    const savingsGoalsTotal = savingsGoals?.reduce((sum, g) => sum + (g.current_amount || 0), 0) || 0;
    const activeInstallmentsCount = installmentGroups?.filter(g => {
      const paid = g.transactions?.filter(t => t.status === 'confirmed').length || 0;
      return paid < g.total_installments;
    }).length || 0;

    return {
      // Basic data
      totalBalance: dashboardData?.totalBalance,
      projectedBalance: dashboardData?.projectedBalance,
      monthlyIncome: dashboardData?.monthIncome,
      monthlyExpenses: dashboardData?.monthExpenses,
      accountsCount: dashboardData?.accounts?.length,
      creditCardsCount: dashboardData?.creditCards?.length,
      totalCreditLimit: dashboardData?.creditCards?.reduce((sum, c) => sum + (c.credit_limit || 0), 0),
      totalCreditUsed: dashboardData?.creditCards?.reduce((sum, c) => sum + ((c as any).current_invoice || 0), 0),
      // Complete financial picture data
      savingsGoalsTotal,
      savingsGoalsCount: savingsGoals?.length || 0,
      pendingExpensesTotal: dashboardData?.pendingMonthExpenses || 0,
      pendingExpensesCount: dashboardData?.pendingExpenses?.length || 0,
      hasRecurrences: (recurrences?.length || 0) > 0,
      activeInstallments: activeInstallmentsCount,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput('');
    setShowSuggestion(false);
    
    await sendMessage(message, getFinancialContext());
  };

  const handleClarificationAnswer = (answer: string) => {
    setInput('');
    sendMessage(answer, getFinancialContext());
  };

  const handleAlertClick = (prompt: string) => {
    sendMessage(prompt, getFinancialContext());
  };
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'chat') {
      smartTransaction.reset();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    smartTransaction.reset();
  };

  const suggestedQuestions = [
    'Quanto posso gastar hoje?',
    'Meu saldo cobre o mês?',
    'Quais minhas maiores despesas?',
    'Como estão meus orçamentos?',
    'Qual meu resumo financeiro?',
  ];

  const fixedPositionStyle: React.CSSProperties = {
    position: 'fixed',
    right: '1.5rem',
    bottom: '1.5rem',
    left: 'auto',
    top: 'auto',
  };

  if (!portalRoot) {
    return null;
  }

  if (!isOpen) {
    return createPortal(
      <Button
        onClick={() => setIsOpen(true)}
        variant="ai"
        className="h-auto px-5 py-3 rounded-full z-[9999] gap-2 animate-neura-entrance neura-ripple group"
        style={fixedPositionStyle}
      >
        <img src={neuraIcon} alt="Neura" className="h-5 w-5 object-contain transition-transform group-hover:animate-neura-wobble" />
        <span className="font-semibold">Chamar Neura</span>
      </Button>,
      portalRoot
    );
  }

  const renderClarificationQuestion = () => {
    if (!clarificationQuestion) return null;

    return (
      <div className="mx-4 mb-2 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <p className="text-sm font-medium mb-2">{clarificationQuestion.question}</p>
        <p className="text-xs text-muted-foreground mb-3">{clarificationQuestion.context}</p>
        {clarificationQuestion.suggestedOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {clarificationQuestion.suggestedOptions.map((option, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="secondary"
                onClick={() => handleClarificationAnswer(option)}
                className="text-xs"
              >
                {option}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderChatContent = () => {
    // Filter alerts to show only critical and warning for proactive display
    const importantAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
    const hasImportantAlerts = importantAlerts.length > 0;

    return (
    <>
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Proactive Alerts - Show when there are important alerts */}
            {hasImportantAlerts && (
              <NeuraProactiveAlerts 
                alerts={importantAlerts} 
                onAlertClick={handleAlertClick}
                maxAlerts={3}
              />
            )}

            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Olá! Sou a Neura, sua consultora financeira.</p>
              <p className="text-sm">Como posso ajudar você hoje?</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Sugestões:</p>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="w-full text-left text-sm p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="font-bold text-base mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="font-bold text-base mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
                        code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                        pre: ({ children }) => <pre className="bg-background/50 p-2 rounded my-2 overflow-x-auto text-xs">{children}</pre>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">{children}</a>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-3 italic my-2">{children}</blockquote>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="animate-bounce">•</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>•</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Clarification Question */}
      {renderClarificationQuestion()}

      {/* Debug Panel */}
      <AIDebugPanel debugInfo={debugInfo} isVisible={debugMode && messages.length > 0} />

      {/* Transaction Detection Suggestion */}
      {showSuggestion && (
        <div className="mx-4 mb-2 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="shrink-0 p-1.5 rounded-full bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm flex-1 text-muted-foreground">
              Parece uma transação! Use o <span className="font-medium text-foreground">Lançamento Inteligente</span>
            </p>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleSwitchToTransaction}
              className="shrink-0"
            >
              Lançar
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
  };
  const renderTransactionContent = () => (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {smartTransaction.step === 'input' && (
          <SmartTransactionInput
            value={transactionInput}
            onChange={setTransactionInput}
            onSubmit={(text) => {
              smartTransaction.classifyText(text);
              setTransactionInput('');
            }}
            isLoading={smartTransaction.isClassifying}
          />
        )}

        {smartTransaction.step === 'preview' && smartTransaction.classification && (
          <SmartTransactionPreview
            classification={smartTransaction.classification}
            onUpdate={smartTransaction.updateClassification}
            onConfirm={smartTransaction.confirmPreview}
            onBack={smartTransaction.goBackToInput}
          />
        )}

        {smartTransaction.step === 'impact' && smartTransaction.classification && (
          <div className="space-y-4">
            <ImpactAnalysisCard
              analysis={smartTransaction.impactAnalysis}
              isLoading={smartTransaction.isAnalyzingImpact}
              transactionType={smartTransaction.classification.type}
              transactionAmount={smartTransaction.classification.amount || 0}
            />

            {!smartTransaction.isAnalyzingImpact && (
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={smartTransaction.goBackToPreview}
                  disabled={smartTransaction.isCreating}
                  className="flex-1"
                >
                  Ajustar
                </Button>
                <Button
                  type="button"
                  onClick={smartTransaction.createTransaction}
                  disabled={smartTransaction.isCreating}
                  className="flex-1"
                >
                  {smartTransaction.isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {smartTransaction.step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <PartyPopper className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Lançamento criado!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sua transação foi registrada com sucesso.
              </p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return createPortal(
    <div 
      className="w-[min(24rem,calc(100vw-2rem))] h-[min(550px,calc(100vh-8rem))] sm:w-96 sm:h-[550px] bg-card border rounded-lg shadow-xl flex flex-col z-[9999]"
      style={fixedPositionStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <img src={neuraIcon} alt="Neura" className="h-5 w-5 object-contain" />
          <span className="font-semibold text-sm">Neura</span>
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'chat' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setDebugMode(!debugMode)} 
              className={cn("h-7 w-7", debugMode && "text-primary bg-primary/10")}
              title="Modo debug"
            >
              <Bug className="h-3.5 w-3.5" />
            </Button>
          )}
          {activeTab === 'chat' && messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearMessages} className="h-7 w-7">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-muted/30">
        <button
          onClick={() => handleTabChange('chat')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === 'chat'
              ? 'text-primary border-b-2 border-primary bg-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </button>
        <button
          onClick={() => handleTabChange('transaction')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative",
            activeTab === 'transaction'
              ? 'text-primary border-b-2 border-primary bg-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" />
          Lançamento
          {smartTransaction.step !== 'input' && smartTransaction.step !== 'success' && (
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'chat' ? renderChatContent() : renderTransactionContent()}
    </div>,
    portalRoot
  );
}
