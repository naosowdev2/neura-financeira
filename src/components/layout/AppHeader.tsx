import { useState } from "react";
import { LogOut, FileText, Target, Tags, Settings, LayoutDashboard, Wallet, Clock } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RippleButton } from "@/components/ui/ripple-button";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import neuraIcon from "@/assets/neura-icon.png";
import { useQueryClient } from "@tanstack/react-query";
import { useOtherMonthsPending } from "@/hooks/useOtherMonthsPending";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PendingExpensesDetails } from "@/components/dashboard/PendingExpensesDetails";

const navItems = [{
  path: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard
}, {
  path: "/accounts",
  label: "Contas",
  icon: Wallet
}, {
  path: "/reports",
  label: "Relatórios",
  icon: FileText
}, {
  path: "/planning",
  label: "Planejamento",
  icon: Target
}, {
  path: "/categories",
  label: "Categorias",
  icon: Tags
}];

export function AppHeader() {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: otherMonthsPending } = useOtherMonthsPending();
  const [showOtherMonthsDetails, setShowOtherMonthsDetails] = useState(false);

  const handleSignOut = async () => {
    // Clear all cached queries first
    queryClient.clear();
    
    // Sign out
    await signOut();
    
    // Force redirect to auth page
    navigate('/auth', { replace: true });
  };

  return (
    <header className="border-b border-white/[0.08] backdrop-blur-xl sticky top-0 z-50 bg-black/60 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.8)]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={neuraIcon} alt="Neura Financeira Logo" className="h-10 w-10 object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.6)] transition-all duration-300 hover:animate-neura-pulse" />
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
            Neura Financeira
          </span>
        </Link>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <MobileNav />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <RippleButton variant="ghost" size="sm" className={cn("relative px-3 py-2 transition-all duration-300", isActive ? "text-primary bg-primary/10 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.08]")}>
                  <Icon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden md:inline">{item.label}</span>
                  
                  {/* Active indicator bar */}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full shadow-[0_0_10px_hsl(var(--primary))]" />}
                </RippleButton>
              </Link>
            );
          })}
        </nav>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-2">
          {/* Other months pending badge - clickable */}
          {otherMonthsPending && otherMonthsPending.count > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowOtherMonthsDetails(true)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">
                      {otherMonthsPending.count}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover border-border">
                  <p className="text-sm">
                    {otherMonthsPending.count} despesa{otherMonthsPending.count > 1 ? 's' : ''} pendente{otherMonthsPending.count > 1 ? 's' : ''} em outros meses
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: R$ {otherMonthsPending.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-primary mt-1">Clique para ver detalhes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Link to="/settings">
            <RippleButton variant="ghost" size="icon" className={cn("hover:bg-white/[0.08]", location.pathname === "/settings" && "text-primary bg-primary/10")}>
              <Settings className="h-5 w-5" />
            </RippleButton>
          </Link>
          <RippleButton variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-white/[0.08]">
            <LogOut className="h-5 w-5" />
          </RippleButton>
        </div>
      </div>

      {/* Other months pending details modal */}
      {otherMonthsPending && (
        <PendingExpensesDetails
          open={showOtherMonthsDetails}
          onOpenChange={setShowOtherMonthsDetails}
          pendingExpenses={otherMonthsPending.transactions || []}
          totalPending={otherMonthsPending.total}
          monthLabel="outros meses"
        />
      )}
    </header>
  );
}
