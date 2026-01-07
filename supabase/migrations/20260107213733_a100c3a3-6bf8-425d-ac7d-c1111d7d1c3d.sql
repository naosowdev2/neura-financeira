-- Trigger para atribuir invoice_id automaticamente em transações de cartão de crédito
CREATE OR REPLACE FUNCTION public.assign_invoice_on_credit_card_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atribui invoice se for despesa de cartão sem invoice_id
  IF NEW.credit_card_id IS NOT NULL 
     AND NEW.type = 'expense' 
     AND NEW.invoice_id IS NULL THEN
    
    NEW.invoice_id := public.get_or_create_invoice(
      NEW.credit_card_id,
      NEW.date,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger (remove se existir para evitar duplicação)
DROP TRIGGER IF EXISTS tr_assign_invoice ON public.transactions;

CREATE TRIGGER tr_assign_invoice
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.assign_invoice_on_credit_card_transaction();

-- Corrigir transações órfãs existentes (despesas de cartão sem fatura)
UPDATE public.transactions t
SET invoice_id = public.get_or_create_invoice(
  t.credit_card_id,
  t.date,
  t.user_id
)
WHERE t.credit_card_id IS NOT NULL
  AND t.type = 'expense'
  AND t.invoice_id IS NULL;