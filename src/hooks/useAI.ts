import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import type { DebugInfo } from '@/components/ai/AIDebugPanel';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClarificationQuestion {
  question: string;
  context: string;
  suggestedOptions: string[];
}

interface FinancialContext {
  totalBalance?: number;
  projectedBalance?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  accountsCount?: number;
  creditCardsCount?: number;
  totalCreditLimit?: number;
  totalCreditUsed?: number;
  // New fields for complete financial picture
  savingsGoalsTotal?: number;
  savingsGoalsCount?: number;
  pendingExpensesTotal?: number;
  pendingExpensesCount?: number;
  hasRecurrences?: boolean;
  activeInstallments?: number;
}

export function useAICategorize() {
  const [isLoading, setIsLoading] = useState(false);

  const suggestCategory = useCallback(async (
    description: string,
    categories: { id: string; name: string }[],
    transactionType: 'income' | 'expense'
  ): Promise<string | null> => {
    if (!description || description.length < 3 || categories.length === 0) {
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-categorize', {
        body: { description, categories, transactionType }
      });

      if (error) throw error;
      return data?.categoryId || null;
    } catch (error: any) {
      console.error('AI categorization error:', error);
      if (error.message?.includes('429')) {
        toast.error('Limite de IA atingido. Tente novamente mais tarde.');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggestCategory, isLoading };
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<ClarificationQuestion | null>(null);
  const { user } = useAuth();
  
  // Conversation memory integration
  const { 
    conversation,
    messages: savedMessages,
    saveMessage, 
    archiveConversation,
    createNewConversation,
    getConversationHistory,
    isLoading: isLoadingHistory
  } = useConversationMemory();

  // Load saved messages on mount
  useEffect(() => {
    if (savedMessages.length > 0 && messages.length === 0) {
      setMessages(savedMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })));
    }
  }, [savedMessages, messages.length]);

  const sendMessage = useCallback(async (
    userMessage: string,
    financialContext?: FinancialContext
  ) => {
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setClarificationQuestion(null);
    
    const startTime = Date.now();

    // Save user message to database
    await saveMessage('user', userMessage, { financialContext });

    // Prepare debug info
    if (debugMode && financialContext) {
      setDebugInfo({
        contextSent: financialContext,
        toolsCalled: [],
        totalDurationMs: 0,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      });
    }

    try {
      // Get conversation history for context
      const history = await getConversationHistory(15);
      
      const response = await fetch(
        `https://zedzzgfvpbwuivuwgjyx.supabase.co/functions/v1/ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZHp6Z2Z2cGJ3dWl2dXdnanl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDU3OTAsImV4cCI6MjA4MjUyMTc5MH0.bQPrporHT6jWN_tXDCGJG0kTHTWM6BaYdpxZ6kyFkKM`,
          },
          body: JSON.stringify({
            messages: newMessages,
            financialContext,
            userId: user?.id,
            debug: debugMode,
            conversationId: conversation?.id,
            conversationHistory: history.length > 0 ? history : undefined,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de requisições atingido. Tente novamente mais tarde.');
          throw new Error('Rate limit exceeded');
        }
        if (response.status === 402) {
          toast.error('Créditos insuficientes. Adicione fundos para continuar.');
          throw new Error('Payment required');
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';
      let debugToolCalls: { name: string; args: any; resultSummary: string; durationMs: number }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              
              // Parse debug block if present
              if (assistantContent.includes('[DEBUG]') && assistantContent.includes('[/DEBUG]')) {
                const debugMatch = assistantContent.match(/\[DEBUG\]([\s\S]*?)\[\/DEBUG\]/);
                if (debugMatch) {
                  try {
                    debugToolCalls = JSON.parse(debugMatch[1]);
                    // Remove debug block from displayed content
                    assistantContent = assistantContent.replace(/\[DEBUG\][\s\S]*?\[\/DEBUG\]\n?/, '');
                  } catch (e) {
                    console.error('Failed to parse debug info:', e);
                  }
                }
              }
              
              setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
      
      // Update debug info with actual tool calls from the response
      if (debugMode && debugToolCalls.length > 0) {
        setDebugInfo(prev => prev ? {
          ...prev,
          toolsCalled: debugToolCalls.map(tc => ({
            name: tc.name,
            args: tc.args,
            result: { summary: tc.resultSummary } as Record<string, any>,
            durationMs: tc.durationMs
          }))
        } : null);
      }

      // Save assistant response to database
      if (assistantContent) {
        await saveMessage('assistant', assistantContent, { 
          toolsCalled: debugInfo?.toolsCalled,
          durationMs: Date.now() - startTime
        });
      }

      // Update debug info with duration
      if (debugMode) {
        setDebugInfo(prev => prev ? {
          ...prev,
          totalDurationMs: Date.now() - startTime
        } : null);
      }

      // Check if the response contains a clarification question marker
      if (assistantContent.includes('[CLARIFICATION]')) {
        try {
          const clarificationMatch = assistantContent.match(/\[CLARIFICATION\]([\s\S]*?)\[\/CLARIFICATION\]/);
          if (clarificationMatch) {
            const clarificationData = JSON.parse(clarificationMatch[1]);
            setClarificationQuestion(clarificationData);
            // Remove the clarification marker from the displayed message
            assistantContent = assistantContent.replace(/\[CLARIFICATION\][\s\S]*?\[\/CLARIFICATION\]/, '').trim();
          }
        } catch (e) {
          console.error('Failed to parse clarification:', e);
        }
      }

      if (!assistantContent) {
        setMessages([...newMessages, { role: 'assistant', content: 'Desculpe, não consegui processar sua pergunta.' }]);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Ocorreu um erro. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, user?.id, debugMode, saveMessage, getConversationHistory, conversation?.id, debugInfo?.toolsCalled]);

  const clearMessages = useCallback(async () => {
    // Archive current conversation and start fresh
    await archiveConversation();
    await createNewConversation();
    setMessages([]);
    setDebugInfo(null);
    setClarificationQuestion(null);
  }, [archiveConversation, createNewConversation]);

  const answerClarification = useCallback((answer: string) => {
    setClarificationQuestion(null);
    // The answer will be sent as a new message
  }, []);

  return { 
    messages, 
    sendMessage, 
    clearMessages, 
    isLoading: isLoading || isLoadingHistory,
    debugMode,
    setDebugMode,
    debugInfo,
    clarificationQuestion,
    answerClarification,
    conversationId: conversation?.id
  };
}
