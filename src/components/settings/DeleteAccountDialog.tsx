import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserX, AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { clearAllOfflineData } from "@/lib/offlineStorage";

interface DeletionProgress {
  step: string;
  current: number;
  total: number;
  status: 'pending' | 'in_progress' | 'done' | 'error';
}

const DELETION_STEPS = [
  { key: 'transactions', label: 'Transações' },
  { key: 'recurrences', label: 'Recorrências' },
  { key: 'credit_card_invoices', label: 'Faturas de cartão' },
  { key: 'credit_cards', label: 'Cartões de crédito' },
  { key: 'budgets', label: 'Orçamentos' },
  { key: 'savings_goals', label: 'Metas de economia' },
  { key: 'accounts', label: 'Contas bancárias' },
  { key: 'categories', label: 'Categorias' },
  { key: 'profiles', label: 'Perfil' },
  { key: 'auth', label: 'Conta de autenticação' },
];

export function DeleteAccountDialog() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<DeletionProgress>({
    step: '',
    current: 0,
    total: DELETION_STEPS.length,
    status: 'pending',
  });
  const [completedSteps, setCompletedSteps] = useState<Record<string, 'done' | 'error'>>({});

  const isConfirmed = confirmText === "EXCLUIR MINHA CONTA";

  const deleteUserData = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    setCompletedSteps({});

    try {
      // Delete data in order (respecting foreign keys)
      const tables = [
        'transactions',
        'recurrences', 
        'credit_card_invoices',
        'credit_cards',
        'budgets',
        'savings_goals',
        'accounts',
        'categories',
      ];

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const stepLabel = DELETION_STEPS.find(s => s.key === table)?.label || table;
        
        setProgress({
          step: stepLabel,
          current: i + 1,
          total: DELETION_STEPS.length,
          status: 'in_progress',
        });

        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error(`Error deleting ${table}:`, error);
          setCompletedSteps(prev => ({ ...prev, [table]: 'error' }));
          // Continue with other tables even if one fails
        } else {
          setCompletedSteps(prev => ({ ...prev, [table]: 'done' }));
        }

        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Delete profile
      setProgress({
        step: 'Perfil',
        current: DELETION_STEPS.length - 1,
        total: DELETION_STEPS.length,
        status: 'in_progress',
      });

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        setCompletedSteps(prev => ({ ...prev, profiles: 'error' }));
      } else {
        setCompletedSteps(prev => ({ ...prev, profiles: 'done' }));
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Delete auth user via edge function
      setProgress({
        step: 'Conta de autenticação',
        current: DELETION_STEPS.length,
        total: DELETION_STEPS.length,
        status: 'in_progress',
      });

      const { error: authError } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id },
      });

      if (authError) {
        console.error('Error deleting auth user:', authError);
        setCompletedSteps(prev => ({ ...prev, auth: 'error' }));
        throw new Error('Não foi possível excluir a conta de autenticação');
      }

      setCompletedSteps(prev => ({ ...prev, auth: 'done' }));

      // Clear local data
      await clearAllOfflineData();
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setProgress({
        step: 'Concluído',
        current: DELETION_STEPS.length,
        total: DELETION_STEPS.length,
        status: 'done',
      });

      toast.success("Conta excluída com sucesso", {
        description: "Todos os seus dados foram removidos permanentemente.",
      });

      // Sign out and redirect
      await signOut();
      navigate('/auth');

    } catch (error: any) {
      console.error('Error during account deletion:', error);
      setProgress(prev => ({ ...prev, status: 'error' }));
      toast.error("Erro ao excluir conta", {
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setOpen(newOpen);
      if (!newOpen) {
        setConfirmText("");
        setProgress({ step: '', current: 0, total: DELETION_STEPS.length, status: 'pending' });
        setCompletedSteps({});
      }
    }
  };

  const progressPercent = (progress.current / progress.total) * 100;

  const getStepIcon = (stepKey: string) => {
    if (completedSteps[stepKey] === 'done') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (completedSteps[stepKey] === 'error') {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (progress.step === DELETION_STEPS.find(s => s.key === stepKey)?.label) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <UserX className="h-4 w-4 mr-2" />
          Excluir conta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir conta permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esta ação é <strong className="text-destructive">irreversível</strong>. 
              Todos os seus dados serão permanentemente excluídos:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Transações e histórico financeiro</li>
              <li>Contas bancárias e cartões de crédito</li>
              <li>Categorias e orçamentos</li>
              <li>Metas de economia</li>
              <li>Recorrências e parcelamentos</li>
              <li>Perfil e dados de autenticação</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isDeleting ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.step}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {DELETION_STEPS.map((step) => (
                <div key={step.key} className="flex items-center gap-2">
                  {getStepIcon(step.key)}
                  <span className={completedSteps[step.key] === 'done' ? 'text-muted-foreground line-through' : ''}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive font-medium">
                Para confirmar, digite: <code className="bg-destructive/20 px-1 rounded">EXCLUIR MINHA CONTA</code>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">Confirmação</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite aqui..."
                className="font-mono"
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={deleteUserData}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Excluir minha conta
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}