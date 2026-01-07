-- Corrigir transações de resgate de cofrinhos existentes que estão com account_id incorreto
UPDATE transactions 
SET destination_account_id = account_id, account_id = NULL 
WHERE notes = 'savings_withdrawal' AND savings_goal_id IS NOT NULL AND account_id IS NOT NULL;