import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CategoryTree as CategoryTreeType, useCategories } from "@/hooks/useCategories";
import { ChevronRight, ChevronDown, Edit2, Trash2, Plus, GripVertical } from "lucide-react";
import { CategoryIcon } from "@/components/forms/IconPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoryFormDialog } from "@/components/forms/CategoryFormDialog";
import { CategoryEditDialog } from "@/components/categories/CategoryEditDialog";
import { cn } from "@/lib/utils";

interface Props {
  categories: CategoryTreeType[];
  type: 'expense' | 'income';
}

interface DragState {
  draggedId: string | null;
  draggedCategory: CategoryTreeType | null;
  dragOverId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
}

interface CategoryNodeProps {
  category: CategoryTreeType;
  onEdit: (category: CategoryTreeType) => void;
  onDelete: (category: CategoryTreeType) => void;
  onAddChild: (category: CategoryTreeType) => void;
  dragState: DragState;
  onDragStart: (e: React.DragEvent, category: CategoryTreeType) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, category: CategoryTreeType) => void;
  onDrop: (e: React.DragEvent, category: CategoryTreeType) => void;
  onDragLeave: () => void;
  allCategories: CategoryTreeType[];
  siblings: CategoryTreeType[];
  recentlyDropped: string | null;
}

interface CategoryNodeWrapperProps extends CategoryNodeProps {
  isLast: boolean;
  parentHasMoreSiblings?: boolean[];
}

function CategoryNode({ 
  category, 
  onEdit, 
  onDelete, 
  onAddChild,
  dragState,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
  allCategories,
  siblings,
  recentlyDropped,
  isLast,
  parentHasMoreSiblings = [],
}: CategoryNodeWrapperProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const nodeRef = useRef<HTMLDivElement>(null);

  const isDragging = dragState.draggedId === category.id;
  const isDragOver = dragState.dragOverId === category.id;
  const dropPosition = isDragOver ? dragState.dropPosition : null;
  const wasJustDropped = recentlyDropped === category.id;

  // Check if this category is a descendant of the dragged category
  const isDescendantOfDragged = () => {
    if (!dragState.draggedId) return false;
    let current: CategoryTreeType | undefined = category;
    while (current?.parent_id) {
      if (current.parent_id === dragState.draggedId) return true;
      current = allCategories.find(c => c.id === current?.parent_id);
    }
    return false;
  };

  const canDrop = dragState.draggedId !== category.id && !isDescendantOfDragged();

  return (
    <div className="select-none relative">
      {/* Vertical connecting lines for each ancestor level */}
      {category.level > 0 && parentHasMoreSiblings.map((hasMore, idx) => (
        hasMore && (
          <div
            key={idx}
            className="absolute top-0 bottom-0 w-px bg-muted-foreground/20"
            style={{ left: `${idx * 20 + 18}px` }}
          />
        )
      ))}

      {/* Horizontal connector line (L-shape) */}
      {category.level > 0 && (
        <>
          {/* Vertical part - from top to center */}
          <div
            className="absolute w-px bg-muted-foreground/20"
            style={{ 
              left: `${(category.level - 1) * 20 + 18}px`,
              top: 0,
              height: isLast ? '20px' : '100%',
            }}
          />
          {/* Horizontal part - from vertical line to icon */}
          <div
            className="absolute h-px bg-muted-foreground/20"
            style={{ 
              left: `${(category.level - 1) * 20 + 18}px`,
              top: '20px',
              width: '14px',
            }}
          />
        </>
      )}

      {/* Drop indicator line - before */}
      <div 
        className={cn(
          "h-0.5 mx-2 rounded-full transition-all duration-200",
          isDragOver && dropPosition === 'before' && canDrop 
            ? "bg-primary scale-x-100 opacity-100" 
            : "scale-x-0 opacity-0"
        )}
        style={{ marginLeft: `${category.level * 20 + 40}px` }}
      />

      <div
        ref={nodeRef}
        draggable
        onDragStart={(e) => onDragStart(e, category)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => canDrop && onDragOver(e, category)}
        onDragLeave={onDragLeave}
        onDrop={(e) => canDrop && onDrop(e, category)}
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-lg group transition-all duration-200 relative",
          isDragging && "opacity-40 scale-95 ring-2 ring-primary/30",
          !isDragging && "hover:bg-muted/50",
          isDragOver && dropPosition === 'inside' && canDrop && "bg-primary/15 ring-2 ring-primary/40 scale-[1.02]",
          wasJustDropped && "animate-drop-highlight",
        )}
        style={{ 
          paddingLeft: `${category.level * 20 + 8}px`,
          transform: isDragging ? 'rotate(-1deg)' : undefined,
        }}
      >
        {/* Drag handle */}
        <div 
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 -ml-1 transition-all duration-200",
            isDragging ? "opacity-100 text-primary" : "opacity-30 hover:opacity-100"
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-muted rounded transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Icon with hierarchical style based on level */}
        {(() => {
          const color = category.inheritedColor || category.color || '#6366f1';
          
          if (category.level === 0) {
            // Root category: solid background, white icon, shadow
            return (
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md transition-all duration-200",
                  isDragging && "animate-drag-pulse"
                )}
                style={{ backgroundColor: color }}
              >
                <CategoryIcon name={category.icon || 'tag'} className="h-4.5 w-4.5 text-white" />
              </div>
            );
          } else if (category.level === 1) {
            // First level subcategory: outline style with subtle background
            return (
              <div
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200",
                  isDragging && "animate-drag-pulse"
                )}
                style={{ 
                  borderColor: color, 
                  backgroundColor: `${color}10`,
                }}
              >
                <CategoryIcon name={category.icon || 'tag'} className="h-4 w-4" color={color} />
              </div>
            );
          } else {
            // Deeper levels: minimal style, just colored icon
            return (
              <div
                className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 border border-muted-foreground/20 bg-muted/30 transition-all duration-200",
                  isDragging && "animate-drag-pulse"
                )}
              >
                <CategoryIcon name={category.icon || 'tag'} className="h-3.5 w-3.5 opacity-70" color={color} />
              </div>
            );
          }
        })()}

        <span 
          className={cn(
            "flex-1 transition-all duration-200",
            category.level === 0 && "text-base font-semibold text-foreground",
            category.level === 1 && "text-sm font-medium text-foreground/90",
            category.level >= 2 && "text-xs font-normal text-muted-foreground"
          )}
        >
          {category.name}
        </span>

        {/* Path indicator for nested categories */}
        {category.level > 0 && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {category.path.slice(0, -1).join(' › ')}
          </span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(category);
            }}
            title="Adicionar subcategoria"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            title="Editar categoria"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
            title="Excluir categoria"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Drop indicator line - after */}
      <div 
        className={cn(
          "h-0.5 mx-2 rounded-full transition-all duration-200",
          isDragOver && dropPosition === 'after' && canDrop 
            ? "bg-primary scale-x-100 opacity-100" 
            : "scale-x-0 opacity-0"
        )}
        style={{ marginLeft: `${category.level * 20 + 40}px` }}
      />

      {/* Children with smooth expand/collapse */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          hasChildren && expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {hasChildren && category.children.map((child, idx) => (
          <CategoryNode
            key={child.id}
            category={child}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            dragState={dragState}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragLeave={onDragLeave}
            allCategories={allCategories}
            siblings={category.children}
            recentlyDropped={recentlyDropped}
            isLast={idx === category.children.length - 1}
            parentHasMoreSiblings={[...parentHasMoreSiblings, !isLast]}
          />
        ))}
      </div>
    </div>
  );
}

