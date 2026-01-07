import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight, Minus, GitCompare, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  status: string;
  savings_goal_id?: string | null;
  category?: {
    name: string;
    color: string;
  } | null;
}

interface MonthComparisonChartProps {
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
  includePending: boolean;
}

const MONTHS = [
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function MonthComparisonChart({
  transactions,
  currentMonth,
  currentYear,
  includePending,
}: MonthComparisonChartProps) {
  const [isComparing, setIsComparing] = useState(false);
  const [compareMonth, setCompareMonth] = useState(
    currentMonth === 0 ? "11" : (currentMonth - 1).toString()
  );
  const [compareYear, setCompareYear] = useState(
    currentMonth === 0 ? (currentYear - 1).toString() : currentYear.toString()
  );

  const currentDate = new Date();
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(currentDate.getFullYear().toString());
    years.add((currentDate.getFullYear() + 1).toString());
    transactions.forEach((t) => {
      const year = new Date(t.date).getFullYear().toString();
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [transactions]);

  // Calculate totals for a given month/year
  const calculateTotals = (month: number, year: number) => {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(monthStart);
    
    let income = 0;
    let expenses = 0;
    const categoryMap: Record<string, { name: string; color: string; value: number }> = {};

    transactions
      .filter((t) => {
        const date = parseISO(t.date);
        const inMonth = date >= monthStart && date <= monthEnd;
        const statusMatch = includePending || t.status === 'confirmed';
        const notSavingsTransaction = !t.savings_goal_id;
        return inMonth && statusMatch && notSavingsTransaction && t.type !== 'transfer';
      })
      .forEach((t) => {
        if (t.type === 'income') {
          income += Number(t.amount);
        } else if (t.type === 'expense') {
          expenses += Number(t.amount);
          const catName = t.category?.name || 'Sem categoria';
          const catColor = t.category?.color || '#6b7280';
          if (!categoryMap[catName]) {
            categoryMap[catName] = { name: catName, color: catColor, value: 0 };
          }
          categoryMap[catName].value += Number(t.amount);
        }
      });

    return {
      income,
      expenses,
      balance: income - expenses,
      categories: Object.values(categoryMap).sort((a, b) => b.value - a.value),
    };
  };

  const currentTotals = useMemo(
    () => calculateTotals(currentMonth, currentYear),
    [transactions, currentMonth, currentYear, includePending]
  );

  const compareTotals = useMemo(
    () => calculateTotals(parseInt(compareMonth), parseInt(compareYear)),
    [transactions, compareMonth, compareYear, includePending]
  );

  const chartData = [
    {
      name: "Receitas",
      current: currentTotals.income,
      compare: compareTotals.income,
    },
    {
      name: "Despesas",
      current: currentTotals.expenses,
      compare: compareTotals.expenses,
    },
    {
      name: "Saldo",
      current: currentTotals.balance,
      compare: compareTotals.balance,
    },
  ];

  // Merge categories from both months
  const categoryComparison = useMemo(() => {
    const allCategories = new Map<string, { name: string; color: string; current: number; compare: number }>();
    
    currentTotals.categories.forEach((cat) => {
      allCategories.set(cat.name, { name: cat.name, color: cat.color, current: cat.value, compare: 0 });
    });
    
    compareTotals.categories.forEach((cat) => {
      if (allCategories.has(cat.name)) {
        allCategories.get(cat.name)!.compare = cat.value;
      } else {
        allCategories.set(cat.name, { name: cat.name, color: cat.color, current: 0, compare: cat.value });
      }
    });
    
    return Array.from(allCategories.values()).sort((a, b) => (b.current + b.compare) - (a.current + a.compare));
  }, [currentTotals.categories, compareTotals.categories]);

  const getDiffIndicator = (current: number, compare: number) => {
    if (current === compare) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > compare) return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    return <ArrowDownRight className="h-4 w-4 text-success" />;
  };

  const getDiffPercent = (current: number, compare: number) => {
    if (compare === 0) return current > 0 ? "+100%" : "0%";
    const diff = ((current - compare) / compare) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const currentMonthLabel = MONTHS[currentMonth].label;
  const compareMonthLabel = MONTHS[parseInt(compareMonth)].label;

  if (!isComparing) {
    return (
      <Card className="glass">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Comparar com outro mês
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsComparing(true)}>
              Comparar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparativo de Meses
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsComparing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Selection */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Comparar</span>
          <span className="font-medium">{currentMonthLabel}/{currentYear}</span>
          <span className="text-sm text-muted-foreground">com</span>
          <Select value={compareMonth} onValueChange={setCompareMonth}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={compareYear} onValueChange={setCompareYear}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bar Chart Comparison */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="current" name={`${currentMonthLabel}/${currentYear}`} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey="compare" name={`${compareMonthLabel}/${compareYear}`} fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Category Comparison Table */}
        {categoryComparison.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Despesas por Categoria</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">{currentMonthLabel}</TableHead>
                  <TableHead className="text-right">{compareMonthLabel}</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryComparison.slice(0, 8).map((cat, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }} 
                        />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(cat.current)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(cat.compare)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getDiffIndicator(cat.current, cat.compare)}
                        <span className="text-xs">{getDiffPercent(cat.current, cat.compare)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
