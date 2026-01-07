import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SavingsGoal } from "@/hooks/useSavingsGoals";
import { SavingsGoalHistory } from "./SavingsGoalHistory";
import { SavingsGoalAIFeedback } from "./SavingsGoalAIFeedback";
import { useSavingsGoalAI } from "@/hooks/useSavingsGoalAI";
import { useAccounts } from "@/hooks/useAccounts";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  TrendingUp, 
  Minus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Target, 
  Wallet,
  Sparkles,
  PiggyBank
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const iconName = name.split('-').map((part) => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.PiggyBank;
  return <IconComponent className={className} style={style} />;
}

interface SavingsGoalDetailSheetProps {
  goal: SavingsGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeposit: (goal: SavingsGoal) => void;
  onWithdraw: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
}

export function SavingsGoalDetailSheet({
  goal,
  open,
  onOpenChange,
  onDeposit,
  onWithdraw,
  onEdit,
  onDelete,
}: SavingsGoalDetailSheetProps) {
  const { accounts } = useAccounts();
  const { getAIFeedback, feedback, isLoading: aiLoading, error: aiError, clearFeedback } = useSavingsGoalAI();

  if (!goal) return null;

  const hasTarget = goal.target_amount && goal.target_amount > 0;
  const percentage = hasTarget ? Math.min((goal.current_amount / goal.target_amount!) * 100, 100) : 0;
  const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
  const linkedAccount = goal.parent_account_id ? accounts.find(a => a.id === goal.parent_account_id) : null;

  const handleRequestAIAnalysis = () => {
    getAIFeedback(goal, 'status');
  };

  const handleDelete = () => {
    onDelete(goal.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: goal.color + '20' }}
            >
              <DynamicIcon name={goal.icon} className="h-6 w-6" style={{ color: goal.color }} />
            </div>
            <div>
              <SheetTitle className="text-left">{goal.name}</SheetTitle>
              {goal.is_completed && (
                <span className="text-sm text-success font-medium">✓ Meta atingida!</span>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/30">
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: goal.color }}>
                {formatCurrency(goal.current_amount)}
              </p>
              {hasTarget && (
                <p className="text-sm text-muted-foreground">
                  de {formatCurrency(goal.target_amount!)}
                </p>
              )}
            </div>
            
            {hasTarget && (
              <>
                <Progress
                  value={percentage}
                  className="h-4"
                  style={{ '--progress-color': goal.color } as React.CSSProperties}
                />
                <p className="text-center text-sm font-medium">
                  {percentage.toFixed(1)}% completo
                </p>
              </>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Detalhes
            </h3>
            
            <div className="space-y-2">
              {hasTarget && (
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Meta</span>
                  </div>
                  <span className="font-medium">{formatCurrency(goal.target_amount!)}</span>
                </div>
              )}
              
              {goal.deadline && (
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Prazo</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{format(new Date(goal.deadline), "PPP", { locale: ptBR })}</p>
                    {daysLeft !== null && (
                      <p className={`text-xs ${daysLeft <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {linkedAccount && (
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <span>Conta vinculada</span>
                  </div>
                  <span className="font-medium">{linkedAccount.name}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PiggyBank className="h-4 w-4" />
                  <span>Criado em</span>
                </div>
                <span className="font-medium">
                  {format(new Date(goal.created_at), "PPP", { locale: ptBR })}
                </span>
              </div>
            </div>
            
            {goal.description && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">{goal.description}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onDeposit(goal)}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Depositar
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onWithdraw(goal)}
              disabled={goal.current_amount <= 0}
            >
              <Minus className="h-4 w-4 mr-2" />
              Resgatar
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(goal)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir cofrinho?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O valor guardado não será transferido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* History Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Histórico de Movimentações
            </h3>
            <SavingsGoalHistory goalId={goal.id} goalColor={goal.color} />
          </div>

          {/* AI Analysis Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Análise IA
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestAIAnalysis}
                disabled={aiLoading}
              >
                <Sparkles className="h-4 w-4 mr-1" style={{ color: goal.color }} />
                {feedback ? 'Atualizar' : 'Analisar'}
              </Button>
            </div>
            
            {(feedback || aiLoading || aiError) && (
              <SavingsGoalAIFeedback
                feedback={feedback}
                isLoading={aiLoading}
                error={aiError}
                onRefresh={handleRequestAIAnalysis}
                onClose={clearFeedback}
                goalColor={goal.color}
              />
            )}
            
            {!feedback && !aiLoading && !aiError && (
              <div className="text-center py-6 rounded-lg bg-muted/30">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique em "Analisar" para obter insights sobre seu cofrinho
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
