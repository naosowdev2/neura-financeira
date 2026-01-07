-- Fix existing savings goal transactions with inverted account_id/destination_account_id
-- Withdrawals should have: account_id = null, destination_account_id = receiving account
-- Deposits should have: account_id = source account, destination_account_id = null

-- Fix withdrawals that were incorrectly saved with account_id instead of destination_account_id
UPDATE public.transactions
SET destination_account_id = account_id,
    account_id = null
WHERE savings_goal_id IS NOT NULL
  AND notes = 'savings_withdrawal'
  AND destination_account_id IS NULL
  AND account_id IS NOT NULL;

-- Fix deposits that were incorrectly saved with destination_account_id instead of account_id
UPDATE public.transactions
SET account_id = destination_account_id,
    destination_account_id = null
WHERE savings_goal_id IS NOT NULL
  AND notes = 'savings_deposit'
  AND account_id IS NULL
  AND destination_account_id IS NOT NULL;

-- Create trigger function to normalize savings goal transfers
-- This ensures correct behavior even if old app versions send wrong data
CREATE OR REPLACE FUNCTION public.normalize_savings_goal_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process transactions linked to savings goals
  IF NEW.savings_goal_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Withdrawal (resgate): money goes TO the account (destination_account_id)
  IF NEW.notes = 'savings_withdrawal' OR NEW.description ILIKE 'Resgate:%' THEN
    -- If destination is null but account is set, fix it
    IF NEW.destination_account_id IS NULL AND NEW.account_id IS NOT NULL THEN
      NEW.destination_account_id := NEW.account_id;
    END IF;
    -- Withdrawal always has null account_id (not coming FROM an account)
    NEW.account_id := NULL;
    RETURN NEW;
  END IF;

  -- Deposit (depósito): money comes FROM the account (account_id)
  IF NEW.notes = 'savings_deposit' OR NEW.description ILIKE 'Depósito:%' THEN
    -- If account is null but destination is set, fix it
    IF NEW.account_id IS NULL AND NEW.destination_account_id IS NOT NULL THEN
      NEW.account_id := NEW.destination_account_id;
    END IF;
    -- Deposit always has null destination_account_id (not going TO an account)
    NEW.destination_account_id := NULL;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_normalize_savings_goal_transfer ON public.transactions;

CREATE TRIGGER trg_normalize_savings_goal_transfer
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.normalize_savings_goal_transfer();