import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { CurrencyField } from "@/components/forms/CurrencyField";

export type ScenarioType = 'income' | 'expense';

export interface ScenarioItem {
  id: string;
  type: ScenarioType;
  description: string;
  amount: number;
}

interface AddScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (scenario: ScenarioItem) => void;
  initialType?: ScenarioType;
}

export function AddScenarioDialog({ 
  open, 
  onOpenChange, 
  onAdd,
  initialType = 'income' 
}: AddScenarioDialogProps) {
  const [type, setType] = useState<ScenarioType>(initialType);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim() || amount <= 0) return;

    const scenario: ScenarioItem = {
      id: crypto.randomUUID(),
      type,
      description: description.trim(),
      amount,
    };

    onAdd(scenario);
    handleClose();
  };

  const handleClose = () => {
    setDescription("");
    setAmount(0);
    setType(initialType);
    onOpenChange(false);
  };

  const isValid = description.trim().length > 0 && amount > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Cenário Hipotético</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as ScenarioType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Receita
              </TabsTrigger>
              <TabsTrigger value="expense" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                Despesa
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder={type === 'income' ? "Ex: Freela extra" : "Ex: Celular novo"}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 50))}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/50
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <CurrencyField
              id="amount"
              value={amount}
              onChange={setAmount}
              placeholder="R$ 0,00"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid}
              className={type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              Adicionar {type === 'income' ? 'Receita' : 'Despesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
