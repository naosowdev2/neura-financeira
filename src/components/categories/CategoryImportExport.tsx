import { useState, useRef } from 'react';
import { Download, Upload, FileJson, ChevronRight, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCategoryExport, ImportedCategory, CategoryExportData } from '@/hooks/useCategoryExport';
import { toast } from 'sonner';

interface Props {
  trigger?: React.ReactNode;
}

function CategoryPreviewTree({ categories, level = 0 }: { categories: ImportedCategory[]; level?: number }) {
  return (
    <div className="space-y-1">
      {categories.map((cat, idx) => (
        <div key={`${cat.name}-${idx}`}>
          <div 
            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50"
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            {cat.children && cat.children.length > 0 ? (
              <FolderTree className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color || '#8b5cf6' }}
            />
            <span className="text-sm truncate">{cat.name}</span>
            {cat.children && cat.children.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                ({cat.children.length})
              </span>
            )}
          </div>
          {cat.children && cat.children.length > 0 && (
            <CategoryPreviewTree categories={cat.children} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

export function CategoryImportExport({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [importData, setImportData] = useState<CategoryExportData | null>(null);
  const [importMode, setImportMode] = useState<'add' | 'replace'>('add');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { downloadAsJson, parseImportFile, importCategories, countCategories } = useCategoryExport();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await parseImportFile(file);
    if (data) {
      setImportData(data);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    setIsImporting(true);
    const result = await importCategories(importData, importMode);
    setIsImporting(false);

    if (result.success) {
      toast.success(`${result.count} categorias importadas com sucesso!`);
      setImportData(null);
      setOpen(false);
    } else {
      toast.error(`Importação parcial: ${result.count} categorias importadas.`);
    }
  };

  const handleExport = () => {
    downloadAsJson();
  };

  const totalToImport = importData ? countCategories(importData.categories) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileJson className="h-4 w-4 mr-1" /> Importar/Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar/Exportar Categorias</DialogTitle>
          <DialogDescription>
            Faça backup das suas categorias ou importe de outro lugar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Export Section */}
          <div className="flex flex-col items-center p-4 border border-border rounded-lg bg-muted/30">
            <Download className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-medium text-sm mb-1">Exportar</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Baixar backup em JSON
            </p>
            <Button size="sm" onClick={handleExport} className="w-full">
              Exportar JSON
            </Button>
          </div>

          {/* Import Section */}
          <div className="flex flex-col items-center p-4 border border-border rounded-lg bg-muted/30">
            <Upload className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-medium text-sm mb-1">Importar</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Carregar arquivo JSON
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              Selecionar...
            </Button>
          </div>
        </div>

        {/* Import Preview */}
        {importData && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Preview</h4>
              <span className="text-xs text-muted-foreground">
                {totalToImport} categorias encontradas
              </span>
            </div>

            <ScrollArea className="h-48 rounded-lg border border-border p-2">
              <CategoryPreviewTree categories={importData.categories} />
            </ScrollArea>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Modo de importação</h4>
              <RadioGroup
                value={importMode}
                onValueChange={(v) => setImportMode(v as 'add' | 'replace')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="text-sm cursor-pointer">
                    Adicionar às categorias existentes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" disabled />
                  <Label htmlFor="replace" className="text-sm text-muted-foreground cursor-not-allowed">
                    Substituir todas (em breve)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImportData(null)}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? 'Importando...' : `Importar ${totalToImport} categorias`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
