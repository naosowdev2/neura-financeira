import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  is_archived: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
  children?: Category[];
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
  level: number;
  path: string[];
  inheritedColor: string;
  rootCategoryId: string;
}

function buildCategoryTree(
  categories: Category[], 
  parentId: string | null = null, 
  level: number = 0, 
  path: string[] = [],
  rootColor: string | null = null,
  rootCategoryId: string | null = null
): CategoryTree[] {
  return categories
    .filter(cat => cat.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(cat => {
      const currentPath = [...path, cat.name];
      const isRoot = level === 0;
      const currentRootColor = isRoot ? (cat.color || '#6366f1') : rootColor!;
      const currentRootId = isRoot ? cat.id : rootCategoryId!;
      
      return {
        ...cat,
        level,
        path: currentPath,
        inheritedColor: currentRootColor,
        rootCategoryId: currentRootId,
        children: buildCategoryTree(categories, cat.id, level + 1, currentPath, currentRootColor, currentRootId),
      };
    });
}

function flattenTree(tree: CategoryTree[]): CategoryTree[] {
  const result: CategoryTree[] = [];
  
  function traverse(nodes: CategoryTree[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(tree);
  return result;
}

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!user,
  });

  // Build hierarchical tree
  const categoryTree = buildCategoryTree(categoriesQuery.data ?? []);
  
  // Flatten tree for easy iteration (with level info)
  const flatCategories = flattenTree(categoryTree);

  // Get root categories (no parent)
  const rootCategories = (categoriesQuery.data ?? []).filter(c => !c.parent_id);

  // Get categories by type
  const getCategoriesByType = (type: 'expense' | 'income') => {
    return flatCategories.filter(c => c.type === type);
  };

  // Get category with full path
  const getCategoryPath = (categoryId: string): string => {
    const category = flatCategories.find(c => c.id === categoryId);
    return category ? category.path.join(' > ') : '';
  };

  // Check if a category can be a parent (to avoid circular references)
  const canBeParent = (categoryId: string, potentialParentId: string): boolean => {
    if (categoryId === potentialParentId) return false;
    
    const category = flatCategories.find(c => c.id === potentialParentId);
    if (!category) return true;
    
    // Check if potentialParent is a descendant of category
    let current = category;
    while (current.parent_id) {
      if (current.parent_id === categoryId) return false;
      current = flatCategories.find(c => c.id === current.parent_id) as CategoryTree;
      if (!current) break;
    }
    
    return true;
  };

  const createCategory = useMutation({
    mutationFn: async (category: { name: string; type: string; color?: string; icon?: string; parent_id?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase
        .from('categories') as any)
        .insert({ 
          name: category.name,
          type: category.type,
          color: category.color || null,
          icon: category.icon || null,
          parent_id: category.parent_id || null,
          user_id: user.id 
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase
        .from('categories') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase
        .from('categories') as any)
        .update({ is_archived: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria arquivada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const reorderCategories = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number; parent_id?: string | null }[]) => {
      if (!user) throw new Error('Not authenticated');
      
      // Update all categories in batch
      for (const update of updates) {
        const { error } = await (supabase
          .from('categories') as any)
          .update({ 
            sort_order: update.sort_order,
            ...(update.parent_id !== undefined && { parent_id: update.parent_id })
          })
          .eq('id', update.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao reordenar: ' + error.message);
    },
  });

  return {
    categories: categoriesQuery.data ?? [],
    categoryTree,
    flatCategories,
    rootCategories,
    isLoading: categoriesQuery.isLoading,
    getCategoriesByType,
    getCategoryPath,
    canBeParent,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  };
}
