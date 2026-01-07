import { useState, useMemo, useEffect } from "react";
import { useCategories, CategoryTree } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ChevronDown, Folder, Check, Palette } from "lucide-react";
import { IconPicker, CategoryIcon } from "@/components/forms/IconPicker";
import { ColorPicker } from "@/components/forms/ColorPicker";
import { cn } from "@/lib/utils";

interface Props {
  trigger?: React.ReactNode;
  defaultType?: 'expense' | 'income';
  parentCategory?: { id: string; name: string; type: string } | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ParentSelectorNodeProps {
  category: CategoryTree;
  selectedId: string;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

function ParentSelectorNode({ category, selectedId, onSelect, expandedIds, toggleExpand }: ParentSelectorNodeProps) {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        onClick={() => onSelect(category.id)}
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
        )}
        style={{ paddingLeft: `${category.level * 16 + 8}px` }}
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
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        <div
          className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: category.inheritedColor || category.color || '#6366f1' }}
        >
          <CategoryIcon name={category.icon || 'tag'} className="h-3 w-3 text-white" />
        </div>
        
        <span className="text-sm truncate flex-1">{category.name}</span>
        
        {isSelected && <Check className="h-4 w-4 text-primary" />}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <ParentSelectorNode
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

export function CategoryFormDialog({ 
  trigger, 
  defaultType = 'expense', 
  parentCategory,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) {
  const { createCategory, categoryTree, flatCategories } = useCategories();
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState('#6366f1');
  const [parentId, setParentId] = useState<string>(parentCategory?.id || '');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // Get the type from parent category or default
  const type = parentCategory?.type as 'expense' | 'income' || defaultType;

  // Filter potential parent categories by type
  const potentialParents = useMemo(() => {
    return categoryTree.filter(c => c.type === type);
  }, [categoryTree, type]);

  // Get selected parent info
  const selectedParent = useMemo(() => {
    if (!parentId) return null;
    return flatCategories.find(c => c.id === parentId);
  }, [flatCategories, parentId]);

  // Compute full path for preview
  const previewPath = useMemo(() => {
    const parts: string[] = [];
    if (selectedParent) {
      parts.push(...selectedParent.path);
    }
    if (name.trim()) {
      parts.push(name.trim());
    } else {
      parts.push('Nova categoria');
    }
    return parts;
  }, [selectedParent, name]);

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

  // Expand parent chain when parent is pre-selected
  useEffect(() => {
    if (parentCategory?.id) {
      const parent = flatCategories.find(c => c.id === parentCategory.id);
      if (parent) {
        const newExpanded = new Set<string>();
        let current = flatCategories.find(c => c.id === parent.parent_id);
        while (current) {
          newExpanded.add(current.id);
          current = current.parent_id ? flatCategories.find(c => c.id === current!.parent_id) : undefined;
        }
        setExpandedIds(newExpanded);
      }
    }
  }, [parentCategory?.id, flatCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await createCategory.mutateAsync({
      name: name.trim(),
      type,
      color,
      icon,
      parent_id: parentId || null,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setIcon('tag');
    setColor('#6366f1');
    setParentId(parentCategory?.id || '');
    setExpandedIds(new Set());
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && parentCategory) {
      setParentId(parentCategory.id);
    }
    if (!isOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nova Categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl bg-card max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            Nova Categoria de {type === 'expense' ? 'Despesa' : 'Receita'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto pr-2">
            {/* Two column layout on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Form Fields */}
              <div className="space-y-5">
                {/* Preview Card */}
                <div className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted p-4">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Preview</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg transition-all"
                      style={{ backgroundColor: color }}
                    >
                      <CategoryIcon name={icon} className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {name.trim() || 'Nome da categoria'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        {previewPath.map((part, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                            <span className="truncate">{part}</span>
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="cat-name" className="text-sm font-medium">
                    Nome da categoria
                  </Label>
                  <Input
                    id="cat-name"
                    placeholder="Ex: Alimentação, Transporte, Salário..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10"
                    required
                    autoFocus
                  />
                </div>

                {/* Parent Category Selector */}
                {!parentCategory && potentialParents.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Categoria pai (opcional)
                    </Label>
                    <div className="rounded-lg border bg-muted/30">
                      <div 
                        onClick={() => setParentId('')}
                        className={cn(
                          "flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors border-b",
                          !parentId ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <div className="h-5 w-5 rounded bg-muted-foreground/20 flex items-center justify-center">
                          <Folder className="h-3 w-3" />
                        </div>
                        <span className="text-sm">Nenhuma (categoria raiz)</span>
                        {!parentId && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                      <ScrollArea className="h-[160px]">
                        <div className="py-1">
                          {potentialParents.map((category) => (
                            <ParentSelectorNode
                              key={category.id}
                              category={category}
                              selectedId={parentId}
                              onSelect={setParentId}
                              expandedIds={expandedIds}
                              toggleExpand={toggleExpand}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {/* Show parent info when creating subcategory */}
                {parentCategory && (
                  <div className="p-3 rounded-lg bg-secondary/50 border">
                    <p className="text-xs text-muted-foreground mb-1">Subcategoria de:</p>
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{parentCategory.name}</span>
                    </div>
                  </div>
                )}

                {/* Color Picker - only for root categories */}
                {!parentId && !parentCategory ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cor</Label>
                    <ColorPicker value={color} onChange={setColor} />
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      <span>Herda cor da categoria pai</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Automático
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Icon Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ícone</Label>
                <IconPicker 
                  value={icon} 
                  onChange={setIcon} 
                  color={color} 
                  categoryType={type}
                  height="h-[450px]"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createCategory.isPending || !name.trim()}>
              {createCategory.isPending ? 'Salvando...' : 
                parentCategory ? 'Criar Subcategoria' : 'Criar Categoria'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
