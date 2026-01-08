import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useInstallments } from "@/hooks/useInstallments";
import { useCreditCards } from "@/hooks/useCreditCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Download, FileSpreadsheet, 
  TrendingUp, TrendingDown, BarChart3, Clock, FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { AISpendingAnalysis } from "@/components/reports/AISpendingAnalysis";
import { MonthComparisonChart } from "@/components/reports/MonthComparisonChart";
import { AnnualProjectionChart } from "@/components/reports/AnnualProjectionChart";
import { TransactionsList } from "@/components/reports/TransactionsList";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageHeader } from "@/components/layout/PageHeader";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Paleta de cores distintas para gráficos
const CHART_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'
];

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

export default function Reports() {
  const { transactions, isLoading } = useTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { recurrences } = useRecurrences();
  const { installmentGroups } = useInstallments();
  const { creditCards } = useCreditCards();
  const [searchParams] = useSearchParams();

  const currentDate = new Date();
  
  // Read query params for filtering
  const filterParam = searchParams.get('filter') as 'income' | 'expense' | null;
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const [selectedMonth, setSelectedMonth] = useState(
    monthParam ?? currentDate.getMonth().toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    yearParam ?? currentDate.getFullYear().toString()
  );
  const [includePending, setIncludePending] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>(
    filterParam ?? 'all'
  );

  // Get available years - include current year, future year, and years with transactions
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = currentDate.getFullYear();
    
    // Always include current year and next year
    years.add(currentYear.toString());
    years.add((currentYear + 1).toString());
    
    // Add years from transactions
    transactions.forEach((t: any) => {
      const year = new Date(t.date).getFullYear().toString();
      years.add(year);
    });
    
    return Array.from(years).sort().reverse();
  }, [transactions]);

  // Filter transactions for selected month
  const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
  const monthEnd = endOfMonth(monthStart);

  // All transactions for the month (for summary cards - unfiltered by type)
  const allMonthTransactions = useMemo(() => {
    return transactions.filter((t: any) => {
      const date = parseISO(t.date);
      const inMonth = date >= monthStart && date <= monthEnd;
      const statusMatch = includePending || t.status === 'confirmed';
      // Excluir transações de cofrinho - são movimentos internos
      const notSavingsTransaction = !t.savings_goal_id;
      return inMonth && statusMatch && notSavingsTransaction;
    });
  }, [transactions, monthStart, monthEnd, includePending]);

  // Filtered transactions (for charts and tables - filtered by type)
  const monthTransactions = useMemo(() => {
    if (typeFilter === 'all') return allMonthTransactions;
    return allMonthTransactions.filter((t: any) => t.type === typeFilter);
  }, [allMonthTransactions, typeFilter]);

  // Calculate totals from ALL month transactions (not filtered by type)
  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let pendingExpenses = 0;
    let pendingIncome = 0;

    allMonthTransactions.forEach((t: any) => {
      // Transferências internas (type: 'transfer') não contam como receita/despesa
      if (t.type === 'transfer') return;
      
      if (t.type === 'income') {
        income += Number(t.amount);
        if (t.status === 'pending') pendingIncome += Number(t.amount);
      }
      if (t.type === 'expense') {
        expenses += Number(t.amount);
        if (t.status === 'pending') pendingExpenses += Number(t.amount);
      }
    });

    return { income, expenses, balance: income - expenses, pendingExpenses, pendingIncome };
  }, [allMonthTransactions]);

  // Saldo total real das contas
  const totalAccountBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + Number(acc.calculated_balance || 0), 0);
  }, [accounts]);

  // Expenses by category com cores distintas
  const expensesByCategory = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    
    monthTransactions
      .filter((t: any) => t.type === 'expense')
      .forEach((t: any) => {
        const catName = t.category?.name || 'Sem categoria';
        const catColor = t.category?.color || '#6b7280';
        if (!map[catName]) {
          map[catName] = { name: catName, value: 0, color: catColor };
        }
        map[catName].value += Number(t.amount);
      });

    // Aplicar cores distintas da paleta para evitar repetição
    const sorted = Object.values(map).sort((a, b) => b.value - a.value);
    const usedColors = new Set<string>();
    let colorIndex = 0;
    
    return sorted.map(cat => {
      let color = cat.color;
      if (usedColors.has(color) || color === '#6b7280') {
        color = CHART_COLORS[colorIndex % CHART_COLORS.length];
        colorIndex++;
      }
      usedColors.add(color);
      return { ...cat, color };
    });
  }, [monthTransactions]);

  // Income by category
  const incomeByCategory = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    
    monthTransactions
      .filter((t: any) => t.type === 'income')
      .forEach((t: any) => {
        const catName = t.category?.name || 'Sem categoria';
        const catColor = t.category?.color || '#22c55e';
        if (!map[catName]) {
          map[catName] = { name: catName, value: 0, color: catColor };
        }
        map[catName].value += Number(t.amount);
      });

    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  // Daily summary for bar chart
  const dailySummary = useMemo(() => {
    const map: Record<string, { date: string; income: number; expense: number }> = {};
    
    monthTransactions.forEach((t: any) => {
      const dateStr = t.date;
      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        map[dateStr].income += Number(t.amount);
      } else if (t.type === 'expense') {
        map[dateStr].expense += Number(t.amount);
      }
    });

    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        label: format(parseISO(d.date), 'dd/MM'),
      }));
  }, [monthTransactions]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Tipo', 'Status', 'Categoria', 'Valor'];
    const rows = monthTransactions.map((t: any) => [
      format(parseISO(t.date), 'dd/MM/yyyy'),
      t.description,
      t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
      t.status === 'confirmed' ? 'Efetivada' : 'Pendente',
      t.category?.name || '-',
      t.amount.toString().replace('.', ','),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${MONTHS[parseInt(selectedMonth)].label}-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = () => {
    const monthLabel = MONTHS[parseInt(selectedMonth)].label;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório ${monthLabel} ${selectedYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .summary { display: flex; gap: 20px; margin: 20px 0; }
          .card { padding: 15px; border-radius: 8px; flex: 1; }
          .income { background: #dcfce7; color: #166534; }
          .expense { background: #fee2e2; color: #991b1b; }
          .balance { background: #e0f2fe; color: #0369a1; }
          .amount { font-size: 24px; font-weight: bold; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Relatório Financeiro - ${monthLabel} ${selectedYear}</h1>
        
        <div class="summary">
          <div class="card income">
            <div>Receitas</div>
            <div class="amount">${formatCurrency(totals.income)}</div>
          </div>
          <div class="card expense">
            <div>Despesas</div>
            <div class="amount">${formatCurrency(totals.expenses)}</div>
          </div>
          <div class="card balance">
            <div>Saldo</div>
            <div class="amount">${formatCurrency(totals.balance)}</div>
          </div>
        </div>

        <h2>Despesas por Categoria</h2>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Valor</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${expensesByCategory.map(c => `
              <tr>
                <td>${c.name}</td>
                <td>${formatCurrency(c.value)}</td>
                <td>${((c.value / totals.expenses) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <PageHeader
        title="Relatórios"
        description="Análise detalhada das transações"
        icon={FileText}
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'income' | 'expense')}>
              <SelectTrigger className="w-[110px] sm:w-[130px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[120px] sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] sm:w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={exportToCSV} className="flex-1 sm:flex-none">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        {/* Include Pending Toggle */}
        <Card className="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="include-pending" className="text-sm">
                  Incluir transações pendentes
                </Label>
              </div>
              <Switch
                id="include-pending"
                checked={includePending}
                onCheckedChange={setIncludePending}
              />
            </div>
            {includePending && (totals.pendingExpenses > 0 || totals.pendingIncome > 0) && (
              <p className="text-xs text-muted-foreground mt-2">
                Pendentes: {totals.pendingExpenses > 0 && <span className="text-destructive">-{formatCurrency(totals.pendingExpenses)} despesas</span>}
                {totals.pendingExpenses > 0 && totals.pendingIncome > 0 && " | "}
                {totals.pendingIncome > 0 && <span className="text-success">+{formatCurrency(totals.pendingIncome)} receitas</span>}
              </p>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card className="glass border-success/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-success/10">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Receitas</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(totals.income)}</p>
                      <div className="text-xs mt-1 space-y-0.5">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Efetivadas:</span>
                          <span className="text-success">{formatCurrency(totals.income - totals.pendingIncome)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Pendentes:</span>
                          <span className="text-success/70">{formatCurrency(totals.pendingIncome)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-destructive/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-destructive/10">
                      <TrendingDown className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Despesas</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.expenses)}</p>
                      <div className="text-xs mt-1 space-y-0.5">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Efetivadas:</span>
                          <span className="text-destructive">{formatCurrency(totals.expenses - totals.pendingExpenses)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Pendentes:</span>
                          <span className="text-destructive/70">{formatCurrency(totals.pendingExpenses)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-primary/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Resultado do mês</p>
                      <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(totals.balance)}
                      </p>
                      <div className="text-xs mt-1 space-y-0.5">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Receitas:</span>
                          <span className="text-success">+{formatCurrency(totals.income)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Despesas:</span>
                          <span className="text-destructive">-{formatCurrency(totals.expenses)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Analysis */}
            <AISpendingAnalysis
              totalIncome={totals.income}
              totalExpenses={totals.expenses}
              balance={totals.balance}
              expensesByCategory={expensesByCategory}
              incomeByCategory={incomeByCategory}
              transactions={monthTransactions}
              month={MONTHS[parseInt(selectedMonth)].label}
              year={selectedYear}
            />

            {/* Month Comparison */}
            <MonthComparisonChart
              transactions={transactions}
              currentMonth={parseInt(selectedMonth)}
              currentYear={parseInt(selectedYear)}
              includePending={includePending}
            />

            {/* Annual Projection */}
            <AnnualProjectionChart 
              recurrences={recurrences || []}
              installmentGroups={installmentGroups || []}
              accounts={accounts || []}
              creditCards={creditCards || []}
              transactions={transactions || []}
            />

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Expenses Pie Chart */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {expensesByCategory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma despesa neste mês
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Daily Bar Chart */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Movimentação Diária</CardTitle>
                </CardHeader>
                <CardContent>
                  {dailySummary.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma transação neste mês
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dailySummary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="income" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Tables */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Expenses Table */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Detalhamento de Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  {expensesByCategory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Sem dados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expensesByCategory.map((cat, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: cat.color }} 
                                />
                                {cat.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(cat.value)}
                            </TableCell>
                            <TableCell className="text-right">
                              {((cat.value / totals.expenses) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Income Table */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Detalhamento de Receitas</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeByCategory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Sem dados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeByCategory.map((cat, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: cat.color }} 
                                />
                                {cat.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(cat.value)}
                            </TableCell>
                            <TableCell className="text-right">
                              {((cat.value / totals.income) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Transactions List with Pagination */}
            <TransactionsList transactions={monthTransactions} />
          </>
        )}
      </main>
    </div>
  );
}