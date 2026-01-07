import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { cn } from "@/lib/utils";

interface CategoryExpense {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: CategoryExpense[];
  mainCategoryData?: CategoryExpense[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Active shape for highlighted sector
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--foreground))" className="text-sm font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

export function ExpenseChart({ data, mainCategoryData }: Props) {
  const [view, setView] = useState<'subcategory' | 'main'>('subcategory');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const chartData = view === 'main' && mainCategoryData ? mainCategoryData : data;
  
  // Filter out hidden categories
  const visibleData = chartData.filter(item => !hiddenCategories.has(item.name));
  const totalValue = visibleData.reduce((sum, item) => sum + item.value, 0);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const toggleCategory = (categoryName: string) => {
    setHiddenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        // Don't hide if it's the last visible category
        if (visibleData.length > 1) {
          newSet.add(categoryName);
        }
      }
      return newSet;
    });
    setActiveIndex(null);
  };

  const highlightCategory = (index: number | null) => {
    setActiveIndex(index);
  };

  if (data.length === 0) {
    return (
      <Card className="animate-fade-in" style={{ animationDelay: '500ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Adicione transações para ver o gráfico.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '500ms' }}>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base sm:text-lg">Despesas por Categoria</CardTitle>
        {mainCategoryData && mainCategoryData.length > 0 && (
          <Tabs value={view} onValueChange={(v) => {
            setView(v as 'subcategory' | 'main');
            setHiddenCategories(new Set());
            setActiveIndex(null);
          }}>
            <TabsList className="h-8">
              <TabsTrigger value="subcategory" className="text-xs px-2 h-6">
                Detalhado
              </TabsTrigger>
              <TabsTrigger value="main" className="text-xs px-2 h-6">
                Agrupado
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Chart */}
          <div className="h-[280px] flex-1 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex ?? undefined}
                  activeShape={renderActiveShape}
                  data={visibleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {visibleData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px -8px rgba(0, 0, 0, 0.5)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Legend */}
          <div className="lg:w-48 flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-2">Clique para filtrar:</p>
            <div className="flex flex-wrap lg:flex-col gap-1.5 max-h-[240px] overflow-y-auto">
              {chartData.map((entry, index) => {
                const isHidden = hiddenCategories.has(entry.name);
                const visibleIndex = visibleData.findIndex(v => v.name === entry.name);
                const isHighlighted = activeIndex === visibleIndex && !isHidden;
                const percentage = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : '0';
                
                return (
                  <button
                    key={entry.name}
                    onClick={() => toggleCategory(entry.name)}
                    onMouseEnter={() => !isHidden && highlightCategory(visibleIndex)}
                    onMouseLeave={() => highlightCategory(null)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all duration-200",
                      "hover:bg-muted/80",
                      isHidden && "opacity-40",
                      isHighlighted && "bg-muted ring-1 ring-primary/50"
                    )}
                  >
                    <span 
                      className={cn(
                        "w-3 h-3 rounded-full flex-shrink-0 transition-transform",
                        isHighlighted && "scale-125"
                      )}
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className={cn(
                      "text-xs truncate flex-1",
                      isHidden ? "line-through text-muted-foreground" : "text-foreground"
                    )}>
                      {entry.name}
                    </span>
                    {!isHidden && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {percentage}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {hiddenCategories.size > 0 && (
              <button
                onClick={() => setHiddenCategories(new Set())}
                className="text-xs text-primary hover:underline mt-2"
              >
                Mostrar todas
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}