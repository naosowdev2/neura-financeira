-- ===========================================
-- STEP 1: Remove duplicate transactions for recurrences
-- Keep the one with status='confirmed' or most recent
-- ===========================================

WITH duplicates_recurrence AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, recurrence_id, date 
           ORDER BY 
             CASE WHEN status = 'confirmed' THEN 0 ELSE 1 END,
             updated_at DESC,
             created_at DESC
         ) as rn
  FROM public.transactions
  WHERE recurrence_id IS NOT NULL
)
DELETE FROM public.transactions
WHERE id IN (
  SELECT id FROM duplicates_recurrence WHERE rn > 1
);

-- ===========================================
-- STEP 2: Remove duplicate transactions for installments
-- Keep the one with status='confirmed' or most recent
-- ===========================================

WITH duplicates_installment AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, installment_group_id, installment_number 
           ORDER BY 
             CASE WHEN status = 'confirmed' THEN 0 ELSE 1 END,
             updated_at DESC,
             created_at DESC
         ) as rn
  FROM public.transactions
  WHERE installment_group_id IS NOT NULL 
    AND installment_number IS NOT NULL
)
DELETE FROM public.transactions
WHERE id IN (
  SELECT id FROM duplicates_installment WHERE rn > 1
);

-- ===========================================
-- STEP 3: Create unique partial index for recurrence transactions
-- Prevents same recurrence from creating duplicate on same date
-- ===========================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_recurrence 
ON public.transactions (user_id, recurrence_id, date)
WHERE recurrence_id IS NOT NULL;

-- ===========================================
-- STEP 4: Create unique partial index for installment transactions
-- Prevents same installment number from being created twice
-- ===========================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_installment 
ON public.transactions (user_id, installment_group_id, installment_number)
WHERE installment_group_id IS NOT NULL AND installment_number IS NOT NULL;