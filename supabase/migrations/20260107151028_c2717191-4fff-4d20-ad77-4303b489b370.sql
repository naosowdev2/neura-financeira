-- Fix security vulnerability: accounts_with_balance view exposing data to all users
-- Recreate the view with security_invoker = true so it respects RLS of underlying accounts table

DROP VIEW IF EXISTS public.accounts_with_balance;

CREATE VIEW public.accounts_with_balance 
WITH (security_invoker = true)
AS 
SELECT 
    id,
    user_id,
    name,
    type,
    initial_balance,
    current_balance,
    color,
    icon,
    include_in_total,
    is_archived,
    created_at,
    updated_at,
    calculate_account_balance(id, false) AS calculated_balance,
    calculate_account_balance(id, true) AS balance_with_pending
FROM accounts a
WHERE is_archived = false;