export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'piggy_bank';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type TransactionStatus = 'confirmed' | 'pending';
export type CategoryType = 'income' | 'expense';
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type BudgetPeriod = 'monthly' | 'yearly';
export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  icon: string | null;
  color: string | null;
  include_in_total: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  brand: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  account?: Account;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  due_date: string;
  competency_date: string;
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  destination_account_id: string | null;
  notes: string | null;
  ai_notes: string | null;
  recurrence_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
  previous_balance: number | null;
  new_balance: number | null;
  adjustment_reason: string | null;
  invoice_id: string | null;
  savings_goal_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
  credit_card?: CreditCard;
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
  is_active: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface CreditCardInvoice {
  id: string;
  credit_card_id: string;
  user_id: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Profile>;
      };
      accounts: {
        Row: Account;
        Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Account>;
      };
      credit_cards: {
        Row: CreditCard;
        Insert: Omit<CreditCard, 'id' | 'created_at' | 'updated_at' | 'account'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<CreditCard, 'account'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Category>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category' | 'account' | 'credit_card'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Transaction, 'category' | 'account' | 'credit_card'>>;
      };
      recurrences: {
        Row: Recurrence;
        Insert: Omit<Recurrence, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Recurrence>;
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'category'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Budget, 'category'>>;
      };
      credit_card_invoices: {
        Row: CreditCardInvoice;
        Insert: Omit<CreditCardInvoice, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<CreditCardInvoice>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<UserRole>;
      };
    };
  };
}
