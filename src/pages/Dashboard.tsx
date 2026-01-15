import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateOnly } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { useTransactions } from "@/hooks/useTransactions";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useCreditCardInvoices } from "@/hooks/useCreditCardInvoices";
import { useRecurrenceProcessor } from "@/hooks/useRecurrenceProcessor";
import { useCategories } from "@/hooks/useCategories";
import { TrendingDown, TrendingUp, ArrowLeftRight, LayoutDashboard } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { BalanceCards } from "@/components/dashboard/BalanceCards";
import { MonthOverview } from "@/components/dashboard/MonthOverview";

import { PendingExpensesCard } from "@/components/dashboard/PendingExpensesCard";
import { PendingIncomeCard } from "@/components/dashboard/PendingIncomeCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { ExpenseChart } from "@/components/dashboard/ExpenseChart";
import { BalanceEvolutionChart } from "@/components/dashboard/BalanceEvolutionChart";
import { AIAlertsWidget } from "@/components/dashboard/AIAlertsWidget";
import { FinancialSummaryBar } from "@/components/dashboard/FinancialSummaryBar";
import { FinancialHealthWidget } from "@/components/dashboard/FinancialHealthWidget";
import { SavingsGoalsList } from "@/components/dashboard/SavingsGoalsList";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import { WeeklySummaryBanner } from "@/components/dashboard/WeeklySummaryBanner";
import { ExpenseFormDialog } from "@/components/forms/ExpenseFormDialog";
import { IncomeFormDialog } from "@/components/forms/IncomeFormDialog";
import { TransferFormDialog } from "@/components/forms/TransferFormDialog";


import { AIAssistant } from "@/components/ai/AIAssistant";
import { RippleButton } from "@/components/ui/ripple-button";

