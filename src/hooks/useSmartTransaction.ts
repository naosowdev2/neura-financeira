import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from './useCategories';
import { useAccounts } from './useAccounts';
import { useCreditCards } from './useCreditCards';
import { useTransactions } from './useTransactions';
import { useSavingsGoals } from './useSavingsGoals';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImpactAnalysis } from '@/components/forms/ImpactAnalysisCard';

export interface TransactionClassification {
  type: 'income' | 'expense' | 'transfer';
  amount: number | null;
  date: string | null;
  description: string;
  category_id: string | null;
  category_name: string | null;
  account_id: string | null;
  account_name: string | null;
  credit_card_id: string | null;
  credit_card_name: string | null;
  destination_account_id: string | null;
  destination_account_name: string | null;
  savings_goal_id: string | null;
  savings_goal_name: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  is_installment: boolean;
  total_installments: number | null;
  confidence: number;
  parsed_text: string;
}

export interface SmartTransactionState {
  step: 'input' | 'preview' | 'impact' | 'success';
  inputText: string;
  classification: TransactionClassification | null;
  impactAnalysis: ImpactAnalysis | null;
  isClassifying: boolean;
  isAnalyzingImpact: boolean;
  isCreating: boolean;
  error: string | null;
}

const initialState: SmartTransactionState = {
  step: 'input',
  inputText: '',
  classification: null,
  impactAnalysis: null,
  isClassifying: false,
  isAnalyzingImpact: false,
  isCreating: false,
  error: null,
};

