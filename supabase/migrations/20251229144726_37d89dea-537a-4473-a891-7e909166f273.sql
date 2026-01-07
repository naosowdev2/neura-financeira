-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_default_categories ON auth.users;
DROP FUNCTION IF EXISTS public.create_default_categories();

-- Enhanced function to create default categories, subcategories, and account
CREATE OR REPLACE FUNCTION public.create_default_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_alimentacao_id UUID;
  v_transporte_id UUID;
  v_moradia_id UUID;
  v_saude_id UUID;
  v_lazer_id UUID;
  v_educacao_id UUID;
  v_compras_id UUID;
  v_pessoal_id UUID;
  v_financeiro_id UUID;
  v_salario_id UUID;
  v_investimentos_id UUID;
BEGIN
  -- Create default account (Carteira)
  INSERT INTO public.accounts (user_id, name, type, icon, color, initial_balance, current_balance, include_in_total)
  VALUES (NEW.id, 'Carteira', 'cash', 'wallet', '#22c55e', 0, 0, true);

  -- =====================
  -- EXPENSE CATEGORIES
  -- =====================
  
  -- Alimentação (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Alimentação', 'expense', 'utensils', '#ef4444', 1)
  RETURNING id INTO v_alimentacao_id;
  
  -- Alimentação subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Supermercado', 'expense', 'shopping-cart', '#f97316', 1, v_alimentacao_id),
    (NEW.id, 'Restaurantes', 'expense', 'utensils-crossed', '#dc2626', 2, v_alimentacao_id),
    (NEW.id, 'Delivery', 'expense', 'package', '#ea580c', 3, v_alimentacao_id),
    (NEW.id, 'Cafeteria', 'expense', 'coffee', '#b91c1c', 4, v_alimentacao_id),
    (NEW.id, 'Padaria', 'expense', 'croissant', '#c2410c', 5, v_alimentacao_id),
    (NEW.id, 'Lanches', 'expense', 'sandwich', '#f87171', 6, v_alimentacao_id);

  -- Transporte (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Transporte', 'expense', 'car', '#3b82f6', 2)
  RETURNING id INTO v_transporte_id;
  
  -- Transporte subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Combustível', 'expense', 'fuel', '#2563eb', 1, v_transporte_id),
    (NEW.id, 'Uber/Táxi', 'expense', 'car-taxi-front', '#1d4ed8', 2, v_transporte_id),
    (NEW.id, 'Transporte Público', 'expense', 'bus', '#60a5fa', 3, v_transporte_id),
    (NEW.id, 'Estacionamento', 'expense', 'circle-parking', '#1e40af', 4, v_transporte_id),
    (NEW.id, 'Manutenção Veículo', 'expense', 'wrench', '#3730a3', 5, v_transporte_id),
    (NEW.id, 'Seguro Veículo', 'expense', 'shield-check', '#4338ca', 6, v_transporte_id);

  -- Moradia (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Moradia', 'expense', 'home', '#8b5cf6', 3)
  RETURNING id INTO v_moradia_id;
  
  -- Moradia subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Aluguel', 'expense', 'key', '#7c3aed', 1, v_moradia_id),
    (NEW.id, 'Condomínio', 'expense', 'building', '#6d28d9', 2, v_moradia_id),
    (NEW.id, 'Energia', 'expense', 'lightbulb', '#a78bfa', 3, v_moradia_id),
    (NEW.id, 'Água', 'expense', 'droplets', '#818cf8', 4, v_moradia_id),
    (NEW.id, 'Internet', 'expense', 'wifi', '#c4b5fd', 5, v_moradia_id),
    (NEW.id, 'Gás', 'expense', 'flame', '#5b21b6', 6, v_moradia_id),
    (NEW.id, 'Manutenção Casa', 'expense', 'hammer', '#4c1d95', 7, v_moradia_id),
    (NEW.id, 'Móveis/Decoração', 'expense', 'sofa', '#ddd6fe', 8, v_moradia_id);

  -- Saúde (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Saúde', 'expense', 'heart', '#ec4899', 4)
  RETURNING id INTO v_saude_id;
  
  -- Saúde subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Farmácia', 'expense', 'pill', '#db2777', 1, v_saude_id),
    (NEW.id, 'Consultas', 'expense', 'stethoscope', '#be185d', 2, v_saude_id),
    (NEW.id, 'Exames', 'expense', 'microscope', '#9d174d', 3, v_saude_id),
    (NEW.id, 'Plano de Saúde', 'expense', 'shield-plus', '#831843', 4, v_saude_id),
    (NEW.id, 'Academia', 'expense', 'dumbbell', '#f472b6', 5, v_saude_id),
    (NEW.id, 'Dentista', 'expense', 'smile', '#fda4af', 6, v_saude_id),
    (NEW.id, 'Terapia', 'expense', 'brain', '#fb7185', 7, v_saude_id);

  -- Lazer (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Lazer', 'expense', 'gamepad-2', '#14b8a6', 5)
  RETURNING id INTO v_lazer_id;
  
  -- Lazer subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Streaming', 'expense', 'tv', '#0d9488', 1, v_lazer_id),
    (NEW.id, 'Cinema', 'expense', 'film', '#0f766e', 2, v_lazer_id),
    (NEW.id, 'Shows/Eventos', 'expense', 'ticket', '#115e59', 3, v_lazer_id),
    (NEW.id, 'Viagens', 'expense', 'plane', '#5eead4', 4, v_lazer_id),
    (NEW.id, 'Jogos', 'expense', 'gamepad-2', '#2dd4bf', 5, v_lazer_id),
    (NEW.id, 'Hobbies', 'expense', 'palette', '#99f6e4', 6, v_lazer_id),
    (NEW.id, 'Bares/Festas', 'expense', 'wine', '#134e4a', 7, v_lazer_id);

  -- Educação (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Educação', 'expense', 'graduation-cap', '#f59e0b', 6)
  RETURNING id INTO v_educacao_id;
  
  -- Educação subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Cursos', 'expense', 'book', '#d97706', 1, v_educacao_id),
    (NEW.id, 'Livros', 'expense', 'book-open', '#b45309', 2, v_educacao_id),
    (NEW.id, 'Material Escolar', 'expense', 'pen-tool', '#92400e', 3, v_educacao_id),
    (NEW.id, 'Mensalidade', 'expense', 'school', '#78350f', 4, v_educacao_id),
    (NEW.id, 'Idiomas', 'expense', 'languages', '#fbbf24', 5, v_educacao_id);

  -- Compras (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Compras', 'expense', 'shopping-bag', '#06b6d4', 7)
  RETURNING id INTO v_compras_id;
  
  -- Compras subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Roupas', 'expense', 'shirt', '#0891b2', 1, v_compras_id),
    (NEW.id, 'Eletrônicos', 'expense', 'smartphone', '#0e7490', 2, v_compras_id),
    (NEW.id, 'Casa/Cozinha', 'expense', 'refrigerator', '#155e75', 3, v_compras_id),
    (NEW.id, 'Presentes', 'expense', 'gift', '#22d3ee', 4, v_compras_id),
    (NEW.id, 'Calçados', 'expense', 'footprints', '#67e8f9', 5, v_compras_id);

  -- Pessoal (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Pessoal', 'expense', 'user', '#a855f7', 8)
  RETURNING id INTO v_pessoal_id;
  
  -- Pessoal subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Beleza/Estética', 'expense', 'scissors', '#9333ea', 1, v_pessoal_id),
    (NEW.id, 'Pet', 'expense', 'dog', '#7e22ce', 2, v_pessoal_id),
    (NEW.id, 'Cuidados Pessoais', 'expense', 'shower-head', '#6b21a8', 3, v_pessoal_id),
    (NEW.id, 'Acessórios', 'expense', 'watch', '#c084fc', 4, v_pessoal_id),
    (NEW.id, 'Filhos', 'expense', 'baby', '#e879f9', 5, v_pessoal_id);

  -- Financeiro (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Financeiro', 'expense', 'landmark', '#64748b', 9)
  RETURNING id INTO v_financeiro_id;
  
  -- Financeiro subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Taxas Bancárias', 'expense', 'credit-card', '#475569', 1, v_financeiro_id),
    (NEW.id, 'Impostos', 'expense', 'receipt', '#334155', 2, v_financeiro_id),
    (NEW.id, 'Seguros', 'expense', 'shield', '#1e293b', 3, v_financeiro_id),
    (NEW.id, 'Juros/Multas', 'expense', 'trending-down', '#94a3b8', 4, v_financeiro_id),
    (NEW.id, 'Empréstimos', 'expense', 'banknote', '#cbd5e1', 5, v_financeiro_id);

  -- Outros (expense - no subcategories)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Outros', 'expense', 'tag', '#78716c', 10);

  -- =====================
  -- INCOME CATEGORIES
  -- =====================
  
  -- Salário (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Salário', 'income', 'briefcase', '#22c55e', 1)
  RETURNING id INTO v_salario_id;
  
  -- Salário subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Salário Líquido', 'income', 'wallet', '#16a34a', 1, v_salario_id),
    (NEW.id, '13º Salário', 'income', 'gift', '#15803d', 2, v_salario_id),
    (NEW.id, 'Férias', 'income', 'sun', '#14532d', 3, v_salario_id),
    (NEW.id, 'Bônus', 'income', 'star', '#4ade80', 4, v_salario_id),
    (NEW.id, 'Hora Extra', 'income', 'clock', '#86efac', 5, v_salario_id);

  -- Investimentos (parent)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order)
  VALUES (NEW.id, 'Investimentos', 'income', 'trending-up', '#0ea5e9', 2)
  RETURNING id INTO v_investimentos_id;
  
  -- Investimentos subcategories
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order, parent_id) VALUES
    (NEW.id, 'Dividendos', 'income', 'coins', '#0284c7', 1, v_investimentos_id),
    (NEW.id, 'Juros', 'income', 'percent', '#0369a1', 2, v_investimentos_id),
    (NEW.id, 'Rendimentos', 'income', 'bar-chart-3', '#075985', 3, v_investimentos_id),
    (NEW.id, 'Venda de Ativos', 'income', 'arrow-up-down', '#38bdf8', 4, v_investimentos_id);

  -- Other income categories (no subcategories)
  INSERT INTO public.categories (user_id, name, type, icon, color, sort_order) VALUES
    (NEW.id, 'Freelance', 'income', 'laptop', '#8b5cf6', 3),
    (NEW.id, 'Vendas', 'income', 'shopping-bag', '#a855f7', 4),
    (NEW.id, 'Presentes', 'income', 'gift', '#c084fc', 5),
    (NEW.id, 'Reembolsos', 'income', 'repeat', '#d8b4fe', 6),
    (NEW.id, 'Aluguéis', 'income', 'home', '#f59e0b', 7),
    (NEW.id, 'Outros', 'income', 'star', '#fbbf24', 8);
    
  RETURN NEW;
END;
$$;

-- Trigger to create default data when a new user signs up
CREATE TRIGGER on_auth_user_created_default_data
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_user_data();