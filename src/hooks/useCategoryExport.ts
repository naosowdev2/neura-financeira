import { useCategories, CategoryTree } from './useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ExportedCategory {
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  children: ExportedCategory[];
}

export interface CategoryExportData {
  version: string;
  exportedAt: string;
  categories: ExportedCategory[];
}

export interface ImportedCategory {
  name: string;
  type?: string;
  icon?: string | null;
  color?: string | null;
  children?: ImportedCategory[];
}

function treeToExportFormat(tree: CategoryTree[]): ExportedCategory[] {
  return tree.map(cat => ({
    name: cat.name,
    type: cat.type,
    icon: cat.icon,
    color: cat.color,
    children: treeToExportFormat(cat.children),
  }));
}

function countCategories(categories: ImportedCategory[]): number {
  let count = 0;
  for (const cat of categories) {
    count++;
    if (cat.children && cat.children.length > 0) {
      count += countCategories(cat.children);
    }
  }
  return count;
}

function validateImportData(data: unknown): data is CategoryExportData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as any;
  
  if (!obj.version || typeof obj.version !== 'string') return false;
  if (!Array.isArray(obj.categories)) return false;
  
  function validateCategory(cat: unknown, depth: number = 0): boolean {
    if (depth > 10) return false; // Max depth limit
    if (!cat || typeof cat !== 'object') return false;
    
    const c = cat as any;
    if (!c.name || typeof c.name !== 'string') return false;
    if (c.type && !['expense', 'income'].includes(c.type)) return false;
    
    if (c.children && Array.isArray(c.children)) {
      for (const child of c.children) {
        if (!validateCategory(child, depth + 1)) return false;
      }
    }
    
    return true;
  }
  
  for (const cat of obj.categories) {
    if (!validateCategory(cat)) return false;
  }
  
  return true;
}

export function useCategoryExport() {
  const { user } = useAuth();
  const { categoryTree, createCategory } = useCategories();

  const exportCategories = (): CategoryExportData => {
    const exportData: CategoryExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories: treeToExportFormat(categoryTree),
    };
    return exportData;
  };

  const downloadAsJson = () => {
    const data = exportCategories();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categorias-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Categorias exportadas com sucesso!');
  };

  const parseImportFile = async (file: File): Promise<CategoryExportData | null> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!validateImportData(data)) {
        toast.error('Arquivo inválido. Verifique o formato.');
        return null;
      }
      
      return data;
    } catch (error) {
      toast.error('Erro ao ler o arquivo. Verifique se é um JSON válido.');
      return null;
    }
  };

  const importCategories = async (
    data: CategoryExportData,
    mode: 'add' | 'replace'
  ): Promise<{ success: boolean; count: number }> => {
    if (!user) {
      toast.error('Você precisa estar logado para importar.');
      return { success: false, count: 0 };
    }

    let importedCount = 0;

    const createRecursively = async (
      categories: ImportedCategory[],
      parentId: string | null = null,
      parentType?: string
    ) => {
      for (const cat of categories) {
        try {
          const categoryType = cat.type || parentType || 'expense';
          
          const result = await createCategory.mutateAsync({
            name: cat.name,
            type: categoryType,
            icon: cat.icon || 'tag',
            color: cat.color || '#8b5cf6',
            parent_id: parentId,
          });

          importedCount++;

          if (cat.children && cat.children.length > 0) {
            await createRecursively(cat.children, result.id, categoryType);
          }
        } catch (error) {
          console.error('Error importing category:', cat.name, error);
        }
      }
    };

    try {
      await createRecursively(data.categories);
      return { success: true, count: importedCount };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, count: importedCount };
    }
  };

  return {
    exportCategories,
    downloadAsJson,
    parseImportFile,
    importCategories,
    countCategories,
    categoryTree,
  };
}
