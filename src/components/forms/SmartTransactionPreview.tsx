import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowLeftRight,
  Calendar,
  Tag,
  Landmark,
  CreditCard,
  Repeat,
  Layers,
  Check,
  Pencil,
  AlertCircle,
  Sparkles,
  PiggyBank,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CurrencyField } from '@/components/forms/CurrencyField';
import { CategorySelector } from '@/components/forms/CategorySelector';
import { MiniImpactPreview } from '@/components/forms/MiniImpactPreview';
import { TransactionClassification } from '@/hooks/useSmartTransaction';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SmartTransactionPreviewProps {
  classification: TransactionClassification;
  onUpdate: (updates: Partial<TransactionClassification>) => void;
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function SmartTransactionPreview({
  classification,
  onUpdate,
  onConfirm,
  onBack,
  isLoading = false,
}: SmartTransactionPreviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [isCreatingGoalLoading, setIsCreatingGoalLoading] = useState(false);
  
  const { categories, getCategoriesByType } = useCategories();
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();
  const { savingsGoals, createSavingsGoal } = useSavingsGoals();

  const typeConfig = {
    income: {
      icon: ArrowDownCircle,
      label: 'Receita',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    expense: {
      icon: ArrowUpCircle,
      label: 'Despesa',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
    transfer: {
      icon: ArrowLeftRight,
      label: 'Transferência',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  };

  const config = typeConfig[classification.type];
  const TypeIcon = config.icon;

  const confidenceColor = 
    classification.confidence >= 0.8 ? 'text-emerald-500' :
    classification.confidence >= 0.5 ? 'text-amber-500' : 'text-rose-500';

  const relevantCategories = getCategoriesByType(
    classification.type === 'transfer' ? 'expense' : classification.type
  );

  return (
    <div className="space-y-6">
      {/* AI Understanding Summary */}
      <Card className={cn("border-2", config.bgColor)}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-full", config.bgColor)}>
              <Sparkles className={cn("h-5 w-5", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Entendi que você quer registrar:</p>
              <p className="font-medium mt-1">{classification.parsed_text}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("text-xs", confidenceColor)}>
                  {Math.round(classification.confidence * 100)}% confiança
                </Badge>
                {classification.confidence < 0.7 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Revise os campos abaixo
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type Selector */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(typeConfig) as [string, typeof config][]).map(([type, cfg]) => {
          const Icon = cfg.icon;
          const isSelected = classification.type === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onUpdate({ type: type as 'income' | 'expense' | 'transfer' })}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                isSelected 
                  ? `${cfg.bgColor} border-current ${cfg.color}` 
                  : "border-muted hover:border-muted-foreground/50"
              )}
            >
              <Icon className={cn("h-5 w-5", isSelected ? cfg.color : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", isSelected ? cfg.color : "text-muted-foreground")}>
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Fields */}
      <div className="space-y-4">
        {/* Amount */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <TypeIcon className={cn("h-4 w-4", config.color)} />
            Valor
          </Label>
          <motion.div
            key={classification.amount}
            initial={false}
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ duration: 0.15 }}
          >
            <CurrencyField
              value={classification.amount || 0}
              onChange={(value) => onUpdate({ amount: value })}
            />
          </motion.div>
          
          {/* Real-time Impact Preview */}
          {(() => {
            const selectedAccount = accounts.find(a => a.id === classification.account_id);
            const currentBalance = selectedAccount?.current_balance || 0;
            
            return (
              <MiniImpactPreview
                currentBalance={currentBalance}
                amount={classification.amount || 0}
                type={classification.type}
                isVisible={!!classification.amount && classification.amount > 0}
              />
            );
          })()}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input
            value={classification.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Descrição da transação"
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Data
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                {classification.date 
                  ? format(parseISO(classification.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : 'Selecione uma data'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[10000]" align="start">
              <CalendarComponent
                mode="single"
                selected={classification.date ? parseISO(classification.date) : undefined}
                onSelect={(date) => date && onUpdate({ date: format(date, 'yyyy-MM-dd') })}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Category */}
        {classification.type !== 'transfer' && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Categoria
              {classification.category_name && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Sugestão IA
                </Badge>
              )}
            </Label>
            <CategorySelector
              value={classification.category_id || ''}
              onChange={(id) => {
                const cat = categories.find(c => c.id === id);
                onUpdate({ 
                  category_id: id, 
                  category_name: cat?.name || null 
                });
              }}
              type={classification.type === 'income' ? 'income' : 'expense'}
              placeholder="Selecione uma categoria"
            />
          </div>
        )}

        {/* Account or Credit Card */}
        {classification.type !== 'transfer' && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {classification.credit_card_id ? (
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Landmark className="h-4 w-4 text-muted-foreground" />
              )}
              {classification.type === 'expense' ? 'Pagamento' : 'Conta'}
            </Label>
            <Select
              value={classification.credit_card_id || classification.account_id || ''}
              onValueChange={(value) => {
                const isCard = creditCards.some(cc => cc.id === value);
                if (isCard) {
                  const card = creditCards.find(cc => cc.id === value);
                  onUpdate({
                    credit_card_id: value,
                    credit_card_name: card?.name || null,
                    account_id: null,
                    account_name: null,
                  });
                } else {
                  const account = accounts.find(a => a.id === value);
                  onUpdate({
                    account_id: value,
                    account_name: account?.name || null,
                    credit_card_id: null,
                    credit_card_name: null,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione conta ou cartão" />
              </SelectTrigger>
              <SelectContent className="z-[10000]" position="popper">
                {accounts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Contas
                    </div>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4" />
                          {account.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {creditCards.length > 0 && classification.type === 'expense' && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Cartões
                    </div>
                    {creditCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {card.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Transfer accounts */}
        {classification.type === 'transfer' && (
          <>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                Conta Origem
              </Label>
              <Select
                value={classification.account_id || ''}
                onValueChange={(value) => {
                  const account = accounts.find(a => a.id === value);
                  onUpdate({ account_id: value, account_name: account?.name || null });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta origem" />
                </SelectTrigger>
                <SelectContent className="z-[10000]" position="popper">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {classification.savings_goal_id ? (
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                )}
                Conta Destino
              </Label>
              <Select
                value={classification.savings_goal_id || classification.destination_account_id || ''}
                onValueChange={(value) => {
                  const savingsGoal = savingsGoals.find(sg => sg.id === value);
                  if (savingsGoal) {
                    onUpdate({
                      savings_goal_id: value,
                      savings_goal_name: savingsGoal.name,
                      destination_account_id: null,
                      destination_account_name: null,
                    });
                  } else {
                    const account = accounts.find(a => a.id === value);
                    onUpdate({
                      destination_account_id: value,
                      destination_account_name: account?.name || null,
                      savings_goal_id: null,
                      savings_goal_name: null,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta destino" />
                </SelectTrigger>
                <SelectContent className="z-[10000]" position="popper">
                  {accounts.filter(a => a.id !== classification.account_id).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Contas
                      </div>
                      {accounts
                        .filter(a => a.id !== classification.account_id)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              <Landmark className="h-4 w-4" />
                              {account.name}
                            </div>
                          </SelectItem>
                        ))}
                    </>
                  )}
                  {savingsGoals.filter(sg => !sg.is_completed).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Cofrinhos
                      </div>
                      {savingsGoals
                        .filter(sg => !sg.is_completed)
                        .map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            <div className="flex items-center gap-2">
                              <PiggyBank className="h-4 w-4" />
                              {goal.name}
                            </div>
                          </SelectItem>
                        ))}
                    </>
                  )}
                  <div className="border-t mt-1 pt-1">
                    <button
                      type="button"
                      className="w-full px-2 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-accent rounded-sm text-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCreatingGoal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Novo cofrinho
                    </button>
                  </div>
                </SelectContent>
              </Select>
              
              {isCreatingGoal && (
                <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 border mt-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <PiggyBank className="h-4 w-4" />
                    Criar novo cofrinho
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do cofrinho"
                      value={newGoalName}
                      onChange={(e) => setNewGoalName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      disabled={!newGoalName.trim() || isCreatingGoalLoading}
                      onClick={async () => {
                        setIsCreatingGoalLoading(true);
                        try {
                          const newGoal = await createSavingsGoal.mutateAsync({ 
                            name: newGoalName.trim() 
                          });
                          onUpdate({
                            savings_goal_id: newGoal.id,
                            savings_goal_name: newGoal.name,
                            destination_account_id: null,
                            destination_account_name: null,
                          });
                          setNewGoalName('');
                          setIsCreatingGoal(false);
                        } finally {
                          setIsCreatingGoalLoading(false);
                        }
                      }}
                    >
                      {isCreatingGoalLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNewGoalName('');
                        setIsCreatingGoal(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Recurring indicator */}
        {classification.is_recurring && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Repeat className="h-4 w-4 text-blue-500" />
            <span className="text-sm">
              Transação recorrente: <strong>{
                classification.recurrence_frequency === 'daily' ? 'Diária' :
                classification.recurrence_frequency === 'weekly' ? 'Semanal' :
                classification.recurrence_frequency === 'monthly' ? 'Mensal' :
                classification.recurrence_frequency === 'yearly' ? 'Anual' : ''
              }</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => onUpdate({ is_recurring: false, recurrence_frequency: null })}
            >
              Remover
            </Button>
          </div>
        )}

        {/* Installment indicator */}
        {classification.is_installment && classification.total_installments && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Layers className="h-4 w-4 text-purple-500" />
            <span className="text-sm">
              Parcelado em <strong>{classification.total_installments}x</strong>
              {classification.amount && (
                <> de <strong>R$ {(classification.amount / classification.total_installments).toFixed(2)}</strong></>
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => onUpdate({ is_installment: false, total_installments: null })}
            >
              Remover
            </Button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isLoading || !classification.amount || !classification.description}
          className="flex-1"
        >
          <Check className="h-4 w-4 mr-2" />
          Confirmar
        </Button>
      </div>
    </div>
  );
}
