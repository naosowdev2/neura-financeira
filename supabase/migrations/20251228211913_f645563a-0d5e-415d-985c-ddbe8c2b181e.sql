-- Recriar VIEW com SECURITY INVOKER para resolver o warning do linter
DROP VIEW IF EXISTS public.accounts_with_balance;

CREATE VIEW public.accounts_with_balance 
WITH (security_invoker = true) AS
SELECT 
  a.*,
  public.calculate_account_balance(a.id, false) AS calculated_balance,
  public.calculate_account_balance(a.id, true) AS balance_with_pending
FROM public.accounts a
WHERE a.is_archived = false;