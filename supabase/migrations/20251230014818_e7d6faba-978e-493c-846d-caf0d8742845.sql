-- Fix existing orphan transactions (credit card transactions without invoice_id)
-- This links them to their correct invoices

DO $$
DECLARE
  txn RECORD;
  inv_id UUID;
BEGIN
  FOR txn IN 
    SELECT id, credit_card_id, date, user_id 
    FROM public.transactions 
    WHERE credit_card_id IS NOT NULL 
      AND invoice_id IS NULL
      AND type = 'expense'
  LOOP
    inv_id := public.get_or_create_invoice(
      txn.credit_card_id, 
      txn.date::date, 
      txn.user_id
    );
    
    UPDATE public.transactions 
    SET invoice_id = inv_id 
    WHERE id = txn.id;
  END LOOP;
END $$;