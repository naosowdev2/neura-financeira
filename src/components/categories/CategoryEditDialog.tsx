import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCategories, CategoryTree } from "@/hooks/useCategories";
import { IconPicker, CategoryIcon } from "@/components/forms/IconPicker";
import { ColorPicker } from "@/components/forms/ColorPicker";
import { ChevronRight, ChevronDown, Folder, Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  category: CategoryTree;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParentSelectorNodeProps {
  category: CategoryTree;
  selectedId: string;
  disabledId: string;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

function ParentSelectorNode({ category, selectedId, disabledId, onSelect, expandedIds, toggleExpand }: ParentSelectorNodeProps) {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;
  const isDisabled = category.id === disabledId;

  // Check if any descendant is the disabled category
  const hasDisabledDescendant = (cat: CategoryTree): boolean => {
    if (cat.id === disabledId) return true;
    return cat.children?.some(child => hasDisabledDescendant(child)) || false;
  };

  const isDescendantDisabled = hasDisabledDescendant(category);

  return (
    <div>
      <div
        onClick={() => !isDisabled && !isDescendantDisabled && onSelect(category.id)}
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors",
          isDisabled || isDescendantDisabled 
            ? "opacity-50 cursor-not-allowed" 
            : "cursor-pointer hover:bg-muted",
          isSelected && !isDisabled && "bg-primary/10 text-primary"
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
        
        {isSelected && !isDisabled && <Check className="h-4 w-4 text-primary" />}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <ParentSelectorNode
              key={child.id}
              category={child}
              selectedId={selectedId}
              disabledId={disabledId}
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

export function CategoryEditDialog({ category, open, onOpenChange }: Props) {
  const { updateCategory, categoryTree, flatCategories, canBeParent } = useCategories();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon || 'tag');
  const [color, setColor] = useState(category.color || '#6366f1');
  const [parentId, setParentId] = useState(category.parent_id || '');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setName(category.name);
    setIcon(category.icon || 'tag');
    setColor(category.color || '#6366f1');
    setParentId(category.parent_id || '');
  }, [category]);

  // Filter potential parent categories by type (exclude self and descendants)
  const potentialParents = useMemo(() => {
    return categoryTree.filter(c => c.type === category.type);
  }, [categoryTree, category.type]);

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
    parts.push(name.trim() || category.name);
    return parts;
  }, [selectedParent, name, category.name]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await updateCategory.mutateAsync({
      id: category.id,
      name: name.trim(),
      icon,
      color,
      parent_id: parentId || null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Editar Categoria</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
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
              <Label htmlFor="edit-name" className="text-sm font-medium">
                Nome da categoria
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da categoria"
                className="h-10"
                required
              />
            </div>

            {/* Parent Category Selector */}
            {potentialParents.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Categoria pai
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
                  <ScrollArea className="h-[200px]">
                    <div className="py-1">
                      {potentialParents.map((cat) => (
                        <ParentSelectorNode
                          key={cat.id}
                          category={cat}
                          selectedId={parentId}
                          disabledId={category.id}
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

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ícone</Label>
              <IconPicker value={icon} onChange={setIcon} color={color} categoryType={category.type as 'expense' | 'income'} />
            </div>

            {/* Color Picker - only for root categories */}
            {!parentId ? (
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
                <p className="text-xs text-muted-foreground mt-1">
                  Para alterar a cor, edite a categoria raiz.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCategory.isPending || !name.trim()}>
              {updateCategory.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
