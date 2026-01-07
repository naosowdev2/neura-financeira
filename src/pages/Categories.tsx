import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileJson, Tags } from "lucide-react";
import { CategoryTreeView } from "@/components/categories/CategoryTree";
import { CategoryFormDialog } from "@/components/forms/CategoryFormDialog";
import { CategoryImportExport } from "@/components/categories/CategoryImportExport";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Categories() {
  const { categoryTree, isLoading } = useCategories();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  return (
    <div className="min-h-screen">
      <AppHeader />
      <PageHeader
        title="Categorias"
        description="Organize suas receitas e despesas"
        icon={Tags}
      />

      <main className="container mx-auto px-4 py-8">
        <Card className="glass">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <TabsList>
                    <TabsTrigger value="expense">Despesas</TabsTrigger>
                    <TabsTrigger value="income">Receitas</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <CategoryImportExport
                      trigger={
                        <Button variant="outline" size="sm">
                          <FileJson className="h-4 w-4 mr-1" /> Importar/Exportar
                        </Button>
                      }
                    />
                    <CategoryFormDialog
                      defaultType={activeTab}
                      trigger={
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" /> Nova Categoria
                        </Button>
                      }
                    />
                  </div>
                </div>

                <TabsContent value="expense">
                  <CategoryTreeView categories={categoryTree} type="expense" />
                </TabsContent>

                <TabsContent value="income">
                  <CategoryTreeView categories={categoryTree} type="income" />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