export function CategoryTreeView({ categories, type }: Props) {
  const { deleteCategory, reorderCategories, flatCategories } = useCategories();
  const [deleteTarget, setDeleteTarget] = useState<CategoryTreeType | null>(null);
  const [editTarget, setEditTarget] = useState<CategoryTreeType | null>(null);
  const [parentForNew, setParentForNew] = useState<CategoryTreeType | null>(null);
  const [recentlyDropped, setRecentlyDropped] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    draggedCategory: null,
    dragOverId: null,
    dropPosition: null,
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleDragStart = (e: React.DragEvent, category: CategoryTreeType) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id);
    
    // Create a custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'fixed -top-96 bg-card border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2';
    dragImage.innerHTML = `
      <span class="w-5 h-5 rounded flex items-center justify-center text-white text-xs" style="background-color: ${category.color || '#6366f1'}">●</span>
      <span class="font-medium">${category.name}</span>
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    setDragState(prev => ({ ...prev, draggedId: category.id, draggedCategory: category }));
  };

  const handleDragEnd = () => {
    setDragState({ draggedId: null, draggedCategory: null, dragOverId: null, dropPosition: null });
  };

  const handleDragOver = (e: React.DragEvent, category: CategoryTreeType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let dropPosition: 'before' | 'after' | 'inside';
    if (y < height * 0.25) {
      dropPosition = 'before';
    } else if (y > height * 0.75) {
      dropPosition = 'after';
    } else {
      dropPosition = 'inside';
    }

    setDragState(prev => ({
      ...prev,
      dragOverId: category.id,
      dropPosition,
    }));
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, dragOverId: null, dropPosition: null }));
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: CategoryTreeType) => {
    e.preventDefault();
    
    const draggedCategory = dragState.draggedCategory;
    const dropPosition = dragState.dropPosition;
    
    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      handleDragEnd();
      return;
    }

    // Get siblings in the target position
    const targetParentId = dropPosition === 'inside' ? targetCategory.id : targetCategory.parent_id;
    const targetSiblings = flatCategories.filter(c => 
      c.parent_id === targetParentId && c.type === draggedCategory.type
    ).sort((a, b) => a.sort_order - b.sort_order);

    // Calculate new sort orders
    const updates: { id: string; sort_order: number; parent_id?: string | null }[] = [];

    if (dropPosition === 'inside') {
      // Moving inside: becomes child of target
      const maxOrder = targetSiblings.length > 0 
        ? Math.max(...targetSiblings.map(s => s.sort_order)) 
        : 0;
      updates.push({ id: draggedCategory.id, sort_order: maxOrder + 1, parent_id: targetCategory.id });
    } else {
      // Moving before/after: same parent as target
      const targetIndex = targetSiblings.findIndex(s => s.id === targetCategory.id);
      const insertIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1;
      
      // Filter out the dragged category and recalculate orders
      const filteredSiblings = targetSiblings.filter(s => s.id !== draggedCategory.id);
      filteredSiblings.splice(insertIndex, 0, draggedCategory);
      
      filteredSiblings.forEach((cat, idx) => {
        if (cat.sort_order !== idx + 1 || cat.id === draggedCategory.id) {
          updates.push({ 
            id: cat.id, 
            sort_order: idx + 1,
            ...(cat.id === draggedCategory.id && { parent_id: targetParentId })
          });
        }
      });
    }

    // Apply updates
    try {
      await reorderCategories.mutateAsync(updates);
      setRecentlyDropped(draggedCategory.id);
      setTimeout(() => setRecentlyDropped(null), 500);
    } catch (error) {
      console.error('Error reordering:', error);
    }

    handleDragEnd();
  };

  const handleDropToRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragState.draggedCategory) return;

    const draggedCategory = dragState.draggedCategory;
    const rootCategories = flatCategories.filter(c => 
      !c.parent_id && c.type === draggedCategory.type
    ).sort((a, b) => a.sort_order - b.sort_order);

    const maxOrder = rootCategories.length > 0 
      ? Math.max(...rootCategories.map(s => s.sort_order)) 
      : 0;

    try {
      await reorderCategories.mutateAsync([
        { id: draggedCategory.id, sort_order: maxOrder + 1, parent_id: null }
      ]);
      setRecentlyDropped(draggedCategory.id);
      setTimeout(() => setRecentlyDropped(null), 500);
    } catch (error) {
      console.error('Error moving to root:', error);
    }

    handleDragEnd();
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  if (filteredCategories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma categoria {type === 'expense' ? 'de despesa' : 'de receita'} cadastrada.
      </div>
    );
  }

  return (
    <>
      {/* Drop zone for moving to root level */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={handleDropToRoot}
        className={cn(
          "mb-2 p-3 border-2 border-dashed rounded-lg text-center text-sm transition-all duration-200",
          dragState.draggedId 
            ? "border-primary/50 bg-primary/5 text-primary opacity-100" 
            : "border-transparent opacity-0 h-0 p-0 mb-0 overflow-hidden"
        )}
      >
        Soltar aqui para mover para o nível raiz
      </div>

      <div className="space-y-0.5 relative">
        {filteredCategories.map((category, idx) => (
          <CategoryNode
            key={category.id}
            category={category}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            onAddChild={setParentForNew}
            dragState={dragState}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            allCategories={flatCategories}
            siblings={filteredCategories}
            recentlyDropped={recentlyDropped}
            isLast={idx === filteredCategories.length - 1}
            parentHasMoreSiblings={[]}
          />
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{deleteTarget?.name}" será arquivada.
              {deleteTarget?.children && deleteTarget.children.length > 0 && (
                <span className="block mt-2 text-warning">
                  Atenção: Esta categoria possui subcategorias que também serão afetadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {editTarget && (
        <CategoryEditDialog
          category={editTarget}
          open={!!editTarget}
          onOpenChange={() => setEditTarget(null)}
        />
      )}

      {/* Add Subcategory Dialog */}
      {parentForNew && (
        <CategoryFormDialog
          trigger={<span />}
          defaultType={parentForNew.type as 'expense' | 'income'}
          parentCategory={{ id: parentForNew.id, name: parentForNew.name, type: parentForNew.type }}
          open={!!parentForNew}
          onOpenChange={() => setParentForNew(null)}
        />
      )}
    </>
  );
}
