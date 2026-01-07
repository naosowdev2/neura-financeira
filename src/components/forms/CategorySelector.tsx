import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useCategories, CategoryTree } from "@/hooks/useCategories";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronRight, Plus, FolderTree } from "lucide-react";
import { CategoryIcon } from "@/components/forms/IconPicker";
import { IconPicker } from "@/components/forms/IconPicker";
import { ColorPicker } from "@/components/forms/ColorPicker";

interface Props {
  value: string;
  onChange: (value: string) => void;
  type: 'expense' | 'income';
  placeholder?: string;
}

function CategoryNode({ 
  category, 
  selectedId, 
  onSelect,
  expandedIds,
  toggleExpand 
}: { 
  category: CategoryTree; 
  selectedId: string;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;

  return (
    <div>
      <CommandItem
        value={category.path.join(' > ')}
        onSelect={() => onSelect(category.id)}
        className="flex items-center gap-2 cursor-pointer"
      >
        <div 
          className="flex items-center gap-2"
          style={{ paddingLeft: `${category.level * 16}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(category.id);
              }}
              className="p-0.5 hover:bg-secondary rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <div 
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" 
            style={{ backgroundColor: category.inheritedColor || category.color || '#8b5cf6' }} 
          >
            <CategoryIcon name={category.icon || 'tag'} className="h-3 w-3 text-white" />
          </div>
          <span className="truncate">{category.name}</span>
        </div>
        <Check
          className={cn(
            "ml-auto h-4 w-4",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
      </CommandItem>
      
      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Standalone category creation dialog that renders in a portal
function StandaloneCategoryDialog({
  open,
  onOpenChange,
  type,
  onCategoryCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'expense' | 'income';
  onCategoryCreated: (categoryId: string) => void;
}) {
  const { createCategory } = useCategories();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState('#6366f1');

  const resetForm = () => {
    setName('');
    setIcon('tag');
    setColor('#6366f1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const result = await createCategory.mutateAsync({
      name,
      type,
      icon,
      color,
      parent_id: null,
    });
    
    // Invalidate queries to refresh the category list
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
    
    // Close the dialog first
    onOpenChange(false);
    resetForm();
    
    // Then select the new category
    if (result?.id) {
      onCategoryCreated(result.id);
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  // Render in a portal to isolate from parent dialog
  return createPortal(
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent 
        className="sm:max-w-lg bg-card z-[200] max-h-[80vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <CategoryIcon name={icon} className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium">{name || 'Nome da categoria'}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-cat-name">Nome da categoria</Label>
            <Input
              id="new-cat-name"
              placeholder="Ex: Alimentação, Transporte..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <IconPicker value={icon} onChange={setIcon} color={color} />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <Button type="submit" className="w-full" disabled={createCategory.isPending}>
            {createCategory.isPending ? 'Salvando...' : 'Criar Categoria'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>,
    document.body
  );
}

export function CategorySelector({ value, onChange, type, placeholder = "Selecione uma categoria" }: Props) {
  const { categoryTree, flatCategories } = useCategories();
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filter categories by type
  const filteredTree = useMemo(() => {
    return categoryTree.filter(c => c.type === type);
  }, [categoryTree, type]);

  // Get selected category details
  const selectedCategory = useMemo(() => {
    return flatCategories.find(c => c.id === value);
  }, [flatCategories, value]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  // Expand all parents of selected category
  const expandToCategory = (categoryId: string) => {
    const category = flatCategories.find(c => c.id === categoryId);
    if (category && category.parent_id) {
      const newExpanded = new Set(expandedIds);
      let current = flatCategories.find(c => c.id === category.parent_id);
      while (current) {
        newExpanded.add(current.id);
        current = current.parent_id ? flatCategories.find(c => c.id === current!.parent_id) : undefined;
      }
      setExpandedIds(newExpanded);
    }
  };

  // Expand to selected on open
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && value) {
      expandToCategory(value);
    }
  };

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCategoryCreated = (categoryId: string) => {
    // Select the newly created category
    onChange(categoryId);
    // Close the popover
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
          {selectedCategory ? (
              <div className="flex items-center gap-2 truncate">
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" 
                  style={{ backgroundColor: selectedCategory.inheritedColor || selectedCategory.color || '#8b5cf6' }} 
                >
                  <CategoryIcon name={selectedCategory.icon || 'tag'} className="h-3 w-3 text-white" />
                </div>
                <span className="truncate">
                  {selectedCategory.path.join(' > ')}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 bg-popover z-[10000]" align="start">
          <Command>
            <CommandInput placeholder="Buscar categoria..." />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center">
                  <FolderTree className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">Nenhuma categoria encontrada</p>
                  <Button size="sm" variant="outline" onClick={handleOpenCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" /> Criar categoria
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredTree.length === 0 ? (
                  <div className="py-4 text-center">
                    <FolderTree className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhuma categoria de {type === 'expense' ? 'despesa' : 'receita'}
                    </p>
                    <Button size="sm" variant="outline" onClick={handleOpenCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" /> Criar categoria
                    </Button>
                  </div>
                ) : (
                  <>
                    {filteredTree.map((category) => (
                      <CategoryNode
                        key={category.id}
                        category={category}
                        selectedId={value}
                        onSelect={handleSelect}
                        expandedIds={expandedIds}
                        toggleExpand={toggleExpand}
                      />
                    ))}
                    <div className="p-2 border-t">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={handleOpenCreateDialog}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Nova categoria
                      </Button>
                    </div>
                  </>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Standalone dialog rendered in portal - won't affect parent dialogs */}
      <StandaloneCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        type={type}
        onCategoryCreated={handleCategoryCreated}
      />
    </>
  );
}
