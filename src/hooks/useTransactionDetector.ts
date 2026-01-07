import { useMemo } from 'react';

interface TransactionDetection {
  isTransaction: boolean;
  confidence: 'high' | 'medium' | 'low' | null;
  detectedType: 'income' | 'expense' | 'transfer' | null;
}

const EXPENSE_KEYWORDS = /\b(gastei|paguei|comprei|despesa|gasto|compra|pago|custou|custo|boleto|conta|fatura|parcela)\b/i;
const INCOME_KEYWORDS = /\b(recebi|ganhei|entrou|salário|salario|receita|recebimento|depósito|deposito|pagamento|freelance)\b/i;
const TRANSFER_KEYWORDS = /\b(transferi|passei|mandei|enviei|pix|ted|doc)\b/i;
const MONEY_PATTERN = /(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)\s*(?:reais?|mil|conto|pila)?/i;
const INSTALLMENT_PATTERN = /\b(?:em\s+)?(\d+)\s*(?:x|vezes|parcelas?)\b/i;
const NUMBER_WORDS = /\b(cem|duzentos|trezentos|quatrocentos|quinhentos|mil|dois mil|três mil|cinco mil|dez mil|vinte|trinta|cinquenta|oitenta|noventa)\b/i;

export function useTransactionDetector(text: string): TransactionDetection {
  return useMemo(() => {
    if (!text || text.trim().length < 5) {
      return { isTransaction: false, confidence: null, detectedType: null };
    }

    const normalizedText = text.toLowerCase().trim();
    
    // Check for money patterns
    const hasMoney = MONEY_PATTERN.test(normalizedText) || NUMBER_WORDS.test(normalizedText);
    const hasInstallments = INSTALLMENT_PATTERN.test(normalizedText);
    
    // Check for transaction type keywords
    const hasExpenseKeyword = EXPENSE_KEYWORDS.test(normalizedText);
    const hasIncomeKeyword = INCOME_KEYWORDS.test(normalizedText);
    const hasTransferKeyword = TRANSFER_KEYWORDS.test(normalizedText);
    
    const hasAnyTypeKeyword = hasExpenseKeyword || hasIncomeKeyword || hasTransferKeyword;
    
    // Determine type
    let detectedType: 'income' | 'expense' | 'transfer' | null = null;
    if (hasTransferKeyword) {
      detectedType = 'transfer';
    } else if (hasIncomeKeyword) {
      detectedType = 'income';
    } else if (hasExpenseKeyword) {
      detectedType = 'expense';
    }
    
    // Calculate confidence
    let score = 0;
    if (hasMoney) score += 2;
    if (hasAnyTypeKeyword) score += 2;
    if (hasInstallments) score += 1;
    
    // Additional context clues
    const hasPlace = /\b(no|na|em|do|da)\s+\w+/i.test(normalizedText);
    const hasTime = /\b(hoje|ontem|amanhã|semana|mês|dia)\b/i.test(normalizedText);
    if (hasPlace) score += 1;
    if (hasTime) score += 1;
    
    let confidence: 'high' | 'medium' | 'low' | null = null;
    let isTransaction = false;
    
    if (score >= 4) {
      confidence = 'high';
      isTransaction = true;
    } else if (score >= 3) {
      confidence = 'medium';
      isTransaction = true;
    } else if (score >= 2 && (hasMoney || hasAnyTypeKeyword)) {
      confidence = 'low';
      isTransaction = true;
    }
    
    return { isTransaction, confidence, detectedType };
  }, [text]);
}
