-- Add sort_order column for manual ordering
ALTER TABLE public.categories 
ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX idx_categories_sort_order ON public.categories(user_id, parent_id, sort_order);

-- Initialize sort_order based on current alphabetical order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, parent_id ORDER BY name) as rn
  FROM public.categories
)
UPDATE public.categories c
SET sort_order = o.rn
FROM ordered o
WHERE c.id = o.id;