export function useSmartTransaction() {
  const [state, setState] = useState<SmartTransactionState>(initialState);
  const { user } = useAuth();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { savingsGoals, contribute } = useSavingsGoals();
  const { createTransaction } = useTransactions();

  const classifyText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setState(prev => ({ 
      ...prev, 
      inputText: text,
      isClassifying: true, 
      error: null 
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-transaction-classifier', {
        body: {
          text,
          categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
          accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type })),
          creditCards: creditCards.map(cc => ({ id: cc.id, name: cc.name })),
          savingsGoals: savingsGoals.map(sg => ({ id: sg.id, name: sg.name })),
        },
      });

      if (error) throw error;

      if (data?.classification) {
        setState(prev => ({
          ...prev,
          classification: data.classification,
          step: 'preview',
          isClassifying: false,
        }));
      } else {
        throw new Error('Classificação inválida');
      }
    } catch (error) {
      console.error('Classification error:', error);
      setState(prev => ({
        ...prev,
        isClassifying: false,
        error: error instanceof Error ? error.message : 'Erro ao classificar',
      }));
      toast.error('Não consegui entender. Tente descrever de outra forma.');
    }
  }, [categories, accounts, creditCards, savingsGoals]);

  const updateClassification = useCallback((updates: Partial<TransactionClassification>) => {
    setState(prev => ({
      ...prev,
      classification: prev.classification ? { ...prev.classification, ...updates } : null,
    }));
  }, []);

  const confirmPreview = useCallback(async () => {
    const { classification } = state;
    if (!classification || !user) return;

    setState(prev => ({ ...prev, step: 'impact', isAnalyzingImpact: true }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-impact-analyzer', {
        body: {
          transaction: {
            type: classification.type,
            amount: classification.amount,
            date: classification.date,
            category_id: classification.category_id,
            account_id: classification.account_id,
            credit_card_id: classification.credit_card_id,
          },
          userId: user.id,
        },
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        impactAnalysis: data?.analysis || null,
        isAnalyzingImpact: false,
      }));
    } catch (error) {
      console.error('Impact analysis error:', error);
      setState(prev => ({
        ...prev,
        isAnalyzingImpact: false,
        impactAnalysis: null,
      }));
    }
  }, [state, user]);

  const goBackToPreview = useCallback(() => {
    setState(prev => ({ ...prev, step: 'preview' }));
  }, []);

  const goBackToInput = useCallback(() => {
    setState(prev => ({ ...prev, step: 'input', classification: null }));
  }, []);

  const createTransactionFromClassification = useCallback(async () => {
    const { classification, impactAnalysis } = state;
    if (!classification || !user) return;

    setState(prev => ({ ...prev, isCreating: true }));

    try {
      // Validate required fields
      if (!classification.amount || classification.amount <= 0) {
        throw new Error('Valor inválido');
      }

      // Check if this is a transfer to a savings goal
      if (classification.savings_goal_id && classification.account_id) {
        // Use the contribute function to properly handle savings goal deposits
        await contribute.mutateAsync({
          id: classification.savings_goal_id,
          amount: classification.amount,
          accountId: classification.account_id,
        });
        
        setState(prev => ({ ...prev, step: 'success', isCreating: false }));
        toast.success('Depósito no cofrinho realizado com sucesso!');
        return;
      }

      const transactionData: any = {
        type: classification.type,
        amount: classification.amount,
        date: classification.date || new Date().toISOString().split('T')[0],
        description: classification.description,
        category_id: classification.category_id,
        status: 'confirmed',
      };

      // Handle account or credit card
      if (classification.credit_card_id) {
        transactionData.credit_card_id = classification.credit_card_id;
        
        // Get or create invoice for this credit card transaction
        const { data: invoiceId, error: invoiceError } = await (supabase.rpc as any)('get_or_create_invoice', {
          p_credit_card_id: classification.credit_card_id,
          p_transaction_date: transactionData.date,
          p_user_id: user.id,
        });
        
        if (invoiceError) {
          console.error('Error getting/creating invoice:', invoiceError);
        } else if (invoiceId) {
          transactionData.invoice_id = invoiceId;
        }
      } else if (classification.account_id) {
        transactionData.account_id = classification.account_id;
      }

      // Handle transfer
      if (classification.type === 'transfer' && classification.destination_account_id) {
        transactionData.destination_account_id = classification.destination_account_id;
      }

      // Handle recurring
      if (classification.is_recurring) {
        transactionData.is_recurring = true;
        transactionData.recurrence_rule = classification.recurrence_frequency;
      }

      // Handle installments
      if (classification.is_installment && classification.total_installments) {
        transactionData.total_installments = classification.total_installments;
        transactionData.installment_number = 1;
      }

      // Create the transaction
      const createdTransaction = await createTransaction.mutateAsync(transactionData) as { id: string } | null;

      // Generate AI observation in the background (don't block the UI)
      if (createdTransaction && createdTransaction.id) {
        generateAndSaveObservation(createdTransaction.id, classification, impactAnalysis);
      }

      setState(prev => ({ ...prev, step: 'success', isCreating: false }));
      toast.success('Transação criada com sucesso!');

    } catch (error) {
      console.error('Create transaction error:', error);
      setState(prev => ({ ...prev, isCreating: false }));
      toast.error(error instanceof Error ? error.message : 'Erro ao criar transação');
    }
  }, [state, user, createTransaction, contribute]);

  const generateAndSaveObservation = async (
    transactionId: string,
    classification: TransactionClassification,
    impactAnalysis: ImpactAnalysis | null
  ) => {
    try {
      // Call the observation generator
      const { data, error } = await supabase.functions.invoke('ai-observation-generator', {
        body: {
          transaction: {
            id: transactionId,
            type: classification.type,
            amount: classification.amount,
            date: classification.date,
            description: classification.description,
            category_name: classification.category_name,
            account_name: classification.account_name,
            credit_card_name: classification.credit_card_name,
          },
          impactContext: impactAnalysis ? {
            riskLevel: impactAnalysis.riskLevel,
            currentBalance: impactAnalysis.currentBalance,
            newBalance: impactAnalysis.newBalance,
            budgetImpact: impactAnalysis.budgetImpact,
            warnings: impactAnalysis.warnings,
          } : null,
        },
      });

      if (error) {
        console.error('Failed to generate observation:', error);
        return;
      }

      if (data?.result?.observation) {
        // Update the transaction with the AI observation
        const { error: updateError } = await (supabase
          .from('transactions') as any)
          .update({ ai_notes: data.result.observation })
          .eq('id', transactionId);

        if (updateError) {
          console.error('Failed to save observation:', updateError);
        } else {
          console.log('AI observation saved:', data.result.observation);
        }
      }
    } catch (error) {
      console.error('Error generating observation:', error);
    }
  };

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    classifyText,
    updateClassification,
    confirmPreview,
    goBackToPreview,
    goBackToInput,
    createTransaction: createTransactionFromClassification,
    reset,
  };
}
