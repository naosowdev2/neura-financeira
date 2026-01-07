import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  date: string;
  amount: number;
  type: string;
}

interface Props {
  transactions: Transaction[];
  initialBalance: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function BalanceEvolutionChart({ transactions, initialBalance }: Props) {
  // Generate data for the last 30 days
  const today = new Date();
  const days = 30;
  
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build cumulative balance data
  const chartData: { date: string; balance: number; label: string }[] = [];
  let runningBalance = initialBalance;

  // Get all transactions before the 30-day window to calculate starting balance
  const startDate = subDays(today, days);
  const transactionsBefore = sortedTransactions.filter(
    (t) => new Date(t.date) < startDate
  );

  transactionsBefore.forEach((t) => {
    if (t.type === 'income') {
      runningBalance += Number(t.amount);
    } else if (t.type === 'expense') {
      runningBalance -= Number(t.amount);
    }
  });

  // Generate daily balances for the last 30 days
  for (let i = days; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Add transactions for this day
    const dayTransactions = sortedTransactions.filter(
      (t) => t.date === dateStr
    );

    dayTransactions.forEach((t) => {
      if (t.type === 'income') {
        runningBalance += Number(t.amount);
      } else if (t.type === 'expense') {
        runningBalance -= Number(t.amount);
      }
    });

    chartData.push({
      date: dateStr,
      balance: runningBalance,
      label: format(date, "dd/MM", { locale: ptBR }),
    });
  }

  if (chartData.length === 0 || transactions.length === 0) {
    return (
      <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/40 text-center py-8">
            Adicione transações para ver a evolução do saldo.
          </p>
        </CardContent>
      </Card>
    );
  }

  const minBalance = Math.min(...chartData.map((d) => d.balance));
  const maxBalance = Math.max(...chartData.map((d) => d.balance));
  const yDomain = [
    Math.floor(minBalance * 0.9),
    Math.ceil(maxBalance * 1.1),
  ];

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">Evolução do Saldo (últimos 30 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px -8px rgba(0, 0, 0, 0.5)',
                }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.9)' }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#balanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}