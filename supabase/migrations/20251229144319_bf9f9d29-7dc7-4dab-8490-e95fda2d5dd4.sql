-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Expense categories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order) VALUES
    -- Alimentação
    (NEW.id, 'Alimentação', 'expense', 'utensils', '#ef4444', 1),
    (NEW.id, 'Supermercado', 'expense', 'shopping-cart', '#f97316', 2),
    (NEW.id, 'Restaurantes', 'expense', 'utensils-crossed', '#dc2626', 3),
    (NEW.id, 'Delivery', 'expense', 'package', '#ea580c', 4),
    
    -- Transporte
    (NEW.id, 'Transporte', 'expense', 'car', '#3b82f6', 5),
    (NEW.id, 'Combustível', 'expense', 'fuel', '#2563eb', 6),
    (NEW.id, 'Uber/Táxi', 'expense', 'car-taxi-front', '#1d4ed8', 7),
    (NEW.id, 'Transporte Público', 'expense', 'bus', '#60a5fa', 8),
    
    -- Moradia
    (NEW.id, 'Moradia', 'expense', 'home', '#8b5cf6', 9),
    (NEW.id, 'Aluguel', 'expense', 'key', '#7c3aed', 10),
    (NEW.id, 'Condomínio', 'expense', 'building', '#6d28d9', 11),
    (NEW.id, 'Energia', 'expense', 'lightbulb', '#a78bfa', 12),
    (NEW.id, 'Água', 'expense', 'droplets', '#818cf8', 13),
    (NEW.id, 'Internet', 'expense', 'wifi', '#c4b5fd', 14),
    
    -- Saúde
    (NEW.id, 'Saúde', 'expense', 'heart', '#ec4899', 15),
    (NEW.id, 'Farmácia', 'expense', 'pill', '#db2777', 16),
    (NEW.id, 'Consultas', 'expense', 'stethoscope', '#be185d', 17),
    (NEW.id, 'Academia', 'expense', 'dumbbell', '#f472b6', 18),
    
    -- Lazer
    (NEW.id, 'Lazer', 'expense', 'gamepad-2', '#14b8a6', 19),
    (NEW.id, 'Streaming', 'expense', 'tv', '#0d9488', 20),
    (NEW.id, 'Cinema', 'expense', 'film', '#0f766e', 21),
    (NEW.id, 'Viagens', 'expense', 'plane', '#5eead4', 22),
    
    -- Educação
    (NEW.id, 'Educação', 'expense', 'graduation-cap', '#f59e0b', 23),
    (NEW.id, 'Cursos', 'expense', 'book', '#d97706', 24),
    (NEW.id, 'Material Escolar', 'expense', 'pen-tool', '#b45309', 25),
    
    -- Compras
    (NEW.id, 'Compras', 'expense', 'shopping-bag', '#06b6d4', 26),
    (NEW.id, 'Roupas', 'expense', 'shirt', '#0891b2', 27),
    (NEW.id, 'Eletrônicos', 'expense', 'smartphone', '#0e7490', 28),
    
    -- Pessoal
    (NEW.id, 'Pessoal', 'expense', 'user', '#a855f7', 29),
    (NEW.id, 'Beleza', 'expense', 'scissors', '#9333ea', 30),
    (NEW.id, 'Pet', 'expense', 'dog', '#7e22ce', 31),
    
    -- Financeiro
    (NEW.id, 'Financeiro', 'expense', 'wallet', '#64748b', 32),
    (NEW.id, 'Taxas Bancárias', 'expense', 'landmark', '#475569', 33),
    (NEW.id, 'Impostos', 'expense', 'receipt', '#334155', 34),
    
    -- Outros
    (NEW.id, 'Outros', 'expense', 'tag', '#78716c', 35);
    
  -- Income categories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order) VALUES
    (NEW.id, 'Salário', 'income', 'briefcase', '#22c55e', 1),
    (NEW.id, 'Freelance', 'income', 'laptop', '#16a34a', 2),
    (NEW.id, 'Investimentos', 'income', 'trending-up', '#15803d', 3),
    (NEW.id, 'Dividendos', 'income', 'coins', '#14532d', 4),
    (NEW.id, 'Vendas', 'income', 'shopping-bag', '#4ade80', 5),
    (NEW.id, 'Presentes', 'income', 'gift', '#86efac', 6),
    (NEW.id, 'Reembolsos', 'income', 'repeat', '#a7f3d0', 7),
    (NEW.id, 'Outros', 'income', 'star', '#bbf7d0', 8);
    
  RETURN NEW;
END;
$$;

-- Trigger to create default categories when a new user signs up
CREATE TRIGGER on_auth_user_created_default_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();