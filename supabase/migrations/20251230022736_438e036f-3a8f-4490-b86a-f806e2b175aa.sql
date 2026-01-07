-- Fix the get_or_create_invoice function to correctly calculate due dates
-- The issue: when due_day > closing_day, the due_date should be in the SAME month as closing_date, not the previous month

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

  -- Determine reference month based on transaction date
  -- If transaction is after closing day, it goes to next month's invoice
  IF EXTRACT(DAY FROM p_transaction_date) > v_closing_day THEN
    v_reference_month := date_trunc('month', p_transaction_date) + INTERVAL '1 month';
  ELSE
    v_reference_month := date_trunc('month', p_transaction_date);
  END IF;

  -- Closing date: closing_day of reference_month
  v_closing_date := (v_reference_month + ((v_closing_day - 1) || ' days')::INTERVAL)::DATE;
  
  -- Due date calculation:
  -- If due_day >= closing_day: due date is in the SAME month as closing_date
  -- If due_day < closing_day: due date is in the NEXT month after closing_date
  IF v_due_day >= v_closing_day THEN
    v_due_date := (v_reference_month + ((v_due_day - 1) || ' days')::INTERVAL)::DATE;
  ELSE
    v_due_date := (v_reference_month + INTERVAL '1 month' + ((v_due_day - 1) || ' days')::INTERVAL)::DATE;
  END IF;

  -- Find existing invoice
  SELECT id INTO v_invoice_id
  FROM public.credit_card_invoices
  WHERE credit_card_id = p_credit_card_id
    AND reference_month = v_reference_month;

  -- Create if not exists
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

-- Fix existing invoices where due_date is incorrectly before closing_date
UPDATE credit_card_invoices ci
SET due_date = 
  CASE 
    WHEN cc.due_day >= cc.closing_day 
    THEN (ci.reference_month + ((cc.due_day - 1) || ' days')::INTERVAL)::DATE
    ELSE (ci.reference_month + INTERVAL '1 month' + ((cc.due_day - 1) || ' days')::INTERVAL)::DATE
  END
FROM credit_cards cc
WHERE ci.credit_card_id = cc.id
  AND ci.due_date < ci.closing_date;