-- Add unique partial indexes to prevent duplicate transactions

-- Index for recurrences: one transaction per user + recurrence + date
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurrence_unique 
ON public.transactions (user_id, recurrence_id, date) 
WHERE recurrence_id IS NOT NULL;

-- Index for installments: one transaction per user + installment_group + installment_number  
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_installment_unique 
ON public.transactions (user_id, installment_group_id, installment_number) 
WHERE installment_group_id IS NOT NULL AND installment_number IS NOT NULL;