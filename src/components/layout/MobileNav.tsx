import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, FileText, Target, Tags, Settings, Wallet, Clock } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { RippleButton } from "@/components/ui/ripple-button";
import neuraIcon from "@/assets/neura-icon.png";
import { useQueryClient } from "@tanstack/react-query";
import { useOtherMonthsPending } from "@/hooks/useOtherMonthsPending";
import { PendingExpensesDetails } from "@/components/dashboard/PendingExpensesDetails";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/accounts", label: "Contas", icon: Wallet },
  { path: "/reports", label: "Relatórios", icon: FileText },
  { path: "/planning?tab=projections", label: "Planejamento", icon: Target },
  { path: "/categories", label: "Categorias", icon: Tags },
  { path: "/settings", label: "Configurações", icon: Settings },
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const drawerVariants = {
  hidden: { x: "-100%" },
  visible: { 
    x: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 }
  },
  exit: { 
    x: "-100%",
    transition: { duration: 0.2, ease: "easeIn" as const }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.2 }
  }),
};

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [showOtherMonthsDetails, setShowOtherMonthsDetails] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: otherMonthsPending } = useOtherMonthsPending();

  const handleClose = () => setIsOpen(false);

  const handleSignOut = async () => {
    handleClose();
    
    // Clear all cached queries first
    queryClient.clear();
    
    // Sign out
    await signOut();
    
    // Force redirect to auth page
    navigate('/auth', { replace: true });
  };

  return (
    <>
      {/* Hamburger Button with animated icon */}
      <RippleButton
        variant="ghost"
        size="icon"
        className="md:hidden hover:bg-white/[0.08] relative"
        onClick={() => setIsOpen(true)}
      >
        <motion.div
          className="flex flex-col justify-center items-center w-5 h-5 gap-[5px]"
          initial={false}
        >
          <motion.span
            className="block w-5 h-[2px] bg-current rounded-full origin-center"
            animate={isOpen ? { rotate: 45, y: 3.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          />
          <motion.span
            className="block w-5 h-[2px] bg-current rounded-full"
            animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          />
          <motion.span
            className="block w-5 h-[2px] bg-current rounded-full origin-center"
            animate={isOpen ? { rotate: -45, y: -3.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          />
        </motion.div>
      </RippleButton>

      {/* Drawer Overlay and Content */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-0 z-[99998] bg-black/80 backdrop-blur-md md:hidden"
              onClick={handleClose}
            />

            {/* Drawer */}
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed left-0 top-0 bottom-0 z-[99999] w-72 bg-[hsl(0,0%,4%)] border-r border-border shadow-2xl md:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Link to="/dashboard" onClick={handleClose} className="flex items-center gap-3">
                  <img 
                    src={neuraIcon} 
                    alt="Neura Icon" 
                    className="h-9 w-9 rounded-xl object-contain"
                  />
                  <span className="font-bold text-lg bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Neura
                  </span>
                </Link>
                <RippleButton
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="hover:bg-white/[0.08]"
                >
                  <X className="h-5 w-5" />
                </RippleButton>
              </div>

              {/* User Info */}
              <div className="p-4 border-b border-border">
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                
                {/* Other months pending indicator - clickable */}
                {otherMonthsPending && otherMonthsPending.count > 0 && (
                  <button 
                    onClick={() => {
                      handleClose();
                      setShowOtherMonthsDetails(true);
                    }}
                    className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-left"
                  >
                    <Clock className="h-4 w-4 text-amber-400" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-amber-400">
                        {otherMonthsPending.count} pendência{otherMonthsPending.count > 1 ? 's' : ''} em outros meses
                      </p>
                      <p className="text-xs text-amber-400/70">
                        R$ {otherMonthsPending.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Navigation */}
              <nav className="p-3 flex flex-col gap-1">
                {navItems.map((item, i) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.path}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link to={item.path} onClick={handleClose}>
                        <RippleButton
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 px-4 py-3 transition-all",
                            isActive
                              ? "bg-primary/10 text-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <motion.span
                              layoutId="mobile-nav-active"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                            />
                          )}
                        </RippleButton>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                <RippleButton
                  variant="ghost"
                  className="w-full justify-start gap-3 px-4 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sair</span>
                </RippleButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    </>
  );
}
