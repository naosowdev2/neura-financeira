-- Drop the existing view
DROP VIEW IF EXISTS public.accounts_with_balance;

-- Recreate the view with security_invoker = true
-- This ensures the view respects RLS policies of the underlying tables
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

-- Grant appropriate permissions
GRANT SELECT ON public.accounts_with_balance TO authenticated;

-- Add comment explaining the security measure
COMMENT ON VIEW public.accounts_with_balance IS 'View with calculated balances. Uses security_invoker=true to enforce RLS policies from the accounts table.';