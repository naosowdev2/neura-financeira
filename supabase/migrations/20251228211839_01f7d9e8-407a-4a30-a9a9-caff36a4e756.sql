-- =====================================================
-- FASE 2: FUNÇÕES SQL
-- =====================================================

-- 1. Função para calcular saldo da conta
CREATE OR REPLACE FUNCTION public.calculate_account_balance(
  p_account_id UUID,
  p_include_pending BOOLEAN DEFAULT false
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  -- Buscar saldo inicial da conta
  SELECT initial_balance INTO v_initial_balance
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_initial_balance IS NULL THEN
    RETURN 0;
  END IF;

  -- Calcular saldo baseado nas transações
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'income' THEN amount
      WHEN type = 'expense' THEN -amount
      WHEN type = 'transfer' AND account_id = p_account_id THEN -amount
      WHEN type = 'transfer' AND destination_account_id = p_account_id THEN amount
      WHEN type = 'adjustment' THEN amount
      ELSE 0
    END
  ), 0) INTO v_calculated_balance
  FROM public.transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND credit_card_id IS NULL
    AND (p_include_pending OR status = 'confirmed');

  RETURN v_initial_balance + v_calculated_balance;
END;
$$;

-- 2. Função para calcular saldo projetado até uma data
CREATE OR REPLACE FUNCTION public.calculate_projected_balance(
  p_account_id UUID,
  p_until_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  SELECT initial_balance INTO v_initial_balance
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_initial_balance IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'income' THEN amount
      WHEN type = 'expense' THEN -amount
      WHEN type = 'transfer' AND account_id = p_account_id THEN -amount
      WHEN type = 'transfer' AND destination_account_id = p_account_id THEN amount
      WHEN type = 'adjustment' THEN amount
      ELSE 0
    END
  ), 0) INTO v_calculated_balance
  FROM public.transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND credit_card_id IS NULL
    AND date <= p_until_date;

  RETURN v_initial_balance + v_calculated_balance;
END;
$$;

-- 3. Função para obter ou criar fatura do cartão
CREATE OR REPLACE FUNCTION public.get_or_create_invoice(
  p_credit_card_id UUID,
  p_transaction_date DATE,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_reference_month DATE;
  v_closing_date DATE;
  v_due_date DATE;
  v_invoice_id UUID;
BEGIN
  SELECT closing_day, due_day INTO v_closing_day, v_due_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;

  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Credit card not found';
  END IF;

  IF EXTRACT(DAY FROM p_transaction_date) > v_closing_day THEN
    v_reference_month := date_trunc('month', p_transaction_date) + INTERVAL '1 month';
  ELSE
    v_reference_month := date_trunc('month', p_transaction_date);
  END IF;

  v_closing_date := (v_reference_month - INTERVAL '1 day' + (v_closing_day || ' days')::INTERVAL)::DATE;
  
  IF v_due_day <= v_closing_day THEN
    v_due_date := (v_reference_month + (v_due_day - 1 || ' days')::INTERVAL)::DATE;
  ELSE
    v_due_date := (v_reference_month - INTERVAL '1 month' + (v_due_day - 1 || ' days')::INTERVAL)::DATE;
  END IF;

  SELECT id INTO v_invoice_id
  FROM public.credit_card_invoices
  WHERE credit_card_id = p_credit_card_id
    AND reference_month = v_reference_month;

  IF v_invoice_id IS NULL THEN
    INSERT INTO public.credit_card_invoices (
      credit_card_id, user_id, reference_month, closing_date, due_date
    ) VALUES (
      p_credit_card_id, p_user_id, v_reference_month, v_closing_date, v_due_date
    )
    RETURNING id INTO v_invoice_id;
  END IF;

  RETURN v_invoice_id;
END;
$$;

-- 4. Função para atualizar total da fatura (trigger function)
CREATE OR REPLACE FUNCTION public.update_invoice_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_invoice_id UUID;
  v_new_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_invoice_id := OLD.invoice_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_invoice_id := OLD.invoice_id;
    v_new_invoice_id := NEW.invoice_id;
  ELSE
    v_new_invoice_id := NEW.invoice_id;
  END IF;

  IF v_old_invoice_id IS NOT NULL THEN
    UPDATE public.credit_card_invoices
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.transactions
      WHERE invoice_id = v_old_invoice_id
    )
    WHERE id = v_old_invoice_id;
  END IF;

  IF v_new_invoice_id IS NOT NULL AND (v_old_invoice_id IS NULL OR v_new_invoice_id != v_old_invoice_id) THEN
    UPDATE public.credit_card_invoices
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.transactions
      WHERE invoice_id = v_new_invoice_id
    )
    WHERE id = v_new_invoice_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 5. Função para registrar auditoria de saldo
CREATE OR REPLACE FUNCTION public.log_balance_audit(
  p_user_id UUID,
  p_account_id UUID,
  p_previous_balance NUMERIC,
  p_new_balance NUMERIC,
  p_reason TEXT,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.balance_audit (
    user_id, account_id, previous_balance, new_balance, reason, transaction_id
  ) VALUES (
    p_user_id, p_account_id, p_previous_balance, p_new_balance, p_reason, p_transaction_id
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- 6. Criar trigger simples (sem WHEN clause) para atualizar total da fatura
CREATE TRIGGER update_invoice_total_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_total();

-- 7. VIEW para contas com saldo calculado
CREATE OR REPLACE VIEW public.accounts_with_balance AS
SELECT 
  a.*,
  public.calculate_account_balance(a.id, false) AS calculated_balance,
  public.calculate_account_balance(a.id, true) AS balance_with_pending
FROM public.accounts a
WHERE a.is_archived = false;