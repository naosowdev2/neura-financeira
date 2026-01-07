-- Tornar target_amount opcional (pode ser 0 ou NULL para cofrinhos sem meta)
ALTER TABLE savings_goals ALTER COLUMN target_amount DROP NOT NULL;
ALTER TABLE savings_goals ALTER COLUMN target_amount SET DEFAULT 0;

-- Adicionar coluna para vincular cofrinho a uma conta pai
ALTER TABLE savings_goals ADD COLUMN parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Criar índice para busca eficiente de cofrinhos por conta
CREATE INDEX idx_savings_goals_parent_account ON savings_goals(parent_account_id) WHERE parent_account_id IS NOT NULL;