// Staggered animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data, isLoading } = useDashboard(selectedDate);
  const { transactions } = useTransactions();
  const { savingsGoals, isLoading: goalsLoading } = useSavingsGoals();
  const { invoices } = useCreditCardInvoices();
  const { processRecurrences } = useRecurrenceProcessor();
  const { flatCategories, rootCategories } = useCategories();

  // Process recurrences on mount to generate pending transactions (only once per session)
  const hasProcessedRecurrences = useRef(false);
  
  useEffect(() => {
    if (user && !hasProcessedRecurrences.current) {
      hasProcessedRecurrences.current = true;
      processRecurrences.mutate(6); // Generate 6 months ahead initially
    }
  }, [user]);

  // Process recurrences when navigating to future months
  const lastProcessedMonthsAhead = useRef<number>(6);
  
  useEffect(() => {
    if (!user) return;
    
    const currentMonth = new Date();
    const monthsDiff = (selectedDate.getFullYear() - currentMonth.getFullYear()) * 12 + 
                       (selectedDate.getMonth() - currentMonth.getMonth());
    
    // Calculate how many months ahead we need to process
    const monthsNeeded = monthsDiff + 3; // +3 for buffer
    
    // Only reprocess if we need more months than we've already processed
    if (monthsNeeded > lastProcessedMonthsAhead.current) {
      lastProcessedMonthsAhead.current = monthsNeeded;
      processRecurrences.mutate(monthsNeeded);
    }
  }, [selectedDate, user]);

  // Calculate expenses by category for chart (subcategories) - using ALL month transactions
  const expensesByCategory = useMemo(() => {
    return data?.chartTransactions
      ?.filter((t: any) => t.category)
      .reduce((acc: any, t: any) => {
        const catName = t.category?.name || 'Sem categoria';
        const catColor = t.category?.color || '#6366f1';
        if (!acc[catName]) {
          acc[catName] = { name: catName, value: 0, color: catColor };
        }
        acc[catName].value += Number(t.amount);
        return acc;
      }, {});
  }, [data?.chartTransactions]);

  // Calculate expenses by main category (root category) - using ALL month transactions
  const expensesByMainCategory = useMemo(() => {
    return data?.chartTransactions
      ?.filter((t: any) => t.category_id)
      .reduce((acc: any, t: any) => {
        // Find the category in flatCategories to get rootCategoryId
        const flatCat = flatCategories.find(c => c.id === t.category_id);
        const rootCatId = flatCat?.rootCategoryId || t.category_id;
        const rootCat = rootCategories.find(c => c.id === rootCatId) || flatCat;
        
        const catName = rootCat?.name || 'Sem categoria';
        const catColor = rootCat?.color || '#6366f1';
        
        if (!acc[catName]) {
          acc[catName] = { name: catName, value: 0, color: catColor };
        }
        acc[catName].value += Number(t.amount);
        return acc;
      }, {});
  }, [data?.chartTransactions, flatCategories, rootCategories]);

  const chartData = expensesByCategory ? Object.values(expensesByCategory) : [];
  const mainCategoryChartData = expensesByMainCategory ? Object.values(expensesByMainCategory) : [];

  const pendingExpenses = data?.pendingExpenses || [];
  const totalPending = pendingExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  
  // Pending income for the month
  const pendingIncomeData = data?.pendingIncome || [];
  const totalPendingIncome = pendingIncomeData.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  
  // Calculate pending income for the projected balance sheet (from recent transactions - legacy)
  const pendingIncome = data?.recentTransactions?.filter(
    (t: any) => t.type === 'income' && t.status === 'pending'
  ) || [];

  // Calculate totals for FinancialSummaryBar
  const totalAccounts = (data?.accounts || []).reduce((sum: number, acc: any) => sum + Number(acc.current_balance || 0), 0);
  
  // Filter invoices by selected month
  const totalInvoices = useMemo(() => {
    const selectedMonth = format(selectedDate, 'yyyy-MM');
    return invoices
      .filter(inv => {
        const invoiceMonth = format(parseDateOnly(inv.reference_month), 'yyyy-MM');
        return inv.status === 'open' && invoiceMonth === selectedMonth;
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [invoices, selectedDate]);
  
  const totalSavings = (savingsGoals || []).reduce((sum, goal) => sum + (goal.current_amount || 0), 0);

  // Show loading state
  if (isLoading) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas finanças"
        icon={LayoutDashboard}
      />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Weekly Summary Banner */}
          <motion.div variants={itemVariants}>
            <WeeklySummaryBanner />
          </motion.div>

          {/* Month Navigator */}
          <motion.div variants={itemVariants}>
            <MonthNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </motion.div>

          {/* Financial Summary Bar */}
          <motion.div variants={itemVariants}>
            <FinancialSummaryBar
              totalAccounts={totalAccounts}
              totalInvoices={totalInvoices}
              totalSavings={totalSavings}
            />
          </motion.div>

          {/* Quick Actions - Only transaction creation */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-2 justify-center">
            <ExpenseFormDialog
              trigger={
                <RippleButton 
                  variant="outline" 
                  className="hover:border-red-500/50 hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]"
                  rippleColor="rgba(239, 68, 68, 0.3)"
                >
                  <TrendingDown className="h-4 w-4 mr-2 text-red-400" /> Nova Despesa
                </RippleButton>
              }
            />
            <IncomeFormDialog 
              trigger={
                <RippleButton 
                  variant="outline" 
                  className="hover:border-green-500/50 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)]"
                  rippleColor="rgba(34, 197, 94, 0.3)"
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-green-400" /> Nova Receita
                </RippleButton>
              }
            />
            <TransferFormDialog 
              trigger={
                <RippleButton 
                  variant="outline" 
                  className="hover:border-blue-500/50 hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)]"
                  rippleColor="rgba(59, 130, 246, 0.3)"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2 text-blue-400" /> Transferência
                </RippleButton>
              }
            />
          </motion.div>

          {/* Balance Cards */}
          <motion.div variants={itemVariants}>
            <BalanceCards
              initialBalance={data?.initialMonthBalance || 0}
              currentBalance={data?.currentBalance || 0}
              projectedBalance={data?.projectedBalance || 0}
              totalSavingsGoals={data?.totalSavingsGoals || 0}
              pendingExpenses={pendingExpenses}
              pendingIncome={pendingIncome}
              selectedDate={selectedDate}
            />
          </motion.div>

          {/* Pending Expenses Card */}
          {pendingExpenses.length > 0 && (
            <motion.div variants={itemVariants}>
              <PendingExpensesCard 
                pendingExpenses={pendingExpenses}
                totalPending={totalPending}
                monthLabel={format(selectedDate, "MMMM", { locale: ptBR })}
              />
            </motion.div>
          )}

          {/* Pending Income Card */}
          {pendingIncomeData.length > 0 && (
            <motion.div variants={itemVariants}>
              <PendingIncomeCard 
                pendingIncome={pendingIncomeData}
                totalPending={totalPendingIncome}
                monthLabel={format(selectedDate, "MMMM", { locale: ptBR })}
              />
            </motion.div>
          )}

          {/* Month Overview */}
          <motion.div variants={itemVariants}>
            <MonthOverview
              monthIncome={data?.monthIncome || 0}
              monthExpenses={data?.monthExpenses || 0}
              selectedMonth={selectedDate.getMonth()}
              selectedYear={selectedDate.getFullYear()}
            />
          </motion.div>


          {/* Main Grid - Reorganized for better accessibility */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Left Column - Charts */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div variants={itemVariants}>
                <BalanceEvolutionChart 
                  transactions={transactions} 
                  initialBalance={data?.accounts?.reduce((sum: number, acc: any) => sum + Number(acc.initial_balance || 0), 0) || 0}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <ExpenseChart data={chartData as any} mainCategoryData={mainCategoryChartData as any} />
              </motion.div>
            </div>

            {/* Right Column - AI Alerts + Health Widget + Savings Goals */}
            <div className="space-y-6">
              <motion.div variants={itemVariants}>
                <FinancialHealthWidget />
              </motion.div>
              {!goalsLoading && savingsGoals.length > 0 && (
                <motion.div variants={itemVariants}>
                  <SavingsGoalsList savingsGoals={savingsGoals} />
                </motion.div>
              )}
              <motion.div variants={itemVariants}>
                <AIAlertsWidget />
              </motion.div>
            </div>
          </div>

          {/* Recent Transactions - Full Width */}
          <motion.div variants={itemVariants}>
            <RecentTransactions transactions={data?.recentTransactions || []} />
          </motion.div>
        </motion.div>
      </main>

      {/* AI Assistant Floating Button */}
      <AIAssistant />
    </div>
  );
}
