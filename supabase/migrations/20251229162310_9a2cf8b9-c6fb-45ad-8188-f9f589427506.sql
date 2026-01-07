-- Add savings_goal_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN savings_goal_id UUID REFERENCES public.savings_goals(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_transactions_savings_goal_id ON public.transactions(savings_goal_id);