-- =====================================================
-- FASE 1: MIGRAÇÕES DE BANCO DE DADOS
-- =====================================================

-- 1. Criar tabela de faturas de cartão de crédito
CREATE TABLE public.credit_card_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reference_month DATE NOT NULL,
  closing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'overdue')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, reference_month)
);

-- 2. Criar tabela de recorrências
CREATE TABLE public.recurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_occurrence DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Criar tabela de grupos de parcelamento
CREATE TABLE public.installment_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  installment_amount NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL,
  first_installment_date DATE NOT NULL,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Criar tabela de auditoria de saldos
CREATE TABLE public.balance_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  previous_balance NUMERIC NOT NULL,
  new_balance NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Alterar tabela transactions - adicionar novos campos
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS recurrence_id UUID,
  ADD COLUMN IF NOT EXISTS installment_group_id UUID,
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS total_installments INTEGER,
  ADD COLUMN IF NOT EXISTS ai_notes TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- 6. Alterar tabela credit_cards - adicionar conta de pagamento padrão
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 7. Adicionar foreign keys após criação das tabelas
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL,
  ADD CONSTRAINT transactions_recurrence_id_fkey 
    FOREIGN KEY (recurrence_id) REFERENCES public.recurrences(id) ON DELETE SET NULL,
  ADD CONSTRAINT transactions_installment_group_id_fkey 
    FOREIGN KEY (installment_group_id) REFERENCES public.installment_groups(id) ON DELETE SET NULL;

ALTER TABLE public.credit_card_invoices
  ADD CONSTRAINT credit_card_invoices_payment_transaction_id_fkey 
    FOREIGN KEY (payment_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- =====================================================
-- HABILITAR RLS E CRIAR POLÍTICAS
-- =====================================================

-- RLS para credit_card_invoices
ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" 
  ON public.credit_card_invoices FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices" 
  ON public.credit_card_invoices FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" 
  ON public.credit_card_invoices FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" 
  ON public.credit_card_invoices FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS para recurrences
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurrences" 
  ON public.recurrences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurrences" 
  ON public.recurrences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurrences" 
  ON public.recurrences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurrences" 
  ON public.recurrences FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS para installment_groups
ALTER TABLE public.installment_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own installment groups" 
  ON public.installment_groups FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own installment groups" 
  ON public.installment_groups FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own installment groups" 
  ON public.installment_groups FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installment groups" 
  ON public.installment_groups FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS para balance_audit
ALTER TABLE public.balance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own balance audit" 
  ON public.balance_audit FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own balance audit" 
  ON public.balance_audit FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS DE UPDATED_AT
-- =====================================================

CREATE TRIGGER update_credit_card_invoices_updated_at
  BEFORE UPDATE ON public.credit_card_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurrences_updated_at
  BEFORE UPDATE ON public.recurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_installment_groups_updated_at
  BEFORE UPDATE ON public.installment_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();