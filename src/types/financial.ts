// Types for the financial management system

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type TransactionStatus = 'confirmed' | 'pending';
export type CategoryType = 'income' | 'expense';
export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'overdue';
export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'piggy_bank';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance: number;
  current_balance: number;
  icon: string | null;
  color: string | null;
  include_in_total: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  calculated_balance: number;
  balance_with_pending: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  icon: string | null;
  color: string | null;
  is_archived: boolean;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInvoice {
  id: string;
  credit_card_id: string;
  user_id: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  status: InvoiceStatus;
  paid_at: string | null;
  payment_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  credit_card?: CreditCard;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  date: string;
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  destination_account_id: string | null;
  invoice_id: string | null;
  recurrence_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
  notes: string | null;
  ai_notes: string | null;
  adjustment_reason: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
  credit_card?: CreditCard;
  destination_account?: Account;
}

export interface Recurrence {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  frequency: FrequencyType;
  start_date: string;
  end_date: string | null;
  next_occurrence: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
  credit_card?: CreditCard;
}

export interface InstallmentGroup {
  id: string;
  user_id: string;
  description: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  first_installment_date: string;
  credit_card_id: string | null;
  account_id: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
  credit_card?: CreditCard;
  transactions?: Transaction[];
}

export interface BalanceAudit {
  id: string;
  user_id: string;
  account_id: string;
  previous_balance: number;
  new_balance: number;
  reason: string;
  transaction_id: string | null;
  created_at: string;
  account?: Account;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  spent?: number;
  remaining?: number;
  percentage?: number;
}

// Input types for creating/updating entities
export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  destination_account_id?: string | null;
  notes?: string | null;
  status?: TransactionStatus;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  installment_group_id?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
}

export interface CreateRecurrenceInput {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  frequency: FrequencyType;
  start_date: string;
  end_date?: string | null;
}

export interface CreateInstallmentInput {
  description: string;
  amount: number;
  amount_type: 'total' | 'per_installment';
  total_installments: number;
  starting_installment: number;
  frequency: FrequencyType;
  first_installment_date: string;
  credit_card_id?: string | null;
  account_id?: string | null;
  category_id?: string | null;
